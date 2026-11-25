"use client"

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  ScrollText, Printer, Download, Loader2, Search,
  CheckCircle2, Award, GraduationCap, BookOpen, Sparkles,
  RotateCcw, Type, Palette,
} from 'lucide-react'
import GlobalApi from '@/app/_services/GlobalApi'
import { useProgram } from '@/src/context/ProgramContext'

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const STORAGE_KEY = 'certificates_v2_modern'

const GRADES = [
  'Nursery', 'Prep',
  '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th',
]
const SECTIONS = ['A', 'B', 'C']

const INPUT =
  'w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
const LABEL = 'block text-xs font-semibold text-slate-600 mb-1'

const CERT_TYPES = {
  school: [
    { id: 'character', name: 'Character Certificate', icon: CheckCircle2, color: 'from-emerald-500 to-teal-600', accent: '#059669' },
    { id: 'leaving', name: 'Leaving Certificate', icon: GraduationCap, color: 'from-blue-500 to-indigo-600', accent: '#2563eb' },
    { id: 'course', name: 'Course Completion', icon: BookOpen, color: 'from-amber-500 to-orange-600', accent: '#d97706' },
    { id: 'merit', name: 'Merit / Position', icon: Award, color: 'from-rose-500 to-pink-600', accent: '#e11d48' },
    { id: 'participation', name: 'Participation', icon: Sparkles, color: 'from-violet-500 to-purple-600', accent: '#7c3aed' },
  ],
  academy: [
    { id: 'course', name: 'Course Completion', icon: BookOpen, color: 'from-violet-500 to-purple-600', accent: '#7c3aed' },
    { id: 'character', name: 'Character Certificate', icon: CheckCircle2, color: 'from-emerald-500 to-teal-600', accent: '#059669' },
    { id: 'leaving', name: 'Leaving Certificate', icon: GraduationCap, color: 'from-blue-500 to-indigo-600', accent: '#2563eb' },
  ],
}

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

  const [school, setSchool] = useState({ name: '', address: '', phone: '', logo: '' })
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

  const [grade, setGrade] = useState('')
  const [section, setSection] = useState('')
  const [session, setSession] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [search, setSearch] = useState('')

  const [certType, setCertType] = useState(certTypes[0].id)
  const [courseName, setCourseName] = useState('MS Word')
  const [position, setPosition] = useState('1st')
  const [eventName, setEventName] = useState('Annual Function')
  const [bodyText, setBodyText] = useState('')
  const [signatureLabel, setSignatureLabel] = useState('Principal')
  const [issueDate, setIssueDate] = useState(fmtDate())
  const [serial, setSerial] = useState(serialNumber())
  const [accentColor, setAccentColor] = useState(isAcademy ? '#7c3aed' : '#2563eb')
  const [goldColor, setGoldColor] = useState('#f59e0b')

  const hydrated = useRef(false)

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

  const sessionOptions = useMemo(() => {
    const setS = new Set()
    students.forEach((s) => { if (s.session) setS.add(String(s.session).trim()) })
    return Array.from(setS).sort()
  }, [students])

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

  const selectedStudent = useMemo(
    () => students.find((s) => studentKey(s) === selectedStudentId) || null,
    [students, selectedStudentId]
  )

  useEffect(() => {
    if (!selectedStudentId && filteredStudents.length) {
      setSelectedStudentId(studentKey(filteredStudents[0]))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredStudents.length])

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

  useEffect(() => {
    setSerial(serialNumber(certType.slice(0, 4).toUpperCase()))
  }, [certType])

  // ─────────────────────────────────────────────
  // PRINT / PDF — modern clean layout
  // ─────────────────────────────────────────────
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
    const title = ctype.name
    const s = selectedStudent

    const logoHtml = school.logo
      ? `<img src="${esc(school.logo)}" alt="" style="width:20mm;height:20mm;object-fit:contain;border-radius:3mm;" />`
      : `<div style="width:20mm;height:20mm;border-radius:3mm;background:linear-gradient(135deg,${accentColor},${goldColor});display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:22pt;font-family:'Segoe UI',sans-serif;">${esc((school.name || 'S').charAt(0))}</div>`

    // Info grid rows
    const infoItems = [
      { label: 'Roll No', value: s.rollNo || '—' },
      { label: 'Father Name', value: s.fatherName || '—' },
      { label: 'Class', value: `${s.grade || '—'}${s.section ? ' - ' + s.section : ''}` },
      { label: 'Session', value: s.session || session || '—' },
    ]

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<title>${esc(title)} — ${esc(s.name)}</title>
<style>
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  html, body { margin: 0; padding: 0; background: #fff; font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; color: #0f172a; }
  .cert {
    width: 297mm; height: 210mm;
    position: relative;
    overflow: hidden;
    background: #ffffff;
    padding: 12mm;
    display: flex;
    flex-direction: column;
  }
  /* Corner decorations */
  .cert .corner {
    position: absolute;
    width: 40mm; height: 40mm;
    border-radius: 50%;
    opacity: 0.08;
  }
  .cert .corner.tl { top: -18mm; left: -18mm; background: ${accentColor}; }
  .cert .corner.tr { top: -18mm; right: -18mm; background: ${goldColor}; }
  .cert .corner.bl { bottom: -18mm; left: -18mm; background: ${goldColor}; }
  .cert .corner.br { bottom: -18mm; right: -18mm; background: ${accentColor}; }

  /* Header */
  .head {
    position: relative;
    display: flex;
    align-items: center;
    gap: 6mm;
    padding-bottom: 6mm;
    border-bottom: 0.5mm solid #e2e8f0;
  }
  .head .school-block { flex: 1; min-width: 0; }
  .head .school-name {
    font-size: 22pt;
    font-weight: 800;
    color: ${accentColor};
    line-height: 1.1;
    letter-spacing: -0.2mm;
    text-transform: uppercase;
  }
  .head .school-sub {
    font-size: 9pt;
    color: #64748b;
    margin-top: 1.5mm;
    line-height: 1.5;
  }
  .head .meta-block { text-align: right; }
  .head .meta-block .meta-label {
    font-size: 7.5pt;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5mm;
    font-weight: 700;
  }
  .head .meta-block .meta-value {
    font-size: 10pt;
    color: #0f172a;
    font-weight: 700;
    margin-top: 0.5mm;
  }

  /* Title bar */
  .title-bar {
    text-align: center;
    padding: 6mm 0 5mm;
    position: relative;
  }
  .title-badge {
    display: inline-block;
    font-size: 8pt;
    font-weight: 800;
    letter-spacing: 2mm;
    text-transform: uppercase;
    color: ${accentColor};
    background: ${accentColor}14;
    padding: 1.5mm 4mm;
    border-radius: 10mm;
    margin-bottom: 3mm;
  }
  .title-main {
    font-size: 34pt;
    font-weight: 900;
    letter-spacing: 1.5mm;
    color: #0f172a;
    text-transform: uppercase;
    line-height: 1;
    margin: 0;
    letter-spacing: 2mm;
  }
  .title-main .accent { color: ${accentColor}; }
  .title-divider {
    width: 30mm;
    height: 1mm;
    background: linear-gradient(90deg, ${accentColor}, ${goldColor});
    margin: 3mm auto 0;
    border-radius: 1mm;
  }

  /* Presented-to block */
  .presented {
    text-align: center;
    margin-top: 4mm;
  }
  .presented .label {
    font-size: 9pt;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 1mm;
    font-weight: 700;
  }
  .presented .student-name {
    font-size: 26pt;
    font-weight: 800;
    color: ${accentColor};
    margin-top: 2mm;
    line-height: 1.15;
    letter-spacing: 0.3mm;
  }
  .presented .student-name::after {
    content: '';
    display: block;
    width: 80mm;
    height: 0.6mm;
    background: ${goldColor};
    margin: 3mm auto 0;
    border-radius: 1mm;
  }

  /* Info grid */
  .info-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 3mm;
    margin-top: 6mm;
    padding: 4mm 5mm;
    background: #f8fafc;
    border-radius: 3mm;
    border: 0.3mm solid #e2e8f0;
  }
  .info-cell { text-align: center; }
  .info-cell .k {
    font-size: 7.5pt;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.4mm;
    font-weight: 700;
  }
  .info-cell .v {
    font-size: 11pt;
    color: #0f172a;
    font-weight: 700;
    margin-top: 1mm;
    word-break: break-word;
  }

  /* Body */
  .body {
    flex: 1;
    margin-top: 5mm;
    font-size: 12pt;
    line-height: 1.8;
    color: #334155;
    text-align: center;
    padding: 0 8mm;
  }
  .body p { margin: 0; }
  .body strong { color: ${accentColor}; font-weight: 800; }

  /* Footer */
  .foot {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding-top: 4mm;
    margin-top: 4mm;
    border-top: 0.5mm solid #e2e8f0;
  }
  .foot .sig-block { text-align: center; min-width: 45mm; }
  .foot .sig-line {
    width: 45mm;
    border-top: 0.4mm solid #0f172a;
    padding-top: 1.5mm;
    font-size: 10pt;
    font-weight: 700;
    color: #0f172a;
    margin: 0 auto;
  }
  .foot .sig-label {
    font-size: 8pt;
    color: #64748b;
    margin-top: 1mm;
    text-transform: uppercase;
    letter-spacing: 0.4mm;
  }
  .foot .seal {
    width: 28mm;
    height: 28mm;
    border: 0.7mm dashed ${accentColor};
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-size: 6.5pt;
    color: ${accentColor};
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.3mm;
    line-height: 1.3;
    opacity: 0.75;
    padding: 3mm;
  }
  .foot .date-block { text-align: center; min-width: 45mm; }
  .foot .date-value {
    font-size: 10pt;
    font-weight: 700;
    color: #0f172a;
  }
  .foot .date-label {
    font-size: 8pt;
    color: #64748b;
    margin-top: 1mm;
    text-transform: uppercase;
    letter-spacing: 0.4mm;
  }

  .serial {
    position: absolute;
    bottom: 8mm;
    right: 14mm;
    font-size: 7pt;
    color: #94a3b8;
    font-family: 'Courier New', monospace;
    letter-spacing: 0.4mm;
    font-weight: 600;
  }
</style></head>
<body>
<div class="cert">
  <div class="corner tl"></div>
  <div class="corner tr"></div>
  <div class="corner bl"></div>
  <div class="corner br"></div>

  <div class="head">
    ${logoHtml}
    <div class="school-block">
      <div class="school-name">${esc(school.name || 'School Name')}</div>
      <div class="school-sub">
        ${school.address ? esc(school.address) : ''}${school.address && school.phone ? ' &nbsp;•&nbsp; ' : ''}${school.phone ? 'Ph: ' + esc(school.phone) : ''}
      </div>
    </div>
    <div class="meta-block">
      <div class="meta-label">Serial No.</div>
      <div class="meta-value">${esc(serial)}</div>
      <div class="meta-label" style="margin-top:2.5mm;">Issue Date</div>
      <div class="meta-value">${esc(issueDate)}</div>
    </div>
  </div>

  <div class="title-bar">
    <div class="title-badge">${esc(title)}</div>
    <h1 class="title-main">Certificate <span class="accent">of</span> Achievement</h1>
    <div class="title-divider"></div>
  </div>

  <div class="presented">
    <div class="label">This certificate is proudly presented to</div>
    <div class="student-name">${esc(s.name || 'Student Name')}</div>
  </div>

  <div class="info-grid">
    ${infoItems.map((it) => `
      <div class="info-cell">
        <div class="k">${esc(it.label)}</div>
        <div class="v">${esc(it.value)}</div>
      </div>
    `).join('')}
  </div>

  <div class="body">
    <p>${esc(bodyText).replace(/\n/g, '<br/>')}</p>
  </div>

  <div class="foot">
    <div class="sig-block">
      <div class="sig-line">${esc(signatureLabel || 'Principal')}</div>
      <div class="sig-label">Signature &amp; Seal</div>
    </div>
    <div class="seal">
      ${esc(school.name || 'School')}<br/>Official Seal
    </div>
    <div class="date-block">
      <div class="date-value">${esc(issueDate)}</div>
      <div class="date-label">Date of Issue</div>
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
  // LIVE PREVIEW — modern layout, same as print
  // ─────────────────────────────────────────────
  const Preview = () => {
    if (!selectedStudent) {
      return (
        <div className="rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 p-16 text-center">
          <ScrollText size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">
            Select a student on the left to preview the certificate
          </p>
        </div>
      )
    }

    const s = selectedStudent
    const ctype = certTypes.find((c) => c.id === certType) || certTypes[0]
    const infoItems = [
      { label: 'Roll No', value: s.rollNo || '—' },
      { label: 'Father Name', value: s.fatherName || '—' },
      { label: 'Class', value: `${s.grade || '—'}${s.section ? ' - ' + s.section : ''}` },
      { label: 'Session', value: s.session || session || '—' },
    ]

    return (
      <div
        className="rounded-xl bg-slate-100 p-4 overflow-auto"
        style={{ maxHeight: '80vh' }}
      >
        <div
          style={{
            width: '297mm',
            height: '210mm',
            transform: 'scale(0.62)',
            transformOrigin: 'top center',
            marginBottom: '-80mm',
            background: '#ffffff',
            padding: '12mm',
            boxSizing: 'border-box',
            position: 'relative',
            overflow: 'hidden',
            fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
            color: '#0f172a',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 10px 40px rgba(15,23,42,0.15)',
            borderRadius: '2mm',
          }}
        >
          {/* Corner decorations */}
          <div style={{ position: 'absolute', top: '-18mm', left: '-18mm', width: '40mm', height: '40mm', borderRadius: '50%', background: accentColor, opacity: 0.08 }} />
          <div style={{ position: 'absolute', top: '-18mm', right: '-18mm', width: '40mm', height: '40mm', borderRadius: '50%', background: goldColor, opacity: 0.08 }} />
          <div style={{ position: 'absolute', bottom: '-18mm', left: '-18mm', width: '40mm', height: '40mm', borderRadius: '50%', background: goldColor, opacity: 0.08 }} />
          <div style={{ position: 'absolute', bottom: '-18mm', right: '-18mm', width: '40mm', height: '40mm', borderRadius: '50%', background: accentColor, opacity: 0.08 }} />

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6mm', paddingBottom: '6mm', borderBottom: '0.5mm solid #e2e8f0', position: 'relative' }}>
            {school.logo ? (
              <img src={school.logo} alt="" style={{ width: '20mm', height: '20mm', objectFit: 'contain', borderRadius: '3mm' }} />
            ) : (
              <div style={{ width: '20mm', height: '20mm', borderRadius: '3mm', background: `linear-gradient(135deg, ${accentColor}, ${goldColor})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '22pt' }}>
                {(school.name || 'S').charAt(0)}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '22pt', fontWeight: 800, color: accentColor, lineHeight: 1.1, letterSpacing: '-0.2mm', textTransform: 'uppercase' }}>
                {school.name || 'School Name'}
              </div>
              <div style={{ fontSize: '9pt', color: '#64748b', marginTop: '1.5mm', lineHeight: 1.5 }}>
                {school.address || ''}{school.address && school.phone ? '  •  ' : ''}{school.phone ? `Ph: ${school.phone}` : ''}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '7.5pt', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5mm', fontWeight: 700 }}>
                Serial No.
              </div>
              <div style={{ fontSize: '10pt', color: '#0f172a', fontWeight: 700, marginTop: '0.5mm' }}>
                {serial}
              </div>
              <div style={{ fontSize: '7.5pt', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5mm', fontWeight: 700, marginTop: '2.5mm' }}>
                Issue Date
              </div>
              <div style={{ fontSize: '10pt', color: '#0f172a', fontWeight: 700, marginTop: '0.5mm' }}>
                {issueDate}
              </div>
            </div>
          </div>

          {/* Title bar */}
          <div style={{ textAlign: 'center', padding: '6mm 0 5mm', position: 'relative' }}>
            <div style={{ display: 'inline-block', fontSize: '8pt', fontWeight: 800, letterSpacing: '2mm', textTransform: 'uppercase', color: accentColor, background: `${accentColor}14`, padding: '1.5mm 4mm', borderRadius: '10mm', marginBottom: '3mm' }}>
              {ctype.name}
            </div>
            <h1 style={{ fontSize: '34pt', fontWeight: 900, letterSpacing: '2mm', color: '#0f172a', textTransform: 'uppercase', lineHeight: 1, margin: 0 }}>
              Certificate <span style={{ color: accentColor }}>of</span> Achievement
            </h1>
            <div style={{ width: '30mm', height: '1mm', background: `linear-gradient(90deg, ${accentColor}, ${goldColor})`, margin: '3mm auto 0', borderRadius: '1mm' }} />
          </div>

          {/* Presented to */}
          <div style={{ textAlign: 'center', marginTop: '4mm' }}>
            <div style={{ fontSize: '9pt', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1mm', fontWeight: 700 }}>
              This certificate is proudly presented to
            </div>
            <div style={{ fontSize: '26pt', fontWeight: 800, color: accentColor, marginTop: '2mm', lineHeight: 1.15, letterSpacing: '0.3mm' }}>
              {s.name || 'Student Name'}
            </div>
            <div style={{ width: '80mm', height: '0.6mm', background: goldColor, margin: '3mm auto 0', borderRadius: '1mm' }} />
          </div>

          {/* Info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '3mm', marginTop: '6mm', padding: '4mm 5mm', background: '#f8fafc', borderRadius: '3mm', border: '0.3mm solid #e2e8f0' }}>
            {infoItems.map((it) => (
              <div key={it.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '7.5pt', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4mm', fontWeight: 700 }}>
                  {it.label}
                </div>
                <div style={{ fontSize: '11pt', color: '#0f172a', fontWeight: 700, marginTop: '1mm', wordBreak: 'break-word' }}>
                  {it.value}
                </div>
              </div>
            ))}
          </div>

          {/* Body */}
          <div style={{ flex: 1, marginTop: '5mm', fontSize: '12pt', lineHeight: 1.8, color: '#334155', textAlign: 'center', padding: '0 8mm' }}>
            {bodyText}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: '4mm', marginTop: '4mm', borderTop: '0.5mm solid #e2e8f0' }}>
            <div style={{ textAlign: 'center', minWidth: '45mm' }}>
              <div style={{ width: '45mm', borderTop: '0.4mm solid #0f172a', paddingTop: '1.5mm', fontSize: '10pt', fontWeight: 700, color: '#0f172a', margin: '0 auto' }}>
                {signatureLabel || 'Principal'}
              </div>
              <div style={{ fontSize: '8pt', color: '#64748b', marginTop: '1mm', textTransform: 'uppercase', letterSpacing: '0.4mm' }}>
                Signature &amp; Seal
              </div>
            </div>
            <div style={{ width: '28mm', height: '28mm', border: `0.7mm dashed ${accentColor}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '6.5pt', color: accentColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3mm', lineHeight: 1.3, opacity: 0.75, padding: '3mm', boxSizing: 'border-box' }}>
              {school.name || 'School'}<br />Official Seal
            </div>
            <div style={{ textAlign: 'center', minWidth: '45mm' }}>
              <div style={{ fontSize: '10pt', fontWeight: 700, color: '#0f172a' }}>{issueDate}</div>
              <div style={{ fontSize: '8pt', color: '#64748b', marginTop: '1mm', textTransform: 'uppercase', letterSpacing: '0.4mm' }}>
                Date of Issue
              </div>
            </div>
          </div>

          {/* Serial */}
          <div style={{ position: 'absolute', bottom: '8mm', right: '14mm', fontSize: '7pt', color: '#94a3b8', fontFamily: "'Courier New', monospace", letterSpacing: '0.4mm', fontWeight: 600 }}>
            SERIAL: {serial}
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────
  const accent = isAcademy
    ? 'from-violet-500 to-purple-600'
    : 'from-indigo-500 to-blue-600'

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
              Generate modern, professional certificates — print or save as PDF
            </p>
          </div>
        </div>

        <Button
          onClick={handlePrint}
          disabled={!selectedStudent}
          className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
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
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600 mx-auto" />
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
                  {['1st', '2nd', '3rd', '4th', '5th'].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
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

            <label className={LABEL}>Certificate body</label>
            <textarea
              className={INPUT + ' mb-3'}
              rows={5}
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

          <Preview />

          <div className="flex items-center justify-between mt-3">
            <p className="text-[11px] text-slate-400">
              In the print window, enable "Background graphics" to keep all colors and borders.
            </p>
            <Button
              onClick={handlePrint}
              disabled={!selectedStudent}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Download size={15} /> Print / Save PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}