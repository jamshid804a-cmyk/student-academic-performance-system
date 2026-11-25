"use client"

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  CalendarDays, Plus, Trash2, Pencil, X, Printer, Search,
  Save, RotateCcw, GraduationCap, BookOpen, Clock, MapPin,
  Users, ClipboardList, ChevronDown, Loader2,
} from 'lucide-react'
import GlobalApi from '@/app/_services/GlobalApi'
import { useProgram } from '@/src/context/ProgramContext'

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const STORAGE_KEY = 'datesheet_settings_v1'

const GRADES = [
  'Nursery', 'Prep',
  '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th',
]
const SECTIONS = ['A', 'B', 'C']
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const PAPER_TYPES = ['Mid Term', 'Final Term', 'Monthly Test', 'Annual Exam', 'Pre-Board']

const INPUT =
  'w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
const LABEL = 'block text-xs font-semibold text-slate-600 mb-1'

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const dayFromDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return ''
  return d.toLocaleDateString('en-US', { weekday: 'long' })
}

const fmtDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return iso
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export default function DateSheetPage() {
  const ctx = useProgram() || {}
  const programValue = ctx.program || 'school'

  const [tab, setTab] = useState('classes') // 'classes' | 'exams'

  const [school, setSchool] = useState({
    name: '', address: '', phone: '', logo: '',
  })
  const [students, setStudents] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)

  // Classes timetable data
  const [classRows, setClassRows] = useState([])

  // Exams timetable data
  const [examRows, setExamRows] = useState([])

  // Shared session
  const [session, setSession] = useState('')

  // Modals
  const [classModal, setClassModal] = useState(null) // null | row | 'new'
  const [examModal, setExamModal] = useState(null)

  const warned = useRef(false)
  const hydrated = useRef(false)

  // ── Load saved data ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const data = JSON.parse(raw)
        if (Array.isArray(data.classRows)) setClassRows(data.classRows)
        if (Array.isArray(data.examRows)) setExamRows(data.examRows)
        if (typeof data.session === 'string') setSession(data.session)
      }
    } catch {}
    hydrated.current = true
  }, [])

  // ── Save on every change ──
  useEffect(() => {
    if (!hydrated.current) return
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ classRows, examRows, session })
      )
    } catch {
      if (!warned.current) {
        warned.current = true
        toast.warning('Could not save — storage is full.')
      }
    }
  }, [classRows, examRows, session])

  // ── School info ──
  useEffect(() => {
    let alive = true
    GlobalApi.GetSchoolInfo()
      .then((res) => {
        const d = res?.data
        if (!alive || !d) return
        setSchool({
          name: d.schoolName || d.name || '',
          address: d.address || '',
          phone: d.phone || d.contact || '',
          logo: d.logo || '',
        })
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  // ── Students + teachers ──
  useEffect(() => {
    let alive = true
    setLoading(true)
    Promise.all([
      GlobalApi.GetAllStudents?.({ program: programValue }).catch(() => ({ data: [] })),
      GlobalApi.GetAllTeachers?.({ program: programValue }).catch(() => ({ data: [] })),
    ])
      .then(([sRes, tRes]) => {
        if (!alive) return
        const sList = Array.isArray(sRes?.data) ? sRes.data : []
        setStudents(sList)
        const tList = Array.isArray(tRes?.data) ? tRes.data : []
        setTeachers(tList)
        // Auto-set session from newest student if we have none
        if (!session) {
          const newest = sList
            .map((s) => String(s.session || '').trim())
            .filter(Boolean)
            .sort((a, b) => {
              const ay = Number(a.match(/^(\d{4})/)?.[1] || 0)
              const by = Number(b.match(/^(\d{4})/)?.[1] || 0)
              return by - ay
            })[0]
          if (newest) setSession(newest)
        }
      })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [programValue])

  // ── Derived: teacher list from students if API returns none ──
  const teacherOptions = useMemo(() => {
    const fromApi = teachers
      .map((t) => t.name || t.fullName || t.teacherName || '')
      .filter(Boolean)
    if (fromApi.length) return Array.from(new Set(fromApi)).sort()
    return [
      'Mr. Ahmed', 'Ms. Fatima', 'Mr. Khan', 'Ms. Sana', 'Mr. Bilal',
      'Ms. Hina', 'Mr. Yusuf', 'Ms. Ayesha',
    ]
  }, [teachers])

  // ── Filters for Classes tab ──
  const [fGrade, setFGrade] = useState('')
  const [fSection, setFSection] = useState('')
  const [fDay, setFDay] = useState('')
  const [fTeacher, setFTeacher] = useState('')
  const [classSearch, setClassSearch] = useState('')

  const filteredClassRows = useMemo(() => {
    const q = classSearch.trim().toLowerCase()
    return classRows.filter((r) => {
      if (fGrade && r.grade !== fGrade) return false
      if (fSection && r.section !== fSection) return false
      if (fDay && r.day !== fDay) return false
      if (fTeacher && r.teacher !== fTeacher) return false
      if (q) {
        const hay = [r.teacher, r.subject, r.grade, r.section, r.room]
          .map((v) => String(v ?? '').toLowerCase())
          .join(' ')
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [classRows, fGrade, fSection, fDay, fTeacher, classSearch])

  // ── Filters for Exams tab ──
  const [eGrade, setEGrade] = useState('')
  const [eType, setEType] = useState('')
  const [examSearch, setExamSearch] = useState('')

  const filteredExamRows = useMemo(() => {
    const q = examSearch.trim().toLowerCase()
    return [...examRows]
      .filter((r) => {
        if (eGrade && r.grade !== eGrade) return false
        if (eType && r.paperType !== eType) return false
        if (q) {
          const hay = [r.subject, r.grade, r.room, r.paperType]
            .map((v) => String(v ?? '').toLowerCase())
            .join(' ')
          if (!hay.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : Infinity
        const db = b.date ? new Date(b.date).getTime() : Infinity
        return da - db
      })
  }, [examRows, eGrade, eType, examSearch])

  // ── CRUD: Classes ──
  const newClassRow = () => ({
    id: uid(),
    teacher: '',
    grade: '',
    section: '',
    subject: '',
    day: 'Monday',
    startTime: '08:00',
    endTime: '08:45',
    room: '',
  })

  const saveClassRow = (row) => {
    if (!row.teacher || !row.grade || !row.subject) {
      toast.error('Please fill teacher, class and subject')
      return
    }
    if (classRows.some((r) => r.id === row.id)) {
      setClassRows((prev) => prev.map((r) => (r.id === row.id ? row : r)))
    } else {
      setClassRows((prev) => [...prev, row])
    }
    setClassModal(null)
    toast.success('Class saved')
  }

  const deleteClassRow = (id) => {
    if (!window.confirm('Delete this class?')) return
    setClassRows((prev) => prev.filter((r) => r.id !== id))
  }

  // ── CRUD: Exams ──
  const newExamRow = () => ({
    id: uid(),
    grade: '',
    section: '',
    subject: '',
    paperType: 'Mid Term',
    date: '',
    startTime: '09:00',
    endTime: '11:00',
    room: '',
  })

  const saveExamRow = (row) => {
    if (!row.grade || !row.subject || !row.date) {
      toast.error('Please fill class, subject and date')
      return
    }
    if (examRows.some((r) => r.id === row.id)) {
      setExamRows((prev) => prev.map((r) => (r.id === row.id ? row : r)))
    } else {
      setExamRows((prev) => [...prev, row])
    }
    setExamModal(null)
    toast.success('Exam paper saved')
  }

  const deleteExamRow = (id) => {
    if (!window.confirm('Delete this exam paper?')) return
    setExamRows((prev) => prev.filter((r) => r.id !== id))
  }

  // ── Reset all ──
  const resetAll = () => {
    if (!window.confirm('Delete ALL date sheet rows? This cannot be undone.')) return
    setClassRows([])
    setExamRows([])
    toast.success('All rows cleared')
  }

  // ── Print ──
  const printSheet = () => {
    const isExams = tab === 'exams'
    const rows = isExams ? filteredExamRows : filteredClassRows
    if (!rows.length) {
      toast.error('Nothing to print — add some rows first')
      return
    }

    const win = window.open('', '_blank', 'width=1000,height=800')
    if (!win) {
      toast.error('Please allow pop-ups to print')
      return
    }

    const logo = school.logo
      ? `<img src="${esc(school.logo)}" alt="" style="width:18mm;height:18mm;object-fit:contain;border-radius:2mm;" />`
      : ''

    const header = `
      <div style="display:flex;align-items:center;gap:5mm;padding-bottom:4mm;border-bottom:0.6mm solid #1d4ed8;">
        ${logo}
        <div style="flex:1;min-width:0;">
          <div style="font-size:16pt;font-weight:800;text-transform:uppercase;color:#1d4ed8;line-height:1.15;">${esc(school.name || 'School Name')}</div>
          ${school.address ? `<div style="font-size:9pt;color:#475569;margin-top:1mm;">${esc(school.address)}</div>` : ''}
          ${school.phone ? `<div style="font-size:8.5pt;color:#64748b;">Phone: ${esc(school.phone)}</div>` : ''}
        </div>
        <div style="text-align:right;">
          <div style="font-size:11pt;font-weight:800;color:#0f172a;">${isExams ? 'EXAMINATION TIMETABLE' : 'CLASS TIMETABLE'}</div>
          ${session ? `<div style="font-size:9pt;color:#475569;margin-top:1mm;">Session: ${esc(session)}</div>` : ''}
        </div>
      </div>
    `

    const tableHtml = isExams ? examPrintTable(rows) : classPrintTable(rows)

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<title>${isExams ? 'Examination Timetable' : 'Class Timetable'}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 6mm; }
  th { background: #1d4ed8; color: #ffffff; font-size: 9pt; font-weight: 800; padding: 3mm 2mm; text-align: left; letter-spacing: 0.3mm; text-transform: uppercase; }
  td { font-size: 9pt; padding: 2.5mm 2mm; border-bottom: 0.2mm solid #e2e8f0; }
  tr:nth-child(even) td { background: #f8fafc; }
  .footer { margin-top: 8mm; font-size: 8pt; color: #64748b; text-align: center; }
</style></head>
<body>
${header}
${tableHtml}
<div class="footer">Generated on ${new Date().toLocaleString()}</div>
<script>window.onload = function () { setTimeout(function () { window.print() }, 600) }</script>
</body></html>`

    win.document.open()
    win.document.write(html)
    win.document.close()
  }

  const classPrintTable = (rows) => `
    <table>
      <thead><tr>
        <th>#</th><th>Day</th><th>Time</th><th>Teacher</th><th>Class</th><th>Subject</th><th>Room</th>
      </tr></thead>
      <tbody>
        ${rows.map((r, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${esc(r.day)}</td>
            <td>${esc(r.startTime)} – ${esc(r.endTime)}</td>
            <td>${esc(r.teacher)}</td>
            <td>${esc(r.grade)}${r.section ? ' – ' + esc(r.section) : ''}</td>
            <td>${esc(r.subject)}</td>
            <td>${esc(r.room || '—')}</td>
          </tr>`).join('')}
      </tbody>
    </table>`

  const examPrintTable = (rows) => `
    <table>
      <thead><tr>
        <th>#</th><th>Date</th><th>Day</th><th>Time</th><th>Class</th><th>Subject</th><th>Paper</th><th>Room</th>
      </tr></thead>
      <tbody>
        ${rows.map((r, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${esc(fmtDate(r.date))}</td>
            <td>${esc(dayFromDate(r.date))}</td>
            <td>${esc(r.startTime)} – ${esc(r.endTime)}</td>
            <td>${esc(r.grade)}${r.section ? ' – ' + esc(r.section) : ''}</td>
            <td>${esc(r.subject)}</td>
            <td>${esc(r.paperType)}</td>
            <td>${esc(r.room || '—')}</td>
          </tr>`).join('')}
      </tbody>
    </table>`

  // ─────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────
  const isAcademy = programValue === 'academy'
  const accent = isAcademy ? 'from-purple-500 to-fuchsia-600' : 'from-blue-500 to-indigo-600'

  return (
    <div className="p-7">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${accent} text-white flex items-center justify-center shadow`}>
            <CalendarDays size={22} />
          </div>
          <div>
            <h2 className="font-bold text-2xl leading-tight">Date Sheet</h2>
            <p className="text-xs text-slate-500">
              Manage class timetables and examination schedules
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={resetAll}
            variant="outline"
            className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
          >
            <RotateCcw size={16} /> Reset All
          </Button>
          <Button onClick={printSheet} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Printer size={16} /> Print / Save PDF
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab('classes')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition ${
            tab === 'classes'
              ? 'bg-white text-blue-700 shadow'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users size={16} /> Classes Timetable
        </button>
        <button
          onClick={() => setTab('exams')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition ${
            tab === 'exams'
              ? 'bg-white text-blue-700 shadow'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ClipboardList size={16} /> Examination Timetable
        </button>
      </div>

      {/* Session bar (shared) */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-5 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <CalendarDays size={16} className="text-blue-600" />
          Session
        </div>
        <input
          className={INPUT + ' max-w-[220px]'}
          value={session}
          onChange={(e) => setSession(e.target.value)}
          placeholder="e.g. 2025-2026"
        />
        <div className="flex-1" />
        {school.logo && (
          <img src={school.logo} alt="" className="w-10 h-10 object-contain rounded" />
        )}
        <div className="text-right">
          <div className="text-sm font-bold text-slate-800">{school.name || 'School Name'}</div>
          <div className="text-[11px] text-slate-500">{school.address}</div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
          <p className="text-sm text-slate-500 mt-2">Loading…</p>
        </div>
      ) : tab === 'classes' ? (
        <ClassesTab
          rows={filteredClassRows}
          all={classRows}
          grades={GRADES}
          sections={SECTIONS}
          days={DAYS}
          teachers={teacherOptions}
          filters={{ fGrade, fSection, fDay, fTeacher, classSearch }}
          setFilters={{ setFGrade, setFSection, setFDay, setFTeacher, setClassSearch }}
          onAdd={() => setClassModal(newClassRow())}
          onEdit={(row) => setClassModal(row)}
          onDelete={deleteClassRow}
        />
      ) : (
        <ExamsTab
          rows={filteredExamRows}
          all={examRows}
          grades={GRADES}
          sections={SECTIONS}
          paperTypes={PAPER_TYPES}
          filters={{ eGrade, eType, examSearch }}
          setFilters={{ setEGrade, setEType, setExamSearch }}
          onAdd={() => setExamModal(newExamRow())}
          onEdit={(row) => setExamModal(row)}
          onDelete={deleteExamRow}
        />
      )}

      {/* Class modal */}
      {classModal && (
        <ClassModal
          initial={classModal}
          grades={GRADES}
          sections={SECTIONS}
          days={DAYS}
          teachers={teacherOptions}
          onCancel={() => setClassModal(null)}
          onSave={saveClassRow}
        />
      )}

      {/* Exam modal */}
      {examModal && (
        <ExamModal
          initial={examModal}
          grades={GRADES}
          sections={SECTIONS}
          paperTypes={PAPER_TYPES}
          onCancel={() => setExamModal(null)}
          onSave={saveExamRow}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Classes Tab
// ─────────────────────────────────────────────
function ClassesTab({
  rows, all, grades, sections, days, teachers,
  filters, setFilters, onAdd, onEdit, onDelete,
}) {
  const { fGrade, fSection, fDay, fTeacher, classSearch } = filters
  const { setFGrade, setFSection, setFDay, setFTeacher, setClassSearch } = setFilters

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div>
          <label className={LABEL}>Class</label>
          <select className={INPUT} value={fGrade} onChange={(e) => setFGrade(e.target.value)}>
            <option value="">All</option>
            {grades.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>Section</label>
          <select className={INPUT} value={fSection} onChange={(e) => setFSection(e.target.value)}>
            <option value="">All</option>
            {sections.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>Day</label>
          <select className={INPUT} value={fDay} onChange={(e) => setFDay(e.target.value)}>
            <option value="">All</option>
            {days.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>Teacher</label>
          <select className={INPUT} value={fTeacher} onChange={(e) => setFTeacher(e.target.value)}>
            <option value="">All</option>
            {teachers.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className={LABEL}>Search</label>
          <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 bg-white">
            <Search size={14} className="text-slate-400" />
            <input
              value={classSearch}
              onChange={(e) => setClassSearch(e.target.value)}
              placeholder="Search…"
              className="flex-1 outline-none text-sm bg-transparent"
            />
          </div>
        </div>
        <div className="ml-auto self-end">
          <Button onClick={onAdd} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Plus size={16} /> Add Class
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="text-left px-3 py-3">Day</th>
              <th className="text-left px-3 py-3">Time</th>
              <th className="text-left px-3 py-3">Teacher</th>
              <th className="text-left px-3 py-3">Class</th>
              <th className="text-left px-3 py-3">Subject</th>
              <th className="text-left px-3 py-3">Room</th>
              <th className="text-right px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-slate-400">
                  No classes yet — click <b>Add Class</b> to start.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-3 font-semibold text-slate-800">{r.day}</td>
                  <td className="px-3 py-3 text-slate-600">{r.startTime} – {r.endTime}</td>
                  <td className="px-3 py-3 text-slate-700">{r.teacher}</td>
                  <td className="px-3 py-3">
                    <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-bold">
                      {r.grade}{r.section ? ` - ${r.section}` : ''}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-700">{r.subject}</td>
                  <td className="px-3 py-3 text-slate-500">{r.room || '—'}</td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => onEdit(r)}
                      className="p-1.5 rounded hover:bg-blue-50 text-blue-600 mr-1"
                      title="Edit"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => onDelete(r.id)}
                      className="p-1.5 rounded hover:bg-red-50 text-red-600"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-slate-400 mt-3">
        Showing {rows.length} of {all.length} classes
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────
// Exams Tab
// ─────────────────────────────────────────────
function ExamsTab({
  rows, all, grades, sections, paperTypes,
  filters, setFilters, onAdd, onEdit, onDelete,
}) {
  const { eGrade, eType, examSearch } = filters
  const { setEGrade, setEType, setExamSearch } = setFilters

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div>
          <label className={LABEL}>Class</label>
          <select className={INPUT} value={eGrade} onChange={(e) => setEGrade(e.target.value)}>
            <option value="">All</option>
            {grades.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>Exam Type</label>
          <select className={INPUT} value={eType} onChange={(e) => setEType(e.target.value)}>
            <option value="">All</option>
            {paperTypes.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className={LABEL}>Search</label>
          <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 bg-white">
            <Search size={14} className="text-slate-400" />
            <input
              value={examSearch}
              onChange={(e) => setExamSearch(e.target.value)}
              placeholder="Search…"
              className="flex-1 outline-none text-sm bg-transparent"
            />
          </div>
        </div>
        <div className="ml-auto self-end">
          <Button onClick={onAdd} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Plus size={16} /> Add Paper
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="text-left px-3 py-3">Date</th>
              <th className="text-left px-3 py-3">Day</th>
              <th className="text-left px-3 py-3">Time</th>
              <th className="text-left px-3 py-3">Class</th>
              <th className="text-left px-3 py-3">Subject</th>
              <th className="text-left px-3 py-3">Paper</th>
              <th className="text-left px-3 py-3">Room</th>
              <th className="text-right px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-10 text-slate-400">
                  No exams yet — click <b>Add Paper</b> to start.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-3 font-semibold text-slate-800">{fmtDate(r.date)}</td>
                  <td className="px-3 py-3 text-slate-600">{dayFromDate(r.date)}</td>
                  <td className="px-3 py-3 text-slate-600">{r.startTime} – {r.endTime}</td>
                  <td className="px-3 py-3">
                    <span className="inline-block px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-xs font-bold">
                      {r.grade}{r.section ? ` - ${r.section}` : ''}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-700">{r.subject}</td>
                  <td className="px-3 py-3">
                    <span className="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-xs font-bold">
                      {r.paperType}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-500">{r.room || '—'}</td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => onEdit(r)}
                      className="p-1.5 rounded hover:bg-blue-50 text-blue-600 mr-1"
                      title="Edit"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => onDelete(r.id)}
                      className="p-1.5 rounded hover:bg-red-50 text-red-600"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-slate-400 mt-3">
        Showing {rows.length} of {all.length} exam papers
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────
// Class Modal
// ─────────────────────────────────────────────
function ClassModal({ initial, grades, sections, days, teachers, onCancel, onSave }) {
  const [row, setRow] = useState(initial)
  const set = (patch) => setRow((r) => ({ ...r, ...patch }))

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">
            {initial.teacher ? 'Edit Class' : 'Add Class'}
          </h3>
          <button onClick={onCancel} className="p-1 rounded hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Teacher *</label>
            <select className={INPUT} value={row.teacher} onChange={(e) => set({ teacher: e.target.value })}>
              <option value="">Select teacher</option>
              {teachers.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Subject *</label>
            <input
              className={INPUT}
              value={row.subject}
              onChange={(e) => set({ subject: e.target.value })}
              placeholder="Math, English…"
            />
          </div>
          <div>
            <label className={LABEL}>Class *</label>
            <select className={INPUT} value={row.grade} onChange={(e) => set({ grade: e.target.value })}>
              <option value="">Select class</option>
              {grades.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Section</label>
            <select className={INPUT} value={row.section} onChange={(e) => set({ section: e.target.value })}>
              <option value="">—</option>
              {sections.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Day</label>
            <select className={INPUT} value={row.day} onChange={(e) => set({ day: e.target.value })}>
              {days.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Room</label>
            <input
              className={INPUT}
              value={row.room}
              onChange={(e) => set({ room: e.target.value })}
              placeholder="R-101"
            />
          </div>
          <div>
            <label className={LABEL}>Start time</label>
            <input
              type="time"
              className={INPUT}
              value={row.startTime}
              onChange={(e) => set({ startTime: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL}>End time</label>
            <input
              type="time"
              className={INPUT}
              value={row.endTime}
              onChange={(e) => set({ endTime: e.target.value })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onSave(row)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Save size={16} /> Save
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Exam Modal
// ─────────────────────────────────────────────
function ExamModal({ initial, grades, sections, paperTypes, onCancel, onSave }) {
  const [row, setRow] = useState(initial)
  const set = (patch) => setRow((r) => ({ ...r, ...patch }))

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">
            {initial.subject ? 'Edit Exam Paper' : 'Add Exam Paper'}
          </h3>
          <button onClick={onCancel} className="p-1 rounded hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Class *</label>
            <select className={INPUT} value={row.grade} onChange={(e) => set({ grade: e.target.value })}>
              <option value="">Select class</option>
              {grades.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Section</label>
            <select className={INPUT} value={row.section} onChange={(e) => set({ section: e.target.value })}>
              <option value="">—</option>
              {sections.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className={LABEL}>Subject *</label>
            <input
              className={INPUT}
              value={row.subject}
              onChange={(e) => set({ subject: e.target.value })}
              placeholder="Math, English…"
            />
          </div>
          <div>
            <label className={LABEL}>Paper type</label>
            <select className={INPUT} value={row.paperType} onChange={(e) => set({ paperType: e.target.value })}>
              {paperTypes.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Room</label>
            <input
              className={INPUT}
              value={row.room}
              onChange={(e) => set({ room: e.target.value })}
              placeholder="Hall A"
            />
          </div>
          <div className="col-span-2">
            <label className={LABEL}>Date *</label>
            <input
              type="date"
              className={INPUT}
              value={row.date}
              onChange={(e) => set({ date: e.target.value })}
            />
            {row.date && (
              <p className="text-[11px] text-slate-500 mt-1">
                {dayFromDate(row.date)}
              </p>
            )}
          </div>
          <div>
            <label className={LABEL}>Start time</label>
            <input
              type="time"
              className={INPUT}
              value={row.startTime}
              onChange={(e) => set({ startTime: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL}>End time</label>
            <input
              type="time"
              className={INPUT}
              value={row.endTime}
              onChange={(e) => set({ endTime: e.target.value })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onSave(row)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Save size={16} /> Save
          </Button>
        </div>
      </div>
    </div>
  )
}