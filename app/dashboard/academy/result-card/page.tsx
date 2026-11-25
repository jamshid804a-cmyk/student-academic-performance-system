"use client"

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Award, Plus, Trash2, Printer, Save, RotateCcw, Search,
  Loader2, GraduationCap, Users, ClipboardList, X, Trophy,
  CheckCircle2, XCircle, Percent,
} from 'lucide-react'
import GlobalApi from '@/app/_services/GlobalApi'
import { useProgram } from '@/src/context/ProgramContext'

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const STORAGE_KEY = 'resultcard_v1'

const GRADES = [
  'Nursery', 'Prep',
  '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th',
]
const SECTIONS = ['A', 'B', 'C']
const TERMS = [
  '1st Term', '2nd Term', '3rd Term',
  'Mid Term', 'Final Term',
  'Monthly Test', 'Annual Exam', 'Pre-Board',
]

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

const num = (v) => {
  const n = parseFloat(String(v ?? '').replace(/[^\d.]/g, ''))
  return Number.isFinite(n) ? n : 0
}

const toNum = (v) => {
  const n = parseInt(String(v ?? '').replace(/[^\d]/g, ''), 10)
  return Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : n
}

const sameText = (a, b) =>
  String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase()

function sameGrade(a, b) {
  const x = String(a || '').trim().toLowerCase()
  const y = String(b || '').trim().toLowerCase()
  if (!x || !y) return false
  if (x === y) return true
  const nx = x.match(/^(\d+)/)
  const ny = y.match(/^(\d+)/)
  return !!(nx && ny && nx[1] === ny[1])
}

const studentKey = (s) => String(s?.id ?? s?._id ?? s?.rollNo ?? '')

// Grade + remarks based on percentage
function getGrade(pct) {
  if (pct >= 90) return { grade: 'A+', remark: 'Outstanding' }
  if (pct >= 80) return { grade: 'A', remark: 'Excellent' }
  if (pct >= 70) return { grade: 'B', remark: 'Very Good' }
  if (pct >= 60) return { grade: 'C', remark: 'Good' }
  if (pct >= 50) return { grade: 'D', remark: 'Satisfactory' }
  if (pct >= 40) return { grade: 'E', remark: 'Pass' }
  return { grade: 'F', remark: 'Fail' }
}

