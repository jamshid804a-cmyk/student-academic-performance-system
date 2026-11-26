"use client"

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  ScrollText, Printer, Download, Loader2, Search,
  CheckCircle2, Award, GraduationCap, BookOpen, Sparkles,
  RotateCcw, Type, Palette, Image as ImageIcon, Upload, X,
  Crown, Minimize2, LayoutTemplate, Droplets,
} from 'lucide-react'
import GlobalApi from '@/app/_services/GlobalApi'
import { useProgram } from '@/src/context/ProgramContext'

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const STORAGE_KEY = 'certificates_v4_final'

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

const TEMPLATES = [
  { id: 'modern',  name: 'Modern',  desc: 'Clean, corporate',        icon: LayoutTemplate, preview: 'linear-gradient(135deg,#2563eb,#f59e0b)' },
  { id: 'classic', name: 'Classic', desc: 'Ornate, traditional',     icon: BookOpen,        preview: 'linear-gradient(135deg,#7c2d12,#f59e0b)' },
  { id: 'royal',   name: 'Royal',   desc: 'Dark navy + gold',        icon: Crown,           preview: 'linear-gradient(135deg,#0f172a,#d4af37)' },
  { id: 'minimal', name: 'Minimal', desc: 'Thin border, airy',       icon: Minimize2,       preview: 'linear-gradient(135deg,#f1f5f9,#94a3b8)' },
]

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
// Template style builders
// ─────────────────────────────────────────────
function getTemplateStyles(templateId, accentColor, goldColor, bgImage, bgOpacity) {
  const bgLayer = bgImage
    ? `<div class="bg-image" style="position:absolute;inset:0;background-image:url('${bgImage}');background-size:cover;background-position:center;background-repeat:no-repeat;opacity:${bgOpacity};z-index:0;pointer-events:none;"></div>`
    : ''

  const contentWrap = `<div class="content" style="position:relative;z-index:2;width:100%;height:100%;display:flex;flex-direction:column;">`

  if (templateId === 'classic') {
    return {
      bgLayer,
      contentWrap,
      extraCSS: `
        .cert::before {
          content: '';
          position: absolute; inset: 6mm;
          border: 1.2mm double ${goldColor};
          border-radius: 2mm;
          pointer-events: none;
          z-index: 3;
        }
        .cert::after {
          content: '';
          position: absolute; inset: 9mm;
          border: 0.3mm solid ${accentColor};
          border-radius: 1mm;
          pointer-events: none;
          z-index: 3;
        }
        .corner-ornament {
          position: absolute; width: 18mm; height: 18mm;
          z-index: 3; pointer-events: none;
        }
        .corner-ornament.tl { top: 10mm; left: 10mm; border-top: 0.8mm solid ${goldColor}; border-left: 0.8mm solid ${goldColor}; border-top-left-radius: 3mm; }
        .corner-ornament.tr { top: 10mm; right: 10mm; border-top: 0.8mm solid ${goldColor}; border-right: 0.8mm solid ${goldColor}; border-top-right-radius: 3mm; }
        .corner-ornament.bl { bottom: 10mm; left: 10mm; border-bottom: 0.8mm solid ${goldColor}; border-left: 0.8mm solid ${goldColor}; border-bottom-left-radius: 3mm; }
        .corner-ornament.br { bottom: 10mm; right: 10mm; border-bottom: 0.8mm solid ${goldColor}; border-right: 0.8mm solid ${goldColor}; border-bottom-right-radius: 3mm; }
        .cert { padding: 16mm !important; }
      `,
      cornerOrnaments: `
        <div class="corner-ornament tl"></div>
        <div class="corner-ornament tr"></div>
        <div class="corner-ornament bl"></div>
        <div class="corner-ornament br"></div>
      `,
    }
  }

  if (templateId === 'royal') {
    return {
      bgLayer,
      contentWrap,
      extraCSS: `
        .cert {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%) !important;
          color: #f8fafc !important;
        }
        .cert::before {
          content: '';
          position: absolute; inset: 5mm;
          border: 0.8mm solid ${goldColor};
          border-radius: 1mm;
          pointer-events: none; z-index: 3;
        }
        .cert::after {
          content: '';
          position: absolute; inset: 7mm;
          border: 0.2mm solid ${goldColor}80;
          border-radius: 1mm;
          pointer-events: none; z-index: 3;
        }
        .royal-glow {
          position: absolute; width: 80mm; height: 80mm;
          border-radius: 50%; filter: blur(60mm);
          opacity: 0.35; z-index: 1; pointer-events: none;
        }
        .royal-glow.tl { top: -30mm; left: -30mm; background: ${goldColor}; }
        .royal-glow.br { bottom: -30mm; right: -30mm; background: ${accentColor}; }
        .head .school-name { color: ${goldColor} !important; }
        .head .school-sub { color: #94a3b8 !important; }
        .head { border-bottom: 0.5mm solid ${goldColor}60 !important; }
        .head .meta-block .meta-label { color: #94a3b8 !important; }
        .head .meta-block .meta-value { color: #f8fafc !important; }
        .title-badge { color: ${goldColor} !important; background: ${goldColor}20 !important; }
        .title-main { color: #f8fafc !important; }
        .title-main .accent { color: ${goldColor} !important; }
        .presented .label { color: #94a3b8 !important; }
        .presented .student-name { color: ${goldColor} !important; }
        .presented .student-name::after { background: ${accentColor} !important; }
        .info-grid { background: #1e293b !important; border: 0.3mm solid ${goldColor}50 !important; }
        .info-cell .k { color: #94a3b8 !important; }
        .info-cell .v { color: #f8fafc !important; }
        .body { color: #cbd5e1 !important; }
        .body strong { color: ${goldColor} !important; }
        .foot { border-top: 0.5mm solid ${goldColor}60 !important; }
        .foot .sig-line { border-top: 0.4mm solid ${goldColor} !important; color: ${goldColor} !important; }
        .foot .sig-label { color: #94a3b8 !important; }
        .foot .date-value { color: #f8fafc !important; }
        .foot .date-label { color: #94a3b8 !important; }
        .foot .seal { border-color: ${goldColor} !important; color: ${goldColor} !important; }
        .serial { color: ${goldColor}80 !important; }
        .cert { padding: 14mm !important; }
      `,
      cornerOrnaments: `
        <div class="royal-glow tl"></div>
        <div class="royal-glow br"></div>
      `,
    }
  }

  if (templateId === 'minimal') {
    return {
      bgLayer,
      contentWrap,
      extraCSS: `
        .cert::before {
          content: '';
          position: absolute; inset: 8mm;
          border: 0.3mm solid ${accentColor}40;
          pointer-events: none; z-index: 3;
        }
        .head { border-bottom: 0.2mm solid ${accentColor}30 !important; }
        .foot { border-top: 0.2mm solid ${accentColor}30 !important; }
        .title-badge { background: transparent !important; padding: 0 !important; letter-spacing: 3mm !important; }
        .title-main { font-weight: 300 !important; letter-spacing: 3mm !important; font-size: 30pt !important; }
        .title-main .accent { font-weight: 800 !important; color: ${accentColor} !important; }
        .title-divider { width: 20mm !important; height: 0.3mm !important; }
        .info-grid { background: transparent !important; border: none !important; padding: 0 !important; }
        .info-cell { border-left: 0.2mm solid ${accentColor}30; }
        .info-cell:first-child { border-left: none; }
        .cert { padding: 18mm !important; }
      `,
      cornerOrnaments: '',
    }
  }

  return {
    bgLayer,
    contentWrap,
    extraCSS: '',
    cornerOrnaments: `
      <div class="corner tl"></div>
      <div class="corner tr"></div>
      <div class="corner bl"></div>
      <div class="corner br"></div>
    `,
  }
}

