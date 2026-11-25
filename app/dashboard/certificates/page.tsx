"use client"

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  ScrollText, Printer, Download, Loader2, Users, FileText,
  CheckCircle2, Award, GraduationCap, BookOpen, Sparkles,
  ChevronDown, X, Save, RotateCcw, Search,
} from 'lucide-react'
import GlobalApi from '@/app/_services/GlobalApi'
import { useProgram } from '@/src/context/ProgramContext'

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const STORAGE_KEY = 'certificates_v1'

const GRADES = [
  'Nursery', 'Prep',
  '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th',
]
const SECTIONS = ['A', 'B', 'C']

const INPUT =
  'w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
const LABEL = 'block text-xs font-semibold text-slate-600 mb-1'

// Certificate types — show based on program
const CERT_TYPES = {
  school: [
    { id: 'character', name: 'Character Certificate', icon: CheckCircle2, color: 'from-emerald-500 to-teal-600' },
    { id: 'leaving', name: 'Leaving Certificate', icon: GraduationCap, color: 'from-blue-500 to-indigo-600' },
    { id: 'course', name: 'Course Completion', icon: BookOpen, color: 'from-amber-500 to-orange-600' },
    { id: 'merit', name: 'Merit / Position', icon: Award, color: 'from-rose-500 to-pink-600' },
    { id: 'participation', name: 'Participation', icon: Sparkles, color: 'from-purple-500 to-fuchsia-600' },
  ],
  academy: [
    { id: 'course', name: 'Course Completion', icon: BookOpen, color: 'from-purple-500 to-fuchsia-600' },
    { id: 'character', name: 'Character Certificate', icon: CheckCircle2, color: 'from-emerald-500 to-teal-600' },
    { id: 'leaving', name: 'Leaving Certificate', icon: GraduationCap, color: 'from-blue-500 to-indigo-600' },
  ],
}

// Default body text per certificate type
const DEFAULT_BODIES = {
  character: (s, school) =>
    `This is to certify that ${s.name || 'the student'}, son/daughter of ${s.fatherName || '________'}, Roll No ${s.rollNo || '____'}, a student of Class ${s.grade || '____'}${s.section ? ' - ' + s.section : ''} at ${school.name || 'our institution'}, bears a good moral character. He/She has been a disciplined, honest and well-behaved student throughout his/her stay at this institution. We wish him/her success in all future endeavors.`,

  leaving: (s, school) =>
    `This is to certify that ${s.name || 'the student'}, son/daughter of ${s.fatherName || '________'}, Roll No ${s.rollNo || '____'}, was a bona fide student of ${school.name || 'our institution'} in Class ${s.grade || '____'}${s.section ? ' - ' + s.section : ''} during the session ${s.session || '____'}. He/She has successfully completed the required course of study and is now leaving the institution. His/Her character and conduct during this period have been found to be satisfactory. We wish him/her every success in life.`,

  course: (s, school) =>
    `This is to certify that ${s.name || 'the student'}, son/daughter of ${s.fatherName || '________'}, Roll No ${s.rollNo || '____'}, has successfully completed the [COURSE_NAME] course at ${school.name || 'our institution'}${s.session ? ' during the session ' + s.session : ''}. He/She has demonstrated consistent effort, dedication, and proficiency throughout the course. We appreciate his/her commitment and wish him/her continued success.`,

  merit: (s, school) =>
    `This is to certify that ${s.name || 'the student'}, son/daughter of ${s.fatherName || '________'}, Roll No ${s.rollNo || '____'}, a student of Class ${s.grade || '____'}${s.section ? ' - ' + s.section : ''} at ${school.name || 'our institution'}, has secured the [POSITION] position in the class during the session ${s.session || '____'}. This outstanding achievement reflects his/her hard work, determination, and academic excellence. We congratulate him/her and wish continued success.`,

  participation: (s, school) =>
    `This is to certify that ${s.name || 'the student'}, son/daughter of ${s.fatherName || '________'}, Roll No ${s.rollNo || '____'}, a student of Class ${s.grade || '____'}${s.section ? ' - ' + s.section : ''} at ${school.name || 'our institution'}, has actively participated in [EVENT_NAME] held during the session ${s.session || '____'}. His/Her enthusiastic involvement and sportsmanship spirit are highly commendable. We appreciate his/her participation.`,
}

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

const studentKey = (s) => String(s?.id ?? s?._id ?? '')