const ordinal = (n) => {
  if (!n) return '—'
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export default function ResultCardPage() {
  const ctx = useProgram() || {}
  const programValue = ctx.program || 'school'
  const isAcademy = programValue === 'academy'

  // School info
  const [school, setSchool] = useState({ name: '', address: '', phone: '', logo: '' })

  // All students from API
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [grade, setGrade] = useState('')
  const [section, setSection] = useState('')
  const [session, setSession] = useState('')

  // Exam term
  const [term, setTerm] = useState(isAcademy ? 'Result' : TERMS[0])

  // Subject/paper list — applies to everyone in this class
  const [subjects, setSubjects] = useState([]) // [{ id, name, totalMarks }]

  // Marks: { [studentKey]: { [subjectId]: obtainedMarks } }
  const [marks, setMarks] = useState({})

  // Save status
  const hydrated = useRef(false)
  const warned = useRef(false)

  const [newSubjectName, setNewSubjectName] = useState('')
  const [newSubjectTotal, setNewSubjectTotal] = useState(100)

  // ── Load saved data ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const d = JSON.parse(raw)
        if (Array.isArray(d.subjects)) setSubjects(d.subjects)
        if (d.marks && typeof d.marks === 'object') setMarks(d.marks)
        if (typeof d.term === 'string' && d.term) setTerm(d.term)
      }
    } catch {}
    hydrated.current = true
  }, [])

  // ── Save on change ──
  useEffect(() => {
    if (!hydrated.current) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ subjects, marks, term }))
    } catch {
      if (!warned.current) {
        warned.current = true
        toast.warning('Could not save — storage is full.')
      }
    }
  }, [subjects, marks, term])

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

  // ── Students ──
  useEffect(() => {
    let alive = true
    setLoading(true)
    GlobalApi.GetAllStudents?.({ program: programValue })
      .then((resp) => {
        if (!alive) return
        const list = Array.isArray(resp?.data) ? resp.data : []
        setStudents(
          list.map((s) => ({
            ...s,
            id: s.id ?? s._id ?? null,
            name: s.name || s.studentName || '',
            fatherName: s.fatherName || s.father || '',
            rollNo: s.rollNo ?? s.roll ?? '',
            grade: s.grade || s.class || '',
            section: s.section || '',
            session: s.session || '',
          }))
        )
      })
      .catch(() => toast.error('Could not load students'))
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [programValue])

  // ── Session options ──
  const sessionOptions = useMemo(() => {
    const setS = new Set()
    students.forEach((s) => { if (s.session) setS.add(String(s.session).trim()) })
    return Array.from(setS).sort()
  }, [students])

  // Auto-pick newest session
  const sessionInit = useRef(false)
  useEffect(() => {
    if (sessionInit.current || !sessionOptions.length) return
    sessionInit.current = true
    setSession(
      [...sessionOptions].sort((a, b) => {
        const ay = Number(a.match(/^(\d{4})/)?.[1] || 0)
        const by = Number(b.match(/^(\d{4})/)?.[1] || 0)
        return by - ay
      })[0]
    )
  }, [sessionOptions])

  // ── Filter students by grade/section/session ──
  const classStudents = useMemo(() => {
    const list = students.filter((s) => {
      if (grade && !sameGrade(s.grade, grade)) return false
      if (section && !sameText(s.section, section)) return false
      if (session && !sameText(s.session, session)) return false
      return true
    })
    return list.sort((a, b) => toNum(a.rollNo) - toNum(b.rollNo))
  }, [students, grade, section, session])

  // ── Add / remove subjects ──
  const addSubject = () => {
    const name = newSubjectName.trim()
    const total = num(newSubjectTotal)
    if (!name) return toast.error('Subject name is required')
    if (total <= 0) return toast.error('Total marks must be greater than 0')
    if (subjects.some((s) => sameText(s.name, name))) {
      return toast.error('This subject already exists')
    }
    setSubjects((prev) => [...prev, { id: uid(), name, totalMarks: total }])
    setNewSubjectName('')
    setNewSubjectTotal(100)
  }

  const removeSubject = (id) => {
    if (!window.confirm('Remove this subject from all students?')) return
    setSubjects((prev) => prev.filter((s) => s.id !== id))
    setMarks((prev) => {
      const next = { ...prev }
      Object.keys(next).forEach((k) => {
        const m = { ...next[k] }
        delete m[id]
        next[k] = m
      })
      return next
    })
  }

  // ── Set marks ──
  const setMark = (studentId, subjectId, value) => {
    const subject = subjects.find((s) => s.id === subjectId)
    let v = String(value).replace(/[^\d.]/g, '')
    if (v) {
      const n = parseFloat(v)
      if (n < 0) v = '0'
      if (subject && n > subject.totalMarks) v = String(subject.totalMarks)
    }
    setMarks((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [subjectId]: v },
    }))
  }

  // ── Per-student computations ──
  const computed = useMemo(() => {
    return classStudents.map((s) => {
      const sid = studentKey(s)
      const studentMarks = marks[sid] || {}
      let obtained = 0
      let total = 0
      let allEntered = true
      subjects.forEach((sub) => {
        total += sub.totalMarks
        const raw = studentMarks[sub.id]
        if (raw === undefined || raw === '') {
          allEntered = false
        } else {
          obtained += num(raw)
        }
      })
      const pct = total > 0 ? (obtained / total) * 100 : 0
      const { grade: g, remark } = getGrade(pct)
      const pass = pct >= 40
      return {
        student: s,
        sid,
        obtained,
        total,
        pct,
        grade: g,
        remark,
        pass,
        allEntered,
        completed: allEntered && subjects.length > 0,
      }
    })
  }, [classStudents, marks, subjects])

  // ── Rank by percentage (only completed rows), 1st, 2nd, 3rd… ──
  const ranked = useMemo(() => {
    const completed = computed
      .filter((c) => c.completed)
      .sort((a, b) => b.pct - a.pct || toNum(a.student.rollNo) - toNum(b.student.rollNo))

    const rankMap = {}
    completed.forEach((c, i) => {
      // dense ranking: equal pct -> same rank
      if (i > 0 && completed[i - 1].pct === c.pct) {
        rankMap[c.sid] = rankMap[completed[i - 1].sid]
      } else {
        rankMap[c.sid] = i + 1
      }
    })
    return computed.map((c) => ({ ...c, position: rankMap[c.sid] || null }))
  }, [computed])

  // Sort so completed rows appear first with their real position ascending
  const sortedRanked = useMemo(() => {
    return [...ranked].sort((a, b) => {
      if (a.position && b.position) return a.position - b.position
      if (a.position) return -1
      if (b.position) return 1
      return toNum(a.student.rollNo) - toNum(b.student.rollNo)
    })
  }, [ranked])

  // Class stats
  const classAverage = useMemo(() => {
    const done = ranked.filter((r) => r.completed)
    if (!done.length) return 0
    return done.reduce((sum, r) => sum + r.pct, 0) / done.length
  }, [ranked])

  const passedCount = ranked.filter((r) => r.completed && r.pass).length
  const failedCount = ranked.filter((r) => r.completed && !r.pass).length

  // ── Reset ──
  const resetAll = () => {
    if (!window.confirm('Clear all subjects and marks? This cannot be undone.')) return
    setSubjects([])
    setMarks({})
    toast.success('Cleared')
  }

  // ── Print ──
  const printResult = () => {
    if (!classStudents.length) {
      toast.error('No students in this class')
      return
    }
    if (!subjects.length) {
      toast.error('Add at least one subject first')
      return
    }
    if (!ranked.some((r) => r.completed)) {
      toast.error('Enter marks for at least one student')
      return
    }

    const win = window.open('', '_blank', 'width=1100,height=900')
    if (!win) {
      toast.error('Please allow pop-ups to print')
      return
    }

    const logo = school.logo
      ? `<img src="${esc(school.logo)}" alt="" style="width:18mm;height:18mm;object-fit:contain;border-radius:2mm;" />`
      : ''

    const titleLine = isAcademy ? 'RESULT' : `RESULT — ${esc(term)}`

    const header = `
      <div style="display:flex;align-items:center;gap:5mm;padding-bottom:3mm;border-bottom:0.6mm solid #1d4ed8;">
        ${logo}
        <div style="flex:1;min-width:0;">
          <div style="font-size:16pt;font-weight:800;text-transform:uppercase;color:#1d4ed8;line-height:1.15;">${esc(school.name || 'School Name')}</div>
          ${school.address ? `<div style="font-size:9pt;color:#475569;margin-top:0.8mm;">${esc(school.address)}</div>` : ''}
          ${school.phone ? `<div style="font-size:8.5pt;color:#64748b;">Phone: ${esc(school.phone)}</div>` : ''}
        </div>
        <div style="text-align:right;">
          <div style="font-size:12pt;font-weight:800;color:#0f172a;">${titleLine}</div>
          ${grade ? `<div style="font-size:9pt;color:#475569;margin-top:0.8mm;">Class: ${esc(grade)}${section ? ' - ' + esc(section) : ''}</div>` : ''}
          ${session ? `<div style="font-size:9pt;color:#475569;">Session: ${esc(session)}</div>` : ''}
        </div>
      </div>
    `

    const subjectHeaders = subjects
      .map((s) => `<th style="text-align:center;">${esc(s.name)}<br/><span style="font-weight:400;font-size:7pt;">(${s.totalMarks})</span></th>`)
      .join('')

    const rowsHtml = sortedRanked
      .map((r, i) => {
        const cells = subjects
          .map((sub) => {
            const v = marks[r.sid]?.[sub.id]
            return `<td style="text-align:center;">${v === undefined || v === '' ? '—' : esc(v)}</td>`
          })
          .join('')
        return `<tr>
          <td style="text-align:center;font-weight:700;">${r.position ? ordinal(r.position) : '—'}</td>
          <td>${esc(r.student.rollNo || '')}</td>
          <td style="font-weight:700;">${esc(r.student.name || '')}</td>
          <td style="color:#64748b;">${esc(r.student.fatherName || '')}</td>
          ${cells}
          <td style="text-align:center;font-weight:700;">${r.obtained} / ${r.total}</td>
          <td style="text-align:center;">${r.pct.toFixed(2)}%</td>
          <td style="text-align:center;font-weight:800;">${r.grade}</td>
          <td style="text-align:center;">${r.pass ? '<span style="color:#047857;font-weight:700;">Pass</span>' : '<span style="color:#b91c1c;font-weight:700;">Fail</span>'}</td>
          <td style="font-size:8pt;color:#475569;">${r.remark}</td>
        </tr>`
      })
      .join('')

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<title>Result — ${esc(grade)}${section ? ' ' + esc(section) : ''}</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 4mm; }
  th { background: #1d4ed8; color: #ffffff; font-size: 8pt; font-weight: 800; padding: 2.5mm 2mm; text-align: left; letter-spacing: 0.2mm; text-transform: uppercase; border: 0.2mm solid #1e40af; }
  td { font-size: 8.5pt; padding: 2mm; border: 0.2mm solid #e2e8f0; }
  tr:nth-child(even) td { background: #f8fafc; }
  .footer { margin-top: 6mm; font-size: 8pt; color: #64748b; text-align: center; }
  .stats { display: flex; gap: 8mm; margin-top: 3mm; font-size: 9pt; color: #334155; }
  .stats b { color: #0f172a; }
</style></head>
<body>
${header}
<div class="stats">
  <div>Total Students: <b>${classStudents.length}</b></div>
  <div>Passed: <b style="color:#047857;">${passedCount}</b></div>
  <div>Failed: <b style="color:#b91c1c;">${failedCount}</b></div>
  <div>Class Average: <b>${classAverage.toFixed(2)}%</b></div>
</div>
<table>
  <thead><tr>
    <th style="text-align:center;">Pos</th>
    <th>Roll</th>
    <th>Student Name</th>
    <th>Father Name</th>
    ${subjectHeaders}
    <th style="text-align:center;">Total</th>
    <th style="text-align:center;">%</th>
    <th style="text-align:center;">Grade</th>
    <th style="text-align:center;">Status</th>
    <th>Remark</th>
  </tr></thead>
  <tbody>${rowsHtml}</tbody>
</table>
<div class="footer">Generated on ${new Date().toLocaleString()} — ${esc(school.name || '')}</div>
<script>window.onload = function () { setTimeout(function () { window.print() }, 600) }</script>
</body></html>`

    win.document.open()
    win.document.write(html)
    win.document.close()
  }

  // ─────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────
  const accent = isAcademy
    ? 'from-purple-500 to-fuchsia-600'
    : 'from-emerald-500 to-teal-600'

  return (
    <div className="p-7">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${accent} text-white flex items-center justify-center shadow`}>
            <Award size={22} />
          </div>
          <div>
            <h2 className="font-bold text-2xl leading-tight">Result Card</h2>
            <p className="text-xs text-slate-500">
              Enter marks, auto-calculate grades & positions, then print
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={resetAll}
            variant="outline"
            className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
          >
            <RotateCcw size={16} /> Reset Marks
          </Button>
          <Button onClick={printResult} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            <Printer size={16} /> Print / Save PDF
          </Button>
        </div>
      </div>

      {/* Step 1: Class / Section / Session / Term */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Users size={16} className="text-emerald-600" />
          <h3 className="font-bold text-slate-800">1. Select class & term</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className={LABEL}>Class</label>
            <select className={INPUT} value={grade} onChange={(e) => setGrade(e.target.value)}>
              <option value="">All classes</option>
              {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Section</label>
            <select className={INPUT} value={section} onChange={(e) => setSection(e.target.value)}>
              <option value="">All sections</option>
              {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Session</label>
            <select className={INPUT} value={session} onChange={(e) => setSession(e.target.value)}>
              <option value="">All sessions</option>
              {sessionOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>{isAcademy ? 'Result label' : 'Term'}</label>
            {isAcademy ? (
              <input
                className={INPUT}
                value="Result"
                readOnly
                title="Academy mode uses a plain 'Result' label"
              />
            ) : (
              <select className={INPUT} value={term} onChange={(e) => setTerm(e.target.value)}>
                {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mt-4 text-xs text-slate-600">
          <span><b className="text-slate-900">{classStudents.length}</b> students found</span>
          <span>Passed: <b className="text-emerald-600">{passedCount}</b></span>
          <span>Failed: <b className="text-red-600">{failedCount}</b></span>
          <span>Class average: <b className="text-blue-700">{classAverage.toFixed(2)}%</b></span>
        </div>
      </div>

      {/* Step 2: Subjects */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList size={16} className="text-emerald-600" />
          <h3 className="font-bold text-slate-800">2. Add subjects / papers</h3>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className={LABEL}>Subject name</label>
            <input
              className={INPUT}
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              placeholder="Math, English, Science…"
              onKeyDown={(e) => e.key === 'Enter' && addSubject()}
            />
          </div>
          <div>
            <label className={LABEL}>Total marks</label>
            <input
              type="number"
              className={INPUT}
              value={newSubjectTotal}
              min={1}
              onChange={(e) => setNewSubjectTotal(e.target.value)}
            />
          </div>
          <Button onClick={addSubject} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            <Plus size={16} /> Add Subject
          </Button>
        </div>

        {subjects.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {subjects.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full pl-3 pr-2 py-1 text-sm"
              >
                <span className="font-semibold">{s.name}</span>
                <span className="text-emerald-600 text-xs">/{s.totalMarks}</span>
                <button
                  onClick={() => removeSubject(s.id)}
                  className="text-emerald-600 hover:text-red-600 transition"
                  title="Remove"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step 3: Marks table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GraduationCap size={16} className="text-emerald-600" />
            <h3 className="font-bold text-slate-800">3. Enter marks</h3>
          </div>
          <span className="text-xs text-slate-500">
            {subjects.length ? `Total marks: ${subjects.reduce((s, x) => s + num(x.totalMarks), 0)}` : 'Add subjects to start'}
          </span>
        </div>

        {loading ? (
          <div className="py-10 text-center text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
            <p className="mt-2 text-sm">Loading students…</p>
          </div>
        ) : !grade ? (
          <p className="py-10 text-center text-sm text-slate-400">
            Select a class above to load students
          </p>
        ) : classStudents.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">
            No students in this class/section/session
          </p>
        ) : subjects.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">
            Add subjects above to start entering marks
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="text-center px-2 py-3 w-14">Pos</th>
                  <th className="text-left px-3 py-3">Roll</th>
                  <th className="text-left px-3 py-3">Student</th>
                  <th className="text-left px-3 py-3">Father</th>
                  {subjects.map((sub) => (
                    <th key={sub.id} className="text-center px-2 py-3 min-w-[90px]">
                      <div>{sub.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal normal-case">/{sub.totalMarks}</div>
                    </th>
                  ))}
                  <th className="text-center px-3 py-3">Total</th>
                  <th className="text-center px-3 py-3">%</th>
                  <th className="text-center px-3 py-3">Grade</th>
                  <th className="text-center px-3 py-3">Status</th>
                  <th className="text-left px-3 py-3">Remark</th>
                </tr>
              </thead>
              <tbody>
                {sortedRanked.map((r) => (
                  <tr key={r.sid} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-2 py-3 text-center">
                      {r.position ? (
                        <span className={`inline-flex items-center gap-1 font-bold ${
                          r.position === 1 ? 'text-amber-600'
                          : r.position === 2 ? 'text-slate-500'
                          : r.position === 3 ? 'text-orange-600'
                          : 'text-slate-600'
                        }`}>
                          {r.position <= 3 && <Trophy size={13} />}
                          {ordinal(r.position)}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-700">{r.student.rollNo || '—'}</td>
                    <td className="px-3 py-3 font-semibold text-slate-800">{r.student.name}</td>
                    <td className="px-3 py-3 text-slate-500">{r.student.fatherName || '—'}</td>
                    {subjects.map((sub) => (
                      <td key={sub.id} className="px-2 py-2 text-center">
                        <input
                          type="number"
                          min={0}
                          max={sub.totalMarks}
                          value={marks[r.sid]?.[sub.id] ?? ''}
                          onChange={(e) => setMark(r.sid, sub.id, e.target.value)}
                          className="w-16 px-2 py-1 text-center rounded border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none text-sm"
                          placeholder="0"
                        />
                      </td>
                    ))}
                    <td className="px-3 py-3 text-center font-bold text-slate-800">
                      {r.completed ? `${r.obtained} / ${r.total}` : '—'}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {r.completed ? (
                        <span className="inline-flex items-center gap-1 text-slate-700">
                          <Percent size={12} className="text-slate-400" />
                          {r.pct.toFixed(2)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {r.completed ? (
                        <span className="font-bold text-slate-900">{r.grade}</span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {r.completed ? (
                        r.pass ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                            <CheckCircle2 size={13} /> Pass
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-700 font-semibold">
                            <XCircle size={13} /> Fail
                          </span>
                        )
                      ) : '—'}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{r.completed ? r.remark : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[11px] text-slate-400 mt-3">
          Positions are computed automatically from the entered percentages and shown in ascending order
          (1st, 2nd, 3rd…). Ties share the same position.
        </p>
      </div>
    </div>
  )
}