// Build watermark markup for both preview & print
function buildWatermark({ watermarkText, watermarkMode, watermarkOpacity, accentColor }) {
  if (!watermarkText) return { printHTML: '', previewNode: null }

  const color = accentColor || '#2563eb'

  if (watermarkMode === 'diagonal') {
    const printHTML = `
      <div class="watermark" style="
        position:absolute; inset:0; z-index:1;
        display:flex; align-items:center; justify-content:center;
        pointer-events:none; overflow:hidden;
      ">
        <div style="
          transform: rotate(-30deg);
          font-size: 90pt;
          font-weight: 900;
          color: ${color};
          opacity: ${watermarkOpacity};
          letter-spacing: 6mm;
          text-transform: uppercase;
          white-space: nowrap;
          text-align: center;
        ">${esc(watermarkText)}</div>
      </div>`
    const previewNode = (
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
          transform: 'rotate(-30deg)',
          fontSize: '90pt',
          fontWeight: 900,
          color,
          opacity: watermarkOpacity,
          letterSpacing: '6mm',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          textAlign: 'center',
        }}>{watermarkText}</div>
      </div>
    )
    return { printHTML, previewNode }
  }

  if (watermarkMode === 'tiled') {
    const printHTML = `
      <div class="watermark" style="
        position:absolute; inset:0; z-index:1;
        pointer-events:none; overflow:hidden;
      ">
        <div style="
          position:absolute; inset:-20%;
          display:grid;
          grid-template-columns: repeat(4, 1fr);
          grid-template-rows: repeat(3, 1fr);
          gap: 6mm;
          transform: rotate(-25deg);
        ">
          ${Array.from({ length: 12 }).map(() => `
            <div style="
              display:flex; align-items:center; justify-content:center;
              font-size: 22pt; font-weight: 800;
              color: ${color};
              opacity: ${watermarkOpacity};
              letter-spacing: 2mm;
              text-transform: uppercase;
              white-space: nowrap;
            ">${esc(watermarkText)}</div>
          `).join('')}
        </div>
      </div>`
    const previewNode = (
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: '-20%',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(3, 1fr)',
          gap: '6mm',
          transform: 'rotate(-25deg)',
        }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22pt', fontWeight: 800,
              color,
              opacity: watermarkOpacity,
              letterSpacing: '2mm',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}>{watermarkText}</div>
          ))}
        </div>
      </div>
    )
    return { printHTML, previewNode }
  }

  // center (default)
  const printHTML = `
    <div class="watermark" style="
      position:absolute; inset:0; z-index:1;
      display:flex; align-items:center; justify-content:center;
      pointer-events:none; overflow:hidden;
    ">
      <div style="
        font-size: 120pt;
        font-weight: 900;
        color: ${color};
        opacity: ${watermarkOpacity};
        letter-spacing: 8mm;
        text-transform: uppercase;
        white-space: nowrap;
        text-align: center;
      ">${esc(watermarkText)}</div>
    </div>`
  const previewNode = (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{
        fontSize: '120pt',
        fontWeight: 900,
        color,
        opacity: watermarkOpacity,
        letterSpacing: '8mm',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        textAlign: 'center',
      }}>{watermarkText}</div>
    </div>
  )
  return { printHTML, previewNode }
}

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
  const [template, setTemplate] = useState('modern')

  // Background image
  const [bgImage, setBgImage] = useState('')
  const [bgOpacity, setBgOpacity] = useState(1)

  // Watermark text
  const [watermarkText, setWatermarkText] = useState('')
  const [watermarkMode, setWatermarkMode] = useState('diagonal') // center | diagonal | tiled
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.08)

  const fileInputRef = useRef(null)
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
        if (d.template) setTemplate(d.template)
        if (d.bgImage) setBgImage(d.bgImage)
        if (typeof d.bgOpacity === 'number') setBgOpacity(d.bgOpacity)
        if (typeof d.watermarkText === 'string') setWatermarkText(d.watermarkText)
        if (d.watermarkMode) setWatermarkMode(d.watermarkMode)
        if (typeof d.watermarkOpacity === 'number') setWatermarkOpacity(d.watermarkOpacity)
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
          template, bgImage, bgOpacity,
          watermarkText, watermarkMode, watermarkOpacity,
        })
      )
    } catch {}
  }, [certType, courseName, position, eventName, signatureLabel, accentColor, goldColor, template, bgImage, bgOpacity, watermarkText, watermarkMode, watermarkOpacity])

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

  const handleBgUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error('Image too large — please use under 3 MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setBgImage(String(reader.result || ''))
      toast.success('Background uploaded')
    }
    reader.onerror = () => toast.error('Could not read image')
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const clearBg = () => {
    setBgImage('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    toast.success('Background removed')
  }

  // ─────────────────────────────────────────────
  // PRINT / PDF — A4 landscape exactly, no overflow
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
      ? `<img src="${esc(school.logo)}" alt="" style="width:20mm;height:20mm;object-fit:contain;border-radius:3mm;position:relative;z-index:2;" />`
      : `<div style="width:20mm;height:20mm;border-radius:3mm;background:linear-gradient(135deg,${accentColor},${goldColor});display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:22pt;font-family:'Segoe UI',sans-serif;position:relative;z-index:2;">${esc((school.name || 'S').charAt(0))}</div>`

    const infoItems = [
      { label: 'Roll No', value: s.rollNo || '—' },
      { label: 'Father Name', value: s.fatherName || '—' },
      { label: 'Class', value: `${s.grade || '—'}${s.section ? ' - ' + s.section : ''}` },
      { label: 'Session', value: s.session || session || '—' },
    ]

    const tpl = getTemplateStyles(template, accentColor, goldColor, bgImage, bgOpacity)
    const wm = buildWatermark({ watermarkText, watermarkMode, watermarkOpacity, accentColor })

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<title>${esc(title)} — ${esc(s.name)}</title>
<style>
  /* ── Exact A4 landscape page, no margin, no overflow ── */
  @page {
    size: 297mm 210mm;
    margin: 0;
  }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    width: 297mm;
    height: 210mm;
    background: #fff;
    overflow: hidden;
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    color: #0f172a;
  }
  /* The cert fills exactly one A4 landscape page */
  .cert {
    width: 297mm;
    height: 210mm;
    position: relative;
    overflow: hidden;
    background: #ffffff;
    padding: 12mm;
    display: flex;
    flex-direction: column;
    page-break-after: avoid;
    break-after: avoid;
  }
  .bg-image { opacity: ${bgOpacity} !important; }
  .cert .corner {
    position: absolute;
    width: 40mm; height: 40mm;
    border-radius: 50%;
    opacity: 0.08;
    z-index: 0;
  }
  .cert .corner.tl { top: -18mm; left: -18mm; background: ${accentColor}; }
  .cert .corner.tr { top: -18mm; right: -18mm; background: ${goldColor}; }
  .cert .corner.bl { bottom: -18mm; left: -18mm; background: ${goldColor}; }
  .cert .corner.br { bottom: -18mm; right: -18mm; background: ${accentColor}; }

  .head {
    position: relative;
    display: flex;
    align-items: center;
    gap: 6mm;
    padding-bottom: 6mm;
    border-bottom: 0.5mm solid #e2e8f0;
    z-index: 2;
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

  .title-bar { text-align: center; padding: 6mm 0 5mm; position: relative; z-index: 2; }
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

  .presented { text-align: center; margin-top: 4mm; position: relative; z-index: 2; }
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

  .info-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 3mm;
    margin-top: 6mm;
    padding: 4mm 5mm;
    background: #f8fafc;
    border-radius: 3mm;
    border: 0.3mm solid #e2e8f0;
    position: relative; z-index: 2;
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

  .body {
    flex: 1;
    margin-top: 5mm;
    font-size: 12pt;
    line-height: 1.8;
    color: #334155;
    text-align: center;
    padding: 0 8mm;
    position: relative; z-index: 2;
    overflow: hidden;
  }
  .body p { margin: 0; }
  .body strong { color: ${accentColor}; font-weight: 800; }

  .foot {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding-top: 4mm;
    margin-top: 4mm;
    border-top: 0.5mm solid #e2e8f0;
    position: relative; z-index: 2;
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
  .foot .date-value { font-size: 10pt; font-weight: 700; color: #0f172a; }
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
    z-index: 3;
  }

  ${tpl.extraCSS}
</style></head>
<body>
<div class="cert">
  ${tpl.bgLayer}
  ${wm.printHTML}
  ${tpl.cornerOrnaments}
  ${tpl.contentWrap}
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
</div>
<script>window.onload = function () { setTimeout(function () { window.print() }, 600) }</script>
</body></html>`

    win.document.open()
    win.document.write(html)
    win.document.close()
  }

  // ─────────────────────────────────────────────
  // LIVE PREVIEW — mirrors print, exact A4 landscape
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

    const wm = buildWatermark({ watermarkText, watermarkMode, watermarkOpacity, accentColor })

    // Template style overrides for preview
    const styleOverrides = (() => {
      const base = {
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
      }
      if (template === 'royal') {
        base.background = 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)'
        base.color = '#f8fafc'
        base.padding = '14mm'
      } else if (template === 'classic') {
        base.padding = '16mm'
      } else if (template === 'minimal') {
        base.padding = '18mm'
      }
      return base
    })()

    const royalStyle = template === 'royal'
    const classicStyle = template === 'classic'
    const minimalStyle = template === 'minimal'

    const schoolNameColor = royalStyle ? goldColor : accentColor
    const schoolSubColor = royalStyle ? '#94a3b8' : '#64748b'
    const headBorder = royalStyle ? `${goldColor}60` : `${accentColor}30`
    const metaLabelColor = '#94a3b8'
    const metaValueColor = royalStyle ? '#f8fafc' : '#0f172a'
    const titleColor = royalStyle ? '#f8fafc' : '#0f172a'
    const titleAccent = royalStyle ? goldColor : accentColor
    const presentedLabel = royalStyle ? '#94a3b8' : '#64748b'
    const studentNameColor = royalStyle ? goldColor : accentColor
    const underlineColor = royalStyle ? accentColor : goldColor
    const infoBg = royalStyle ? '#1e293b' : '#f8fafc'
    const infoBorder = royalStyle ? `${goldColor}50` : '#e2e8f0'
    const infoK = '#94a3b8'
    const infoV = royalStyle ? '#f8fafc' : '#0f172a'
    const bodyColor = royalStyle ? '#cbd5e1' : '#334155'
    const footBorder = royalStyle ? `${goldColor}60` : '#e2e8f0'
    const sigLineColor = royalStyle ? goldColor : '#0f172a'
    const sigLabelColor = royalStyle ? '#94a3b8' : '#64748b'
    const dateValue = royalStyle ? '#f8fafc' : '#0f172a'
    const dateLabel = royalStyle ? '#94a3b8' : '#64748b'

    return (
      <div className="rounded-xl bg-slate-100 p-4 overflow-auto" style={{ maxHeight: '80vh' }}>
        <div style={styleOverrides}>
          {/* Background image layer */}
          {bgImage && (
            <div
              style={{
                position: 'absolute', inset: 0,
                backgroundImage: `url('${bgImage}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                opacity: bgOpacity,
                zIndex: 0,
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Watermark text layer */}
          {wm.previewNode}

          {/* Template decorations */}
          {classicStyle && (
            <>
              <div style={{ position: 'absolute', inset: '6mm', border: `1.2mm double ${goldColor}`, borderRadius: '2mm', zIndex: 3, pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', inset: '9mm', border: `0.3mm solid ${accentColor}`, borderRadius: '1mm', zIndex: 3, pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', top: '10mm', left: '10mm', width: '18mm', height: '18mm', borderTop: `0.8mm solid ${goldColor}`, borderLeft: `0.8mm solid ${goldColor}`, borderTopLeftRadius: '3mm', zIndex: 3, pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', top: '10mm', right: '10mm', width: '18mm', height: '18mm', borderTop: `0.8mm solid ${goldColor}`, borderRight: `0.8mm solid ${goldColor}`, borderTopRightRadius: '3mm', zIndex: 3, pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: '10mm', left: '10mm', width: '18mm', height: '18mm', borderBottom: `0.8mm solid ${goldColor}`, borderLeft: `0.8mm solid ${goldColor}`, borderBottomLeftRadius: '3mm', zIndex: 3, pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: '10mm', right: '10mm', width: '18mm', height: '18mm', borderBottom: `0.8mm solid ${goldColor}`, borderRight: `0.8mm solid ${goldColor}`, borderBottomRightRadius: '3mm', zIndex: 3, pointerEvents: 'none' }} />
            </>
          )}

          {royalStyle && (
            <>
              <div style={{ position: 'absolute', inset: '5mm', border: `0.8mm solid ${goldColor}`, borderRadius: '1mm', zIndex: 3, pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', inset: '7mm', border: `0.2mm solid ${goldColor}80`, borderRadius: '1mm', zIndex: 3, pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', top: '-30mm', left: '-30mm', width: '80mm', height: '80mm', borderRadius: '50%', background: goldColor, filter: 'blur(60mm)', opacity: 0.35, zIndex: 1, pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: '-30mm', right: '-30mm', width: '80mm', height: '80mm', borderRadius: '50%', background: accentColor, filter: 'blur(60mm)', opacity: 0.35, zIndex: 1, pointerEvents: 'none' }} />
            </>
          )}

          {minimalStyle && (
            <div style={{ position: 'absolute', inset: '8mm', border: `0.3mm solid ${accentColor}40`, zIndex: 3, pointerEvents: 'none' }} />
          )}

          {template === 'modern' && (
            <>
              <div style={{ position: 'absolute', top: '-18mm', left: '-18mm', width: '40mm', height: '40mm', borderRadius: '50%', background: accentColor, opacity: 0.08, zIndex: 0 }} />
              <div style={{ position: 'absolute', top: '-18mm', right: '-18mm', width: '40mm', height: '40mm', borderRadius: '50%', background: goldColor, opacity: 0.08, zIndex: 0 }} />
              <div style={{ position: 'absolute', bottom: '-18mm', left: '-18mm', width: '40mm', height: '40mm', borderRadius: '50%', background: goldColor, opacity: 0.08, zIndex: 0 }} />
              <div style={{ position: 'absolute', bottom: '-18mm', right: '-18mm', width: '40mm', height: '40mm', borderRadius: '50%', background: accentColor, opacity: 0.08, zIndex: 0 }} />
            </>
          )}

          {/* Content */}
          <div style={{ position: 'relative', zIndex: 2, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6mm', paddingBottom: '6mm', borderBottom: `0.5mm solid ${headBorder}`, position: 'relative' }}>
              {school.logo ? (
                <img src={school.logo} alt="" style={{ width: '20mm', height: '20mm', objectFit: 'contain', borderRadius: '3mm', position: 'relative', zIndex: 2 }} />
              ) : (
                <div style={{ width: '20mm', height: '20mm', borderRadius: '3mm', background: `linear-gradient(135deg, ${accentColor}, ${goldColor})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '22pt', position: 'relative', zIndex: 2 }}>
                  {(school.name || 'S').charAt(0)}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '22pt', fontWeight: 800, color: schoolNameColor, lineHeight: 1.1, letterSpacing: '-0.2mm', textTransform: 'uppercase' }}>
                  {school.name || 'School Name'}
                </div>
                <div style={{ fontSize: '9pt', color: schoolSubColor, marginTop: '1.5mm', lineHeight: 1.5 }}>
                  {school.address || ''}{school.address && school.phone ? '  •  ' : ''}{school.phone ? `Ph: ${school.phone}` : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '7.5pt', color: metaLabelColor, textTransform: 'uppercase', letterSpacing: '0.5mm', fontWeight: 700 }}>Serial No.</div>
                <div style={{ fontSize: '10pt', color: metaValueColor, fontWeight: 700, marginTop: '0.5mm' }}>{serial}</div>
                <div style={{ fontSize: '7.5pt', color: metaLabelColor, textTransform: 'uppercase', letterSpacing: '0.5mm', fontWeight: 700, marginTop: '2.5mm' }}>Issue Date</div>
                <div style={{ fontSize: '10pt', color: metaValueColor, fontWeight: 700, marginTop: '0.5mm' }}>{issueDate}</div>
              </div>
            </div>

            <div style={{ textAlign: 'center', padding: '6mm 0 5mm', position: 'relative' }}>
              <div style={{
                display: 'inline-block',
                fontSize: '8pt',
                fontWeight: 800,
                letterSpacing: minimalStyle ? '3mm' : '2mm',
                textTransform: 'uppercase',
                color: royalStyle ? goldColor : accentColor,
                background: minimalStyle ? 'transparent' : (royalStyle ? `${goldColor}20` : `${accentColor}14`),
                padding: minimalStyle ? '0' : '1.5mm 4mm',
                borderRadius: '10mm',
                marginBottom: '3mm',
              }}>
                {ctype.name}
              </div>
              <h1 style={{
                fontSize: minimalStyle ? '30pt' : '34pt',
                fontWeight: minimalStyle ? 300 : 900,
                letterSpacing: '2mm',
                color: titleColor,
                textTransform: 'uppercase',
                lineHeight: 1,
                margin: 0,
              }}>
                Certificate <span style={{ color: titleAccent, fontWeight: minimalStyle ? 800 : 900 }}>of</span> Achievement
              </h1>
              <div style={{ width: minimalStyle ? '20mm' : '30mm', height: minimalStyle ? '0.3mm' : '1mm', background: `linear-gradient(90deg, ${accentColor}, ${goldColor})`, margin: '3mm auto 0', borderRadius: '1mm' }} />
            </div>

            <div style={{ textAlign: 'center', marginTop: '4mm' }}>
              <div style={{ fontSize: '9pt', color: presentedLabel, textTransform: 'uppercase', letterSpacing: '1mm', fontWeight: 700 }}>
                This certificate is proudly presented to
              </div>
              <div style={{ fontSize: '26pt', fontWeight: 800, color: studentNameColor, marginTop: '2mm', lineHeight: 1.15, letterSpacing: '0.3mm' }}>
                {s.name || 'Student Name'}
              </div>
              <div style={{ width: '80mm', height: '0.6mm', background: underlineColor, margin: '3mm auto 0', borderRadius: '1mm' }} />
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: minimalStyle ? '0' : '3mm',
              marginTop: '6mm',
              padding: minimalStyle ? '0' : '4mm 5mm',
              background: minimalStyle ? 'transparent' : infoBg,
              borderRadius: '3mm',
              border: minimalStyle ? 'none' : `0.3mm solid ${infoBorder}`,
            }}>
              {infoItems.map((it, idx) => (
                <div key={it.label} style={{ textAlign: 'center', borderLeft: minimalStyle && idx > 0 ? `0.2mm solid ${accentColor}30` : 'none' }}>
                  <div style={{ fontSize: '7.5pt', color: infoK, textTransform: 'uppercase', letterSpacing: '0.4mm', fontWeight: 700 }}>{it.label}</div>
                  <div style={{ fontSize: '11pt', color: infoV, fontWeight: 700, marginTop: '1mm', wordBreak: 'break-word' }}>{it.value}</div>
                </div>
              ))}
            </div>

            <div style={{ flex: 1, marginTop: '5mm', fontSize: '12pt', lineHeight: 1.8, color: bodyColor, textAlign: 'center', padding: '0 8mm', overflow: 'hidden' }}>
              {bodyText}
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: '4mm', marginTop: '4mm', borderTop: `0.5mm solid ${footBorder}` }}>
              <div style={{ textAlign: 'center', minWidth: '45mm' }}>
                <div style={{ width: '45mm', borderTop: `0.4mm solid ${sigLineColor}`, paddingTop: '1.5mm', fontSize: '10pt', fontWeight: 700, color: sigLineColor, margin: '0 auto' }}>
                  {signatureLabel || 'Principal'}
                </div>
                <div style={{ fontSize: '8pt', color: sigLabelColor, marginTop: '1mm', textTransform: 'uppercase', letterSpacing: '0.4mm' }}>Signature &amp; Seal</div>
              </div>
              <div style={{ width: '28mm', height: '28mm', border: `0.7mm dashed ${sigLineColor}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '6.5pt', color: sigLineColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3mm', lineHeight: 1.3, opacity: 0.75, padding: '3mm', boxSizing: 'border-box' }}>
                {school.name || 'School'}<br />Official Seal
              </div>
              <div style={{ textAlign: 'center', minWidth: '45mm' }}>
                <div style={{ fontSize: '10pt', fontWeight: 700, color: dateValue }}>{issueDate}</div>
                <div style={{ fontSize: '8pt', color: dateLabel, marginTop: '1mm', textTransform: 'uppercase', letterSpacing: '0.4mm' }}>Date of Issue</div>
              </div>
            </div>

            <div style={{ position: 'absolute', bottom: '8mm', right: '14mm', fontSize: '7pt', color: royalStyle ? `${goldColor}80` : '#94a3b8', fontFamily: "'Courier New', monospace", letterSpacing: '0.4mm', fontWeight: 600, zIndex: 3 }}>
              SERIAL: {serial}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const accent = isAcademy ? 'from-violet-500 to-purple-600' : 'from-indigo-500 to-blue-600'

  return (
    <div className="p-7">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${accent} text-white flex items-center justify-center shadow`}>
            <ScrollText size={22} />
          </div>
          <div>
            <h2 className="font-bold text-2xl leading-tight">Certificates</h2>
            <p className="text-xs text-slate-500">Generate modern, professional certificates — print or save as PDF</p>
          </div>
        </div>
        <Button onClick={handlePrint} disabled={!selectedStudent} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
          <Printer size={16} /> Print / Save PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6 items-start">
        <div className="space-y-4">
          {/* 1. Certificate type */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-bold text-slate-800 mb-3">1. Certificate type</h3>
            <div className="grid grid-cols-2 gap-2">
              {certTypes.map((c) => {
                const Icon = c.icon
                const active = certType === c.id
                return (
                  <button key={c.id} onClick={() => setCertType(c.id)}
                    className={`flex flex-col items-start gap-1.5 p-3 rounded-xl border-2 transition text-left ${
                      active ? `border-transparent bg-gradient-to-br ${c.color} text-white shadow` : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                    }`}>
                    <Icon size={18} />
                    <span className="text-xs font-bold leading-tight">{c.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 2. Template */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-bold text-slate-800 mb-3">2. Certificate template</h3>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((t) => {
                const Icon = t.icon
                const active = template === t.id
                return (
                  <button key={t.id} onClick={() => setTemplate(t.id)}
                    className={`relative overflow-hidden rounded-xl border-2 p-3 text-left transition ${
                      active ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-400'
                    }`}>
                    <div style={{ position: 'absolute', inset: 0, background: t.preview, opacity: 0.12 }} />
                    <div className="relative flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm" style={{ background: t.preview }}>
                        <Icon size={14} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800">{t.name}</div>
                        <div className="text-[10px] text-slate-500">{t.desc}</div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 3. Background image */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <ImageIcon size={16} /> 3. Background image
            </h3>

            <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center mb-3">
              {bgImage ? (
                <div className="space-y-2">
                  <img src={bgImage} alt="background" className="w-full h-24 object-cover rounded-lg border border-slate-200" />
                  <div className="text-[11px] text-slate-500">Background image uploaded</div>
                </div>
              ) : (
                <div className="text-slate-400">
                  <Upload size={22} className="mx-auto mb-1" />
                  <div className="text-[11px]">No background uploaded</div>
                </div>
              )}
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="gap-2">
                <Upload size={14} /> Upload
              </Button>
              <Button onClick={clearBg} variant="outline" disabled={!bgImage} className="gap-2 text-red-600 border-red-200 hover:bg-red-50">
                <X size={14} /> Remove
              </Button>
            </div>

            <div className="mt-3">
              <label className={LABEL}>Background opacity: {Math.round(bgOpacity * 100)}%</label>
              <input type="range" min="0" max="1" step="0.05" value={bgOpacity} onChange={(e) => setBgOpacity(Number(e.target.value))} className="w-full accent-indigo-600" />
            </div>
          </div>

          {/* 4. Watermark text */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Droplets size={16} /> 4. Watermark text
            </h3>

            <label className={LABEL}>Watermark text</label>
            <input
              className={INPUT + ' mb-3'}
              value={watermarkText}
              onChange={(e) => setWatermarkText(e.target.value)}
              placeholder="e.g. ORIGINAL · SAMPLE · NOT VALID WITHOUT SEAL"
            />

            <label className={LABEL}>Position</label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { v: 'center', t: 'Center' },
                { v: 'diagonal', t: 'Diagonal' },
                { v: 'tiled', t: 'Tiled' },
              ].map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setWatermarkMode(opt.v)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-bold border-2 transition ${
                    watermarkMode === opt.v
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400'
                  }`}
                >
                  {opt.t}
                </button>
              ))}
            </div>

            <label className={LABEL}>Watermark opacity: {Math.round(watermarkOpacity * 100)}%</label>
            <input
              type="range" min="0.02" max="0.6" step="0.01"
              value={watermarkOpacity}
              onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Low values (5–10%) look like a subtle watermark. Use higher for bold stamps.
            </p>
          </div>

          {/* 5. Student filter */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-bold text-slate-800 mb-3">5. Choose student</h3>

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
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, roll no…" className="flex-1 outline-none text-sm bg-transparent" />
            </div>

            <label className={LABEL}>Select student</label>
            {loading ? (
              <div className="py-6 text-center text-sm text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600 mx-auto" />
              </div>
            ) : filteredStudents.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">No students match these filters</p>
            ) : (
              <select className={INPUT} value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
                <option value="">— choose a student —</option>
                {filteredStudents.map((s) => (
                  <option key={studentKey(s)} value={studentKey(s)}>
                    {s.rollNo ? `[${s.rollNo}] ` : ''}{s.name}{s.fatherName ? ` s/o ${s.fatherName}` : ''}
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

          {/* 6. Customize */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-bold text-slate-800 mb-3">6. Customize certificate</h3>

            {certType === 'course' && (
              <div className="mb-3">
                <label className={LABEL}>Course name</label>
                <input className={INPUT} value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="MS Word, MS Excel…" />
              </div>
            )}
            {certType === 'merit' && (
              <div className="mb-3">
                <label className={LABEL}>Position</label>
                <select className={INPUT} value={position} onChange={(e) => setPosition(e.target.value)}>
                  {['1st', '2nd', '3rd', '4th', '5th'].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            )}
            {certType === 'participation' && (
              <div className="mb-3">
                <label className={LABEL}>Event name</label>
                <input className={INPUT} value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="Annual Function, Sports Day…" />
              </div>
            )}

            <label className={LABEL}>Certificate body</label>
            <textarea className={INPUT + ' mb-3'} rows={5} value={bodyText} onChange={(e) => setBodyText(e.target.value)} />

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={LABEL}>Signature label</label>
                <input className={INPUT} value={signatureLabel} onChange={(e) => setSignatureLabel(e.target.value)} />
              </div>
              <div>
                <label className={LABEL}>Issue date</label>
                <input className={INPUT} value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Accent color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-9 h-9 rounded border border-slate-300 cursor-pointer p-0.5 bg-white" />
                  <input className={INPUT} value={accentColor} onChange={(e) => setAccentColor(e.target.value)} />
                </div>
              </div>
              <div>
                <label className={LABEL}>Gold color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={goldColor} onChange={(e) => setGoldColor(e.target.value)} className="w-9 h-9 rounded border border-slate-300 cursor-pointer p-0.5 bg-white" />
                  <input className={INPUT} value={goldColor} onChange={(e) => setGoldColor(e.target.value)} />
                </div>
              </div>
            </div>

            <Button onClick={() => setSerial(serialNumber(certType.slice(0, 4).toUpperCase()))} variant="outline" className="w-full gap-2 mt-3">
              <RotateCcw size={14} /> Regenerate Serial
            </Button>
          </div>
        </div>

        {/* Right: Live preview */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Preview</span>
              <span className="text-[11px] text-slate-400">— {certTypes.find((c) => c.id === certType)?.name} · {template} · A4 landscape</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">#{serial}</div>
          </div>

          <Preview />

          <div className="flex items-center justify-between mt-3">
            <p className="text-[11px] text-slate-400">
              Enable "Background graphics" in the print dialog to keep colors, borders, background image, and watermark.
            </p>
            <Button onClick={handlePrint} disabled={!selectedStudent} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
              <Download size={15} /> Print / Save PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}