const serialNumber = (prefix = 'CERT') => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${prefix}-${y}${m}-${rand}`
}

const fmtDate = (d = new Date()) =>
  new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export default function CertificatesPage() {
  const ctx = useProgram() || {}
  const programValue = ctx.program || 'school'
  const isAcademy = programValue === 'academy'
  const certTypes = CERT_TYPES[isAcademy ? 'academy' : 'school']

  // School info
  const [school, setSchool] = useState({ name: '', address: '', phone: '', logo: '' })

  // Students
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [grade, setGrade] = useState('')
  const [section, setSection] = useState('')
  const [session, setSession] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [search, setSearch] = useState('')

  // Certificate settings
  const [certType, setCertType] = useState(certTypes[0].id)
  const [courseName, setCourseName] = useState('MS Word')
  const [position, setPosition] = useState('1st')
  const [eventName, setEventName] = useState('Annual Function')
  const [bodyText, setBodyText] = useState('')
  const [signatureLabel, setSignatureLabel] = useState('Principal')
  const [issueDate, setIssueDate] = useState(fmtDate())
  const [serial, setSerial] = useState(serialNumber())
  const [accentColor, setAccentColor] = useState(isAcademy ? '#6d28d9' : '#1d4ed8')
  const [goldColor, setGoldColor] = useState('#d4af37')

  const hydrated = useRef(false)

  // ── Load saved settings ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const d = JSON.parse(raw)
        if (d.certType) setCertType(d.certType)
        if (d.courseName) setCourseName(d.courseName)
        if (d.position) setPosition(d.position)
        if (d.eventName) setEventName(d.eventName)
        if (d.signatureLabel) setSignatureLabel(d.signatureLabel)
        if (d.accentColor) setAccentColor(d.accentColor)
        if (d.goldColor) setGoldColor(d.goldColor)
      }
    } catch {}
    hydrated.current = true
  }, [])

  // ── Save settings on change ──
  useEffect(() => {
    if (!hydrated.current) return
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          certType, courseName, position, eventName,
          signatureLabel, accentColor, goldColor,
        })
      )
    } catch {}
  }, [certType, courseName, position, eventName, signatureLabel, accentColor, goldColor])

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

  // ── Filtered students ──
  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase()
    return students
      .filter((s) => {
        if (grade && !sameGrade(s.grade, grade)) return false
        if (section && !sameText(s.section, section)) return false
        if (session && !sameText(s.session, session)) return false
        if (q) {
          const hay = [s.name, s.fatherName, s.rollNo]
            .map((v) => String(v ?? '').toLowerCase())
            .join(' ')
          if (!hay.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => toNum(a.rollNo) - toNum(b.rollNo))
  }, [students, grade, section, session, search])

  // ── Selected student ──
  const selectedStudent = useMemo(
    () => students.find((s) => studentKey(s) === selectedStudentId) || null,
    [students, selectedStudentId]
  )

  // Auto-select first student when filters change
  useEffect(() => {
    if (!selectedStudentId && filteredStudents.length) {
      setSelectedStudentId(studentKey(filteredStudents[0]))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredStudents.length])

  // ── Auto-fill body text when student or cert type changes ──
  useEffect(() => {
    if (!selectedStudent) return
    const fn = DEFAULT_BODIES[certType]
    if (fn) {
      let text = fn(selectedStudent, school)
      if (certType === 'course') text = text.replace('[COURSE_NAME]', courseName || 'the')
      if (certType === 'merit') text = text.replace('[POSITION]', position || '1st')
      if (certType === 'participation') text = text.replace('[EVENT_NAME]', eventName || 'the event')
      setBodyText(text)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudentId, certType, courseName, position, eventName, school.name])

  // ── Regenerate serial when cert type changes ──
  useEffect(() => {
    setSerial(serialNumber(certType.slice(0, 4).toUpperCase()))
  }, [certType])

  // ── Print / Download PDF ──
  const handlePrint = () => {
    if (!selectedStudent) {
      toast.error('Please select a student first')
      return
    }
    const win = window.open('', '_blank', 'width=1000,height=800')
    if (!win) {
      toast.error('Please allow pop-ups to print')
      return
    }

    const ctype = certTypes.find((c) => c.id === certType) || certTypes[0]
    const title = ctype.name.toUpperCase()

    const logoHtml = school.logo
      ? `<img src="${esc(school.logo)}" alt="" style="width:22mm;height:22mm;object-fit:contain;border-radius:3mm;background:#fff;padding:1mm;box-sizing:border-box;" />`
      : ''

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<title>${esc(title)} — ${esc(selectedStudent.name)}</title>
<style>
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  html, body { margin: 0; padding: 0; background: #fff; }
  .cert {
    width: 297mm; height: 210mm;
    padding: 10mm;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    position: relative;
    font-family: Georgia, 'Times New Roman', serif;
    color: #1e293b;
    overflow: hidden;
  }
  .cert::before {
    content: '';
    position: absolute;
    inset: 6mm;
    border: 1.2mm solid ${accentColor};
    border-radius: 3mm;
    pointer-events: none;
  }
  .cert::after {
    content: '';
    position: absolute;
    inset: 8.5mm;
    border: 0.4mm solid ${goldColor};
    border-radius: 2mm;
    pointer-events: none;
  }
  .content {
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 8mm 12mm;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 8mm;
    padding-bottom: 5mm;
    border-bottom: 0.6mm solid ${accentColor};
  }
  .head .info { flex: 1; }
  .head .name {
    font-size: 24pt;
    font-weight: 800;
    color: ${accentColor};
    text-transform: uppercase;
    letter-spacing: 0.5mm;
    line-height: 1.1;
    font-family: Georgia, serif;
  }
  .head .addr { font-size: 10pt; color: #475569; margin-top: 1.5mm; font-family: 'Segoe UI', Arial, sans-serif; }
  .head .meta { text-align: right; font-family: 'Segoe UI', Arial, sans-serif; }
  .head .meta .label { font-size: 8pt; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.4mm; }
  .head .meta .value { font-size: 10pt; font-weight: 700; color: #1e293b; margin-top: 0.5mm; }

  .title-wrap { text-align: center; margin: 7mm 0 5mm; }
  .title {
    display: inline-block;
    font-size: 28pt;
    font-weight: 800;
    letter-spacing: 2mm;
    color: ${accentColor};
    text-transform: uppercase;
    font-family: Georgia, serif;
    padding-bottom: 3mm;
    border-bottom: 0.7mm solid ${goldColor};
  }
  .subtitle {
    font-size: 11pt;
    color: #64748b;
    letter-spacing: 1mm;
    margin-top: 3mm;
    font-family: 'Segoe UI', Arial, sans-serif;
  }

  .body {
    flex: 1;
    font-size: 13pt;
    line-height: 1.9;
    color: #1e293b;
    margin: 2mm 0;
    text-align: justify;
    font-family: Georgia, serif;
  }
  .body .student {
    font-weight: 800;
    color: ${accentColor};
    border-bottom: 0.3mm dotted ${accentColor};
    padding: 0 1mm;
  }

  .foot {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding-top: 4mm;
    border-top: 0.4mm solid #cbd5e1;
    font-family: 'Segoe UI', Arial, sans-serif;
    margin-top: 4mm;
  }
  .foot .col { text-align: center; min-width: 50mm; }
  .foot .sig-line {
    width: 50mm;
    border-top: 0.4mm solid #1e293b;
    padding-top: 1.5mm;
    font-size: 10pt;
    font-weight: 700;
    color: #1e293b;
  }
  .foot .small { font-size: 8pt; color: #64748b; margin-top: 1mm; }
  .foot .seal {
    width: 30mm;
    height: 30mm;
    border: 1mm dashed ${accentColor};
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 7pt;
    color: ${accentColor};
    font-weight: 700;
    text-transform: uppercase;
    text-align: center;
    letter-spacing: 0.3mm;
    opacity: 0.6;
  }

  .serial {
    position: absolute;
    bottom: 12mm;
    right: 16mm;
    font-size: 8pt;
    color: #94a3b8;
    font-family: 'Courier New', monospace;
    letter-spacing: 0.5mm;
  }

  .badge {
    position: absolute;
    top: 12mm;
    right: 16mm;
    background: ${goldColor};
    color: #1e293b;
    padding: 1.5mm 3mm;
    font-size: 8pt;
    font-weight: 800;
    letter-spacing: 0.6mm;
    text-transform: uppercase;
    border-radius: 2mm;
    font-family: 'Segoe UI', Arial, sans-serif;
  }
</style></head>
<body>
<div class="cert">
  <div class="badge">${esc(title)}</div>
  <div class="content">
    <div class="head">
      ${logoHtml}
      <div class="info">
        <div class="name">${esc(school.name || 'School Name')}</div>
        ${school.address ? `<div class="addr">${esc(school.address)}</div>` : ''}
        ${school.phone ? `<div class="addr">Phone: ${esc(school.phone)}</div>` : ''}
      </div>
      <div class="meta">
        <div class="label">Session</div>
        <div class="value">${esc(selectedStudent.session || session || '—')}</div>
        <div class="label" style="margin-top:2mm;">Date of Issue</div>
        <div class="value">${esc(issueDate)}</div>
      </div>
    </div>

    <div class="title-wrap">
      <div class="title">Certificate</div>
      <div class="subtitle">${esc(ctype.name)}</div>
    </div>

    <div class="body">${esc(bodyText).replace(/\n/g, '<br/>')}</div>

    <div class="foot">
      <div class="col">
        <div class="sig-line">${esc(signatureLabel || 'Principal')}</div>
        <div class="small">Signature & Seal</div>
      </div>
      <div class="seal">${esc(school.name || 'School')}<br/>Official Seal</div>
      <div class="col">
        <div class="sig-line">${esc(issueDate)}</div>
        <div class="small">Date of Issue</div>
      </div>
    </div>
  </div>
  <div class="serial">SERIAL: ${esc(serial)}</div>
</div>
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
    : 'from-rose-500 to-pink-600'

  return (
    <div className="p-7">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${accent} text-white flex items-center justify-center shadow`}>
            <ScrollText size={22} />
          </div>
          <div>
            <h2 className="font-bold text-2xl leading-tight">Certificates</h2>
            <p className="text-xs text-slate-500">
              Generate professional certificates for students — print or download PDF
            </p>
          </div>
        </div>

        <Button
          onClick={handlePrint}
          disabled={!selectedStudent}
          className="bg-rose-600 hover:bg-rose-700 text-white gap-2"
        >
          <Printer size={16} /> Print / Save PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6 items-start">
        {/* ── LEFT PANEL ── */}
        <div className="space-y-4">
          {/* 1. Certificate type */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-bold text-slate-800 mb-3">1. Certificate type</h3>
            <div className="grid grid-cols-2 gap-2">
              {certTypes.map((c) => {
                const Icon = c.icon
                const active = certType === c.id
                return (
                  <button
                    key={c.id}
                    onClick={() => setCertType(c.id)}
                    className={`flex flex-col items-start gap-1.5 p-3 rounded-xl border-2 transition text-left ${
                      active
                        ? `border-transparent bg-gradient-to-br ${c.color} text-white shadow`
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="text-xs font-bold leading-tight">{c.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 2. Student filter */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-bold text-slate-800 mb-3">2. Choose student</h3>

            <div className="grid grid-cols-3 gap-2 mb-3">
              <div>
                <label className={LABEL}>Class</label>
                <select className={INPUT} value={grade} onChange={(e) => setGrade(e.target.value)}>
                  <option value="">All</option>
                  {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Section</label>
                <select className={INPUT} value={section} onChange={(e) => setSection(e.target.value)}>
                  <option value="">All</option>
                  {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Session</label>
                <select className={INPUT} value={session} onChange={(e) => setSession(e.target.value)}>
                  <option value="">All</option>
                  {sessionOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 mb-3 bg-white">
              <Search size={14} className="text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, roll no…"
                className="flex-1 outline-none text-sm bg-transparent"
              />
            </div>

            <label className={LABEL}>Select student</label>
            {loading ? (
              <div className="py-6 text-center text-sm text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin text-rose-600 mx-auto" />
              </div>
            ) : filteredStudents.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">
                No students match these filters
              </p>
            ) : (
              <select
                className={INPUT}
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
              >
                <option value="">— choose a student —</option>
                {filteredStudents.map((s) => (
                  <option key={studentKey(s)} value={studentKey(s)}>
                    {s.rollNo ? `[${s.rollNo}] ` : ''}{s.name}
                    {s.fatherName ? ` s/o ${s.fatherName}` : ''}
                  </option>
                ))}
              </select>
            )}

            {selectedStudent && (
              <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-1">
                <div><b className="text-slate-800">Name:</b> {selectedStudent.name}</div>
                <div><b className="text-slate-800">Father:</b> {selectedStudent.fatherName || '—'}</div>
                <div><b className="text-slate-800">Roll No:</b> {selectedStudent.rollNo || '—'}</div>
                <div><b className="text-slate-800">Class:</b> {selectedStudent.grade || '—'}{selectedStudent.section ? ' - ' + selectedStudent.section : ''}</div>
                <div><b className="text-slate-800">Session:</b> {selectedStudent.session || '—'}</div>
              </div>
            )}
          </div>

          {/* 3. Customize */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-bold text-slate-800 mb-3">3. Customize certificate</h3>

            {certType === 'course' && (
              <div className="mb-3">
                <label className={LABEL}>Course name</label>
                <input
                  className={INPUT}
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="MS Word, MS Excel, Web Development…"
                />
              </div>
            )}

            {certType === 'merit' && (
              <div className="mb-3">
                <label className={LABEL}>Position</label>
                <select className={INPUT} value={position} onChange={(e) => setPosition(e.target.value)}>
                  <option value="1st">1st</option>
                  <option value="2nd">2nd</option>
                  <option value="3rd">3rd</option>
                  <option value="4th">4th</option>
                  <option value="5th">5th</option>
                </select>
              </div>
            )}

            {certType === 'participation' && (
              <div className="mb-3">
                <label className={LABEL}>Event name</label>
                <input
                  className={INPUT}
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="Annual Function, Sports Day…"
                />
              </div>
            )}

            <label className={LABEL}>Certificate body (auto-generated, edit as needed)</label>
            <textarea
              className={INPUT + ' mb-3'}
              rows={6}
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={LABEL}>Signature label</label>
                <input
                  className={INPUT}
                  value={signatureLabel}
                  onChange={(e) => setSignatureLabel(e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL}>Issue date</label>
                <input
                  className={INPUT}
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Accent color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-9 h-9 rounded border border-slate-300 cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    className={INPUT}
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className={LABEL}>Gold color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={goldColor}
                    onChange={(e) => setGoldColor(e.target.value)}
                    className="w-9 h-9 rounded border border-slate-300 cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    className={INPUT}
                    value={goldColor}
                    onChange={(e) => setGoldColor(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={() => setSerial(serialNumber(certType.slice(0, 4).toUpperCase()))}
              variant="outline"
              className="w-full gap-2 mt-3"
            >
              <RotateCcw size={14} /> Regenerate Serial
            </Button>
          </div>
        </div>

        {/* ── RIGHT PANEL: LIVE PREVIEW ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Live Preview
              </span>
              <span className="text-[11px] text-slate-400">
                — {certTypes.find((c) => c.id === certType)?.name}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">#{serial}</div>
          </div>

          {!selectedStudent ? (
            <div className="rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 p-16 text-center">
              <ScrollText size={40} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                Select a student on the left to preview the certificate
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-slate-100 p-4 overflow-auto" style={{ maxHeight: '80vh' }}>
              <div
                className="mx-auto bg-white shadow-xl"
                style={{
                  width: '297mm',
                  height: '210mm',
                  transform: 'scale(0.62)',
                  transformOrigin: 'top center',
                  marginBottom: '-80mm',
                  border: `1.2mm solid ${accentColor}`,
                  borderRadius: '3mm',
                  position: 'relative',
                  overflow: 'hidden',
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  padding: '10mm',
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: '2.5mm',
                    border: `0.4mm solid ${goldColor}`,
                    borderRadius: '2mm',
                    pointerEvents: 'none',
                  }}
                />

                {/* Badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: '10mm',
                    right: '14mm',
                    background: goldColor,
                    color: '#1e293b',
                    padding: '1.5mm 3mm',
                    fontSize: '8pt',
                    fontWeight: 800,
                    letterSpacing: '0.6mm',
                    textTransform: 'uppercase',
                    borderRadius: '2mm',
                    fontFamily: "'Segoe UI', Arial, sans-serif",
                  }}
                >
                  {certTypes.find((c) => c.id === certType)?.name}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '4mm 8mm', position: 'relative' }}>
                  {/* Head */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5mm', paddingBottom: '3mm', borderBottom: `0.6mm solid ${accentColor}` }}>
                    {school.logo && (
                      <img
                        src={school.logo}
                        alt=""
                        style={{ width: '20mm', height: '20mm', objectFit: 'contain', borderRadius: '3mm' }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '18pt', fontWeight: 800, color: accentColor, textTransform: 'uppercase', lineHeight: 1.1 }}>
                        {school.name || 'School Name'}
                      </div>
                      {school.address && (
                        <div style={{ fontSize: '9pt', color: '#475569', marginTop: '1mm', fontFamily: "'Segoe UI', Arial, sans-serif" }}>
                          {school.address}
                        </div>
                      )}
                      {school.phone && (
                        <div style={{ fontSize: '9pt', color: '#64748b', fontFamily: "'Segoe UI', Arial, sans-serif" }}>
                          Phone: {school.phone}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', fontFamily: "'Segoe UI', Arial, sans-serif" }}>
                      <div style={{ fontSize: '7.5pt', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4mm' }}>Session</div>
                      <div style={{ fontSize: '9pt', fontWeight: 700, color: '#1e293b' }}>{selectedStudent.session || session || '—'}</div>
                      <div style={{ fontSize: '7.5pt', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4mm', marginTop: '1.5mm' }}>Date</div>
                      <div style={{ fontSize: '9pt', fontWeight: 700, color: '#1e293b' }}>{issueDate}</div>
                    </div>
                  </div>

                  {/* Title */}
                  <div style={{ textAlign: 'center', margin: '4mm 0 3mm' }}>
                    <div style={{ display: 'inline-block', fontSize: '22pt', fontWeight: 800, letterSpacing: '2mm', color: accentColor, textTransform: 'uppercase', paddingBottom: '2mm', borderBottom: `0.7mm solid ${goldColor}` }}>
                      Certificate
                    </div>
                    <div style={{ fontSize: '9pt', color: '#64748b', letterSpacing: '1mm', marginTop: '2mm', fontFamily: "'Segoe UI', Arial, sans-serif", textTransform: 'uppercase' }}>
                      {certTypes.find((c) => c.id === certType)?.name}
                    </div>
                  </div>

                  {/* Body */}
                  <div
                    style={{
                      flex: 1,
                      fontSize: '11pt',
                      lineHeight: 1.85,
                      color: '#1e293b',
                      textAlign: 'justify',
                    }}
                    dangerouslySetInnerHTML={{ __html: esc(bodyText).replace(/\n/g, '<br/>') }}
                  />

                  {/* Footer */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: '3mm', borderTop: '0.4mm solid #cbd5e1', marginTop: '3mm', fontFamily: "'Segoe UI', Arial, sans-serif" }}>
                    <div style={{ textAlign: 'center', minWidth: '45mm' }}>
                      <div style={{ width: '45mm', borderTop: '0.4mm solid #1e293b', paddingTop: '1.2mm', fontSize: '9pt', fontWeight: 700, color: '#1e293b' }}>
                        {signatureLabel || 'Principal'}
                      </div>
                      <div style={{ fontSize: '7.5pt', color: '#64748b', marginTop: '1mm' }}>Signature &amp; Seal</div>
                    </div>

                    <div
                      style={{
                        width: '26mm',
                        height: '26mm',
                        border: `0.9mm dashed ${accentColor}`,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '6.5pt',
                        color: accentColor,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        textAlign: 'center',
                        letterSpacing: '0.3mm',
                        opacity: 0.65,
                        padding: '2mm',
                        boxSizing: 'border-box',
                        lineHeight: 1.3,
                      }}
                    >
                      {school.name || 'School'}<br />Official Seal
                    </div>

                    <div style={{ textAlign: 'center', minWidth: '45mm' }}>
                      <div style={{ width: '45mm', borderTop: '0.4mm solid #1e293b', paddingTop: '1.2mm', fontSize: '9pt', fontWeight: 700, color: '#1e293b' }}>
                        {issueDate}
                      </div>
                      <div style={{ fontSize: '7.5pt', color: '#64748b', marginTop: '1mm' }}>Date of Issue</div>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    position: 'absolute',
                    bottom: '10mm',
                    right: '14mm',
                    fontSize: '7pt',
                    color: '#94a3b8',
                    fontFamily: "'Courier New', monospace",
                    letterSpacing: '0.5mm',
                  }}
                >
                  SERIAL: {serial}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-3">
            <p className="text-[11px] text-slate-400">
              In the print window, turn on "Background graphics" to keep borders and colors.
            </p>
            <Button onClick={handlePrint} disabled={!selectedStudent} className="gap-2 bg-rose-600 hover:bg-rose-700 text-white">
              <Download size={15} /> Print / Save PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}