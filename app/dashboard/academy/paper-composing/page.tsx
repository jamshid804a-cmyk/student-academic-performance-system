"use client"

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  FileEdit, Plus, Trash2, Printer, RotateCcw, Loader2,
  FileText, CheckSquare, SquareCheck, AlignLeft, ListOrdered,
  BookOpen, PenLine, BookMarked, GitCompare, ToggleLeft, Eye,
  Languages,
} from 'lucide-react'
import GlobalApi from '@/app/_services/GlobalApi'
import { useProgram } from '@/src/context/ProgramContext'

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const STORAGE_KEY = 'paper_simple_v4'

const GRADES = [
  'Nursery', 'Prep',
  '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th',
]
const SECTIONS = ['A', 'B', 'C']
const TERMS = ['1st Term', '2nd Term', 'Mid Term', 'Final Term', 'Monthly Test', 'Annual Exam', 'Pre-Board']
const TERMS_UR = {
  '1st Term': 'پہلی جماعت',
  '2nd Term': 'دوسری جماعت',
  'Mid Term': 'درمیانی امتحان',
  'Final Term': 'سالانہ امتحان',
  'Monthly Test': 'ماہانہ ٹیسٹ',
  'Annual Exam': 'سالانہ امتحان',
  'Pre-Board': 'پری بورڈ',
}

const INPUT =
  'w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
const LABEL = 'block text-xs font-semibold text-slate-600 mb-1'

const Q_TYPES = [
  { value: 'simple',   label: 'Simple Question',     labelUr: 'سادہ سوال',              icon: FileText,    color: 'bg-slate-100 text-slate-700',     hint: 'A plain question with an answer line' },
  { value: 'fill',     label: 'Fill in the Blanks',  labelUr: 'خالی جگہ پر کریں',        icon: AlignLeft,   color: 'bg-blue-100 text-blue-700',       hint: 'Statements with a blank _____' },
  { value: 'mcq',      label: 'Choose Correct Option', labelUr: 'صحیح جواب چنیں',       icon: CheckSquare, color: 'bg-emerald-100 text-emerald-700', hint: 'A question with 2–4 options' },
  { value: 'tick',     label: 'Tick the Correct',    labelUr: 'صحیح پر نشان لگائیں',     icon: SquareCheck, color: 'bg-amber-100 text-amber-700',     hint: 'Tick ✓ or ✗ next to each statement' },
  { value: 'short',    label: 'Short Question',      labelUr: 'مختصر سوال',             icon: ListOrdered, color: 'bg-violet-100 text-violet-700',   hint: 'Answer in 2–3 lines' },
  { value: 'long',     label: 'Long Question',       labelUr: 'تفصیلی سوال',            icon: BookOpen,    color: 'bg-indigo-100 text-indigo-700',   hint: 'Detailed answer question' },
  { value: 'application', label: 'Application Question', labelUr: 'اطلاقی سوال',       icon: PenLine,     color: 'bg-orange-100 text-orange-700',   hint: 'Apply the concept to a situation' },
  { value: 'essay',    label: 'Essay',               labelUr: 'مضمون',                  icon: BookMarked,  color: 'bg-rose-100 text-rose-700',       hint: 'Write an essay on the topic' },
  { value: 'match',    label: 'Match the Columns',   labelUr: 'کالم ملائیں',            icon: GitCompare,  color: 'bg-teal-100 text-teal-700',       hint: 'Column A → Column B' },
  { value: 'story',    label: 'Story / Paragraph',   labelUr: 'کہانی / پیراگراف',       icon: BookOpen,    color: 'bg-pink-100 text-pink-700',       hint: 'Write a story from the given clues' },
  { value: 'truefalse', label: 'True / False',       labelUr: 'صحیح / غلط',             icon: ToggleLeft,  color: 'bg-cyan-100 text-cyan-700',       hint: 'Mark each statement True or False' },
]

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
const fmtDate = (d = new Date()) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

const newQuestion = (type, marks = 5) => {
  const q = { id: uid(), type, text: '', marks, parts: [] }
  if (type === 'fill') {
    q.text = 'Fill in the blanks:'
    q.parts = [1, 2, 3, 4, 5].map(() => ({ id: uid(), text: '' }))
  } else if (type === 'mcq') {
    q.text = 'Choose the correct option:'
    q.parts = [1, 2, 3, 4, 5].map(() => ({
      id: uid(), text: '', options: ['', '', '', ''],
    }))
  } else if (type === 'tick' || type === 'truefalse') {
    q.text = type === 'tick' ? 'Tick (✓) the correct statements:' : 'Write True or False:'
    q.parts = [1, 2, 3, 4, 5].map(() => ({ id: uid(), text: '' }))
  } else if (type === 'match') {
    q.text = 'Match the columns:'
    q.parts = [1, 2, 3, 4, 5].map(() => ({ id: uid(), colA: '', colB: '' }))
  }
  return q
}

// Localized labels for the paper
const L = {
  en: {
    subject: 'Subject', class: 'Class', time: 'Time', totalMarks: 'Total Marks',
    date: 'Date', session: 'Session', instructions: 'Instructions',
    principal: 'Principal', teacher: 'Teacher', columnA: 'Column A', columnB: 'Column B',
  },
  ur: {
    subject: 'مضمون', class: 'کلاس', time: 'وقت', totalMarks: 'کل نمبرات',
    date: 'تاریخ', session: 'سیشن', instructions: 'ہدایات',
    principal: 'پرنسپل', teacher: 'استاد', columnA: 'کالم الف', columnB: 'کالم ب',
  },
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export default function PaperComposingPage() {
  const ctx = useProgram() || {}
  const programValue = ctx.program || 'school'
  const isAcademy = programValue === 'academy'

  const [school, setSchool] = useState({
    name: '', address: '', phone: '', logo: '',
    nameUr: '', addressUr: '', phoneUr: '',
  })
  const [sessionOptions, setSessionOptions] = useState([])

  const [meta, setMeta] = useState({
    pageSize: 'A4',
    term: 'Mid Term',
    subject: '',
    subjectUr: '',
    grade: '',
    section: '',
    session: '',
    timeAllowed: '2 hours',
    instructions: 'Attempt all questions.',
    instructionsUr: '',
    signatureLabel: 'Principal',
    signatureLabelUr: '',
    accent: '#1e40af',
    font: "'Segoe UI', Arial, sans-serif",
    showLogo: true,
    showHeader: true,
    language: 'en',
  })

  const [questions, setQuestions] = useState([])
  const hydrated = useRef(false)
  const [busy, setBusy] = useState(false)

  const isRTL = meta.language === 'ur'

  // ── Persist ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const d = JSON.parse(raw)
        if (d.meta) setMeta((m) => ({ ...m, ...d.meta }))
        if (Array.isArray(d.questions)) setQuestions(d.questions)
        if (d.school) setSchool((s) => ({ ...s, ...d.school }))
      }
    } catch {}
    hydrated.current = true
  }, [])

  useEffect(() => {
    if (!hydrated.current) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ meta, questions, school }))
    } catch {}
  }, [meta, questions, school])

  // ── School info ──
  useEffect(() => {
    let alive = true
    GlobalApi.GetSchoolInfo()
      .then((res) => {
        const d = res?.data
        if (!alive || !d) return
        setSchool((s) => ({
          ...s,
          name: s.name || d.schoolName || d.name || '',
          address: s.address || d.address || '',
          phone: s.phone || d.phone || d.contact || '',
          logo: s.logo || d.logo || '',
        }))
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  // ── Session options ──
  useEffect(() => {
    let alive = true
    GlobalApi.GetAllStudents?.({ program: programValue })
      .then((resp) => {
        if (!alive) return
        const list = Array.isArray(resp?.data) ? resp.data : []
        const setS = new Set()
        list.forEach((s) => { if (s.session) setS.add(String(s.session).trim()) })
        const arr = Array.from(setS).sort((a, b) => {
          const ay = Number(a.match(/^(\d{4})/)?.[1] || 0)
          const by = Number(b.match(/^(\d{4})/)?.[1] || 0)
          return by - ay
        })
        setSessionOptions(arr)
        if (arr.length && !meta.session) {
          setMeta((m) => ({ ...m, session: arr[0] }))
        }
      })
      .catch(() => {})
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programValue])

  // ── Resolved values (fallback to English if Urdu blank) ──
  const resolved = {
    schoolName:  isRTL ? (school.nameUr || school.name || 'School Name') : (school.name || 'School Name'),
    schoolAddr:  isRTL ? (school.addressUr || school.address) : school.address,
    schoolPhone: isRTL ? (school.phoneUr || school.phone) : school.phone,
    subject:     isRTL ? (meta.subjectUr || meta.subject) : meta.subject,
    instructions: isRTL ? (meta.instructionsUr || meta.instructions) : meta.instructions,
    signature:   isRTL ? (meta.signatureLabelUr || L.ur.principal) : (meta.signatureLabel || L.en.principal),
  }

  // ── Question ops ──
  const addQuestion = (type) => {
    setQuestions((prev) => [...prev, newQuestion(type)])
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
    }, 50)
  }

  const updateQuestion = (id, patch) =>
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)))

  const removeQuestion = (id) => {
    if (!window.confirm('Delete this question?')) return
    setQuestions((prev) => prev.filter((q) => q.id !== id))
  }

  const moveQuestion = (id, dir) => {
    setQuestions((prev) => {
      const arr = [...prev]
      const i = arr.findIndex((q) => q.id === id)
      if (i < 0) return prev
      const j = dir === 'up' ? i - 1 : i + 1
      if (j < 0 || j >= arr.length) return prev
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      return arr
    })
  }

  const addPart = (qid) =>
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qid) return q
        let part
        if (q.type === 'mcq') part = { id: uid(), text: '', options: ['', '', '', ''] }
        else if (q.type === 'match') part = { id: uid(), colA: '', colB: '' }
        else part = { id: uid(), text: '' }
        return { ...q, parts: [...(q.parts || []), part] }
      })
    )

  const updatePart = (qid, partId, patch) =>
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qid) return q
        return {
          ...q,
          parts: (q.parts || []).map((p) => (p.id === partId ? { ...p, ...patch } : p)),
        }
      })
    )

  const removePart = (qid, partId) =>
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qid) return q
        return { ...q, parts: (q.parts || []).filter((p) => p.id !== partId) }
      })
    )

  const updateOption = (qid, partId, oi, value) =>
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qid) return q
        return {
          ...q,
          parts: (q.parts || []).map((p) => {
            if (p.id !== partId) return p
            const opts = [...(p.options || [])]
            opts[oi] = value
            return { ...p, options: opts }
          }),
        }
      })
    )

  const totalMarks = useMemo(
    () => questions.reduce((s, q) => s + (Number(q.marks) || 0), 0),
    [questions]
  )

  const resetPaper = () => {
    if (!window.confirm('Delete all questions and start a new paper?')) return
    setQuestions([])
    toast.success('Paper cleared')
  }

  // ── PRINT ──
  const handlePrint = () => {
    if (!questions.length) {
      toast.error('Please add at least one question')
      return
    }
    if (!resolved.subject || !meta.grade) {
      toast.error('Please fill Subject and Class')
      return
    }

    const win = window.open('', '_blank', 'width=1000,height=800')
    if (!win) {
      toast.error('Please allow pop-ups to print')
      return
    }

    const pageCSS = meta.pageSize === 'A5'
      ? '@page { size: A5; margin: 10mm; }'
      : '@page { size: A4; margin: 12mm; }'

    const logo = meta.showLogo && school.logo
      ? `<img src="${esc(school.logo)}" alt="" style="width:20mm;height:20mm;object-fit:contain;border-radius:3mm;" />`
      : ''

    const questionsHtml = questions.map((q, i) => renderQuestionHTML(q, i, meta)).join('')

    const labels = L[meta.language] || L.en
    const dir = isRTL ? 'rtl' : 'ltr'
    const align = isRTL ? 'right' : 'left'
    const flexDir = isRTL ? 'row-reverse' : 'row'
    const fontFamily = isRTL
      ? "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Segoe UI', Arial, sans-serif"
      : meta.font

    const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${meta.language}"><head><meta charset="utf-8" />
<title>${esc(resolved.subject || 'Paper')} — ${esc(meta.grade || '')}</title>
<style>
  ${pageCSS}
  * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  html, body { margin: 0; padding: 0; background: #fff; font-family: ${fontFamily}; color: #0f172a; direction: ${dir}; }
  .paper { width: 100%; ${meta.showHeader ? `border: 0.4mm solid ${meta.accent}; padding: 6mm; border-radius: 2mm;` : ''} }
  .head { display: flex; flex-direction: ${flexDir}; align-items: center; gap: 5mm; padding-bottom: 3mm; }
  .head-info { flex: 1; text-align: ${align}; }
  .school-name { font-size: 16pt; font-weight: 800; color: ${meta.accent}; text-transform: uppercase; line-height: 1.1; }
  .school-addr { font-size: 8.5pt; color: #475569; margin-top: 0.6mm; }
  .sep { height: 0.5mm; background: ${meta.accent}; margin: 1.5mm 0 2.5mm; border-radius: 1mm; }
  .title { text-align: center; margin-bottom: 2.5mm; }
  .title > div { display: inline-block; font-size: 12pt; font-weight: 800; text-transform: uppercase; letter-spacing: ${isRTL ? '0' : '1mm'}; padding: 1.2mm 5mm; background: ${meta.accent}1A; border-radius: 2mm; }
  .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5mm 5mm; font-size: 9.5pt; margin-bottom: 2.5mm; text-align: ${align}; }
  .meta b { color: ${meta.accent}; }
  .instr { font-size: 8.5pt; color: #475569; background: #f8fafc; padding: 2mm 3mm; border-${isRTL ? 'right' : 'left'}: 1mm solid ${meta.accent}; margin-bottom: 3mm; border-radius: 1mm; text-align: ${align}; }
  .instr b { color: #0f172a; }
  /* FIX 1: no bottom border on questions */
  .q { padding: 2mm 0; page-break-inside: avoid; break-inside: avoid; }
  .q-line { display: flex; flex-direction: ${flexDir}; align-items: flex-start; gap: 2mm; }
  .q-num { font-size: 10.5pt; font-weight: 800; color: ${meta.accent}; flex: none; width: 10mm; text-align: ${align}; }
  .q-text { flex: 1; font-size: 10.5pt; line-height: 1.5; text-align: ${align}; }
  .q-marks { flex: none; width: 11mm; text-align: center; font-size: 8.5pt; font-weight: 700; color: ${meta.accent}; background: ${meta.accent}14; padding: 0.8mm 0; border-radius: 1mm; }
  .parts { margin-top: 1mm; padding-${isRTL ? 'right' : 'left'}: 10mm; }
  .part { display: flex; flex-direction: ${flexDir}; gap: 2mm; font-size: 10.5pt; margin-bottom: 1mm; }
  .part-label { color: ${meta.accent}; font-weight: 700; width: 8mm; flex: none; text-align: ${align}; }
  .part-text { flex: 1; text-align: ${align}; }
  /* FIX 2: options render exactly as typed, 4 per row, wrap to next row */
  .opts { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1mm 4mm; margin-top: 1mm; padding-${isRTL ? 'right' : 'left'}: 10mm; }
  .opt { font-size: 10.5pt; text-align: ${align}; line-height: 1.4; }
  .match-table { width: 100%; border-collapse: collapse; margin-top: 1mm; }
  .match-table td { padding: 1mm 2mm; font-size: 10.5pt; text-align: ${align}; }
  .match-table .colA { border-${isRTL ? 'left' : 'right'}: 0.3mm solid #cbd5e1; }
  .foot { margin-top: 4mm; padding-top: 2.5mm; border-top: 0.3mm solid #cbd5e1; display: flex; flex-direction: ${flexDir}; align-items: center; justify-content: space-between; }
  .foot .sig { min-width: 45mm; text-align: center; }
  .foot .sig-line { width: 40mm; border-top: 0.3mm solid #0f172a; margin: 0 auto; }
  .foot .sig-label { font-size: 8.5pt; color: #475569; margin-top: 1mm; }
  .foot .total { flex: 1; text-align: center; font-size: 9pt; }
  .foot .total b { color: ${meta.accent}; }
</style></head>
<body>
<div class="paper">
  ${meta.showHeader ? `
  <div class="head">
    ${logo}
    <div class="head-info">
      <div class="school-name">${esc(resolved.schoolName)}</div>
      ${resolved.schoolAddr ? `<div class="school-addr">${esc(resolved.schoolAddr)}</div>` : ''}
      ${resolved.schoolPhone ? `<div class="school-addr">${isRTL ? 'فون' : 'Phone'}: ${esc(resolved.schoolPhone)}</div>` : ''}
    </div>
  </div>
  <div class="sep"></div>
  ` : ''}
  <div class="title"><div>${esc(isRTL ? (TERMS_UR[meta.term] || meta.term) : meta.term)}${meta.session ? ' — ' + esc(meta.session) : ''}</div></div>
  <div class="meta">
    <div><b>${labels.subject}:</b> ${esc(resolved.subject)}</div>
    <div><b>${labels.class}:</b> ${esc(meta.grade)}${meta.section ? ' - ' + esc(meta.section) : ''}</div>
    <div><b>${labels.time}:</b> ${esc(meta.timeAllowed)}</div>
    <div><b>${labels.totalMarks}:</b> ${totalMarks}</div>
    <div><b>${labels.date}:</b> ${fmtDate()}</div>
    <div><b>${labels.session}:</b> ${esc(meta.session || '—')}</div>
  </div>
  ${resolved.instructions ? `<div class="instr"><b>${labels.instructions}:</b> ${esc(resolved.instructions)}</div>` : ''}

  ${questionsHtml}

  <div class="foot">
    <div class="sig">
      <div class="sig-line"></div>
      <div class="sig-label">${esc(resolved.signature)}</div>
    </div>
    <div class="total"><b>${labels.totalMarks}:</b> ${totalMarks}</div>
    <div style="width: 45mm;"></div>
  </div>
</div>
<script>window.onload = function () { setTimeout(function () { window.print() }, 600) }</script>
</body></html>`

    win.document.open()
    win.document.write(html)
    win.document.close()
  }

  const accent = isAcademy ? 'from-violet-500 to-purple-600' : 'from-indigo-500 to-blue-600'

  return (
    <div className="p-7 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${accent} text-white flex items-center justify-center shadow`}>
            <FileEdit size={22} />
          </div>
          <div>
            <h2 className="font-bold text-2xl leading-tight">Paper Composing</h2>
            <p className="text-xs text-slate-500">Fill the details → add questions → print A4 or A5</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
            <Languages size={15} className="text-slate-400 mx-1" />
            {[
              { v: 'en', t: 'English' },
              { v: 'ur', t: 'اردو' },
            ].map((opt) => (
              <button
                key={opt.v}
                onClick={() => setMeta((m) => ({ ...m, language: opt.v }))}
                className={`px-3 py-1.5 rounded text-xs font-bold transition ${
                  meta.language === opt.v
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {opt.t}
              </button>
            ))}
          </div>
          <Button onClick={resetPaper} variant="outline" className="gap-2 text-red-600 border-red-200 hover:bg-red-50">
            <RotateCcw size={15} /> Clear Paper
          </Button>
          <Button onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
            <Printer size={15} /> Print / Save PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-6 items-start">
        {/* LEFT: FORM */}
        <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
          {/* STEP 0: School / Header info */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">0</span>
              <h3 className="font-bold text-slate-800">School / Header Info</h3>
              <span className="ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                {isRTL ? 'اردو' : 'English'}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className={LABEL}>School name</label>
                <input
                  className={INPUT}
                  value={isRTL ? school.nameUr : school.name}
                  onChange={(e) => setSchool((s) => ({ ...s, [isRTL ? 'nameUr' : 'name']: e.target.value }))}
                  placeholder={isRTL ? 'مثال: گرین ووڈ انٹرنیشنل اسکول' : 'e.g. Greenwood International School'}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>
              <div>
                <label className={LABEL}>Address</label>
                <input
                  className={INPUT}
                  value={isRTL ? school.addressUr : school.address}
                  onChange={(e) => setSchool((s) => ({ ...s, [isRTL ? 'addressUr' : 'address']: e.target.value }))}
                  placeholder={isRTL ? 'مثال: ۱۲۳ تعلیم لین، لاہور' : 'e.g. 123 Education Lane, Lahore'}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>
              <div>
                <label className={LABEL}>Phone</label>
                <input
                  className={INPUT}
                  value={isRTL ? school.phoneUr : school.phone}
                  onChange={(e) => setSchool((s) => ({ ...s, [isRTL ? 'phoneUr' : 'phone']: e.target.value }))}
                  placeholder="e.g. 0300-1234567"
                />
              </div>
              <div className="text-[11px] text-slate-500 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {isRTL
                  ? 'اگر اردو نام خالی ہو تو انگریزی نام استعمال ہوگا۔'
                  : 'If the Urdu field is empty, the English value is used as fallback.'}
              </div>
            </div>
          </div>

          {/* STEP 1: Paper details */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">1</span>
              <h3 className="font-bold text-slate-800">Paper Details</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={LABEL}>Page size</label>
                <div className="grid grid-cols-2 gap-2">
                  {['A4', 'A5'].map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setMeta((m) => ({ ...m, pageSize: sz }))}
                      className={`px-3 py-2.5 rounded-lg text-sm font-bold border-2 transition ${
                        meta.pageSize === sz
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400'
                      }`}
                    >
                      {sz} {sz === 'A4' ? '(full page)' : '(half page)'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={LABEL}>Subject *</label>
                <input
                  className={INPUT}
                  value={isRTL ? meta.subjectUr : meta.subject}
                  onChange={(e) => setMeta((m) => ({ ...m, [isRTL ? 'subjectUr' : 'subject']: e.target.value }))}
                  placeholder={isRTL ? 'مثال: ریاضی' : 'Mathematics'}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>
              <div>
                <label className={LABEL}>Term</label>
                <select className={INPUT} value={meta.term} onChange={(e) => setMeta((m) => ({ ...m, term: e.target.value }))}>
                  {TERMS.map((t) => <option key={t} value={t}>{isRTL ? (TERMS_UR[t] || t) : t}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Class *</label>
                <select className={INPUT} value={meta.grade} onChange={(e) => setMeta((m) => ({ ...m, grade: e.target.value }))}>
                  <option value="">Select</option>
                  {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Section</label>
                <select className={INPUT} value={meta.section} onChange={(e) => setMeta((m) => ({ ...m, section: e.target.value }))}>
                  <option value="">—</option>
                  {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Session</label>
                <select className={INPUT} value={meta.session} onChange={(e) => setMeta((m) => ({ ...m, session: e.target.value }))}>
                  <option value="">—</option>
                  {sessionOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Time allowed</label>
                <input
                  className={INPUT}
                  value={meta.timeAllowed}
                  onChange={(e) => setMeta((m) => ({ ...m, timeAllowed: e.target.value }))}
                />
              </div>
              <div>
                <label className={LABEL}>Signature label</label>
                <input
                  className={INPUT}
                  value={isRTL ? meta.signatureLabelUr : meta.signatureLabel}
                  onChange={(e) => setMeta((m) => ({ ...m, [isRTL ? 'signatureLabelUr' : 'signatureLabel']: e.target.value }))}
                  placeholder={isRTL ? 'پرنسپل' : 'Principal'}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>
              <div className="col-span-2">
                <label className={LABEL}>Instructions</label>
                <input
                  className={INPUT}
                  value={isRTL ? meta.instructionsUr : meta.instructions}
                  onChange={(e) => setMeta((m) => ({ ...m, [isRTL ? 'instructionsUr' : 'instructions']: e.target.value }))}
                  placeholder={isRTL ? 'تمام سوالات حل کریں۔' : 'Attempt all questions.'}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>
              <div className="col-span-2 flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
                <span className="text-xs font-semibold text-indigo-800">{isRTL ? 'کل نمبرات' : 'Total Marks'}</span>
                <span className="text-lg font-extrabold text-indigo-700">{totalMarks}</span>
              </div>
            </div>
          </div>

          {/* STEP 2: Questions */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">2</span>
              <h3 className="font-bold text-slate-800">Questions ({questions.length})</h3>
            </div>

            {questions.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl mb-3">
                <FileText size={32} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No questions yet</p>
                <p className="text-xs text-slate-400 mt-1">Click one of the buttons below to start</p>
              </div>
            )}

            <div className="space-y-3">
              {questions.map((q, i) => (
                <QuestionCard
                  key={q.id}
                  q={q}
                  index={i}
                  isFirst={i === 0}
                  isLast={i === questions.length - 1}
                  onUpdate={updateQuestion}
                  onRemove={removeQuestion}
                  onMove={moveQuestion}
                  onAddPart={addPart}
                  onUpdatePart={updatePart}
                  onRemovePart={removePart}
                  onUpdateOption={updateOption}
                />
              ))}
            </div>

            <div className="mt-5 pt-5 border-t border-slate-200">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                ➕ Add a question
              </p>
              <div className="grid grid-cols-2 gap-2">
                {Q_TYPES.map((qt) => {
                  const Icon = qt.icon
                  return (
                    <button
                      key={qt.value}
                      onClick={() => addQuestion(qt.value)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50 transition text-left"
                    >
                      <div className={`w-7 h-7 rounded-lg ${qt.color} flex items-center justify-center flex-none`}>
                        <Icon size={14} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 leading-tight">
                          {isRTL ? qt.labelUr : qt.label}
                        </div>
                        <div className="text-[10px] text-slate-500 leading-tight mt-0.5">{qt.hint}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: LIVE PREVIEW */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 min-w-0 sticky top-4">
          <div className="flex items-center gap-2 mb-4">
            <Eye size={16} className="text-indigo-600" />
            <h3 className="font-bold text-slate-800">Live Preview</h3>
            <span className="text-[11px] text-slate-400 ml-auto">{meta.pageSize} · {isRTL ? 'RTL' : 'LTR'}</span>
          </div>

          <div className="rounded-xl bg-slate-100 p-6 overflow-auto" style={{ maxHeight: '85vh' }}>
            <div
              dir={isRTL ? 'rtl' : 'ltr'}
              style={{
                width: meta.pageSize === 'A5' ? '148mm' : '210mm',
                minHeight: meta.pageSize === 'A5' ? '210mm' : '297mm',
                transform: `scale(${meta.pageSize === 'A5' ? 0.85 : 0.62})`,
                transformOrigin: isRTL ? 'top right' : 'top left',
                background: '#fff',
                padding: '10mm',
                boxSizing: 'border-box',
                fontFamily: isRTL
                  ? "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Segoe UI', Arial, sans-serif"
                  : meta.font,
                boxShadow: '0 10px 30px rgba(15,23,42,0.15)',
                borderRadius: '2mm',
                border: meta.showHeader ? `0.4mm solid ${meta.accent}` : 'none',
                marginBottom: meta.pageSize === 'A5' ? '-30mm' : '-110mm',
              }}
            >
              <PreviewContent meta={meta} questions={questions} school={school} totalMarks={totalMarks} resolved={resolved} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Question Card
// ─────────────────────────────────────────────
function QuestionCard({ q, index, isFirst, isLast, onUpdate, onRemove, onMove, onAddPart, onUpdatePart, onRemovePart, onUpdateOption }) {
  const typeDef = Q_TYPES.find((t) => t.value === q.type) || Q_TYPES[0]
  const TypeIcon = typeDef.icon

  return (
    <div className="rounded-xl border-2 border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200">
        <div className={`w-7 h-7 rounded-lg ${typeDef.color} flex items-center justify-center flex-none`}>
          <TypeIcon size={14} />
        </div>
        <span className="text-xs font-bold text-indigo-600">Q{index + 1}</span>
        <span className="text-xs font-semibold text-slate-600">{typeDef.label}</span>
        <div className="flex-1" />
        <input
          type="number"
          min={1}
          value={q.marks}
          onChange={(e) => onUpdate(q.id, { marks: Number(e.target.value) })}
          className="w-14 px-2 py-1 rounded border border-slate-300 text-xs text-center outline-none focus:border-indigo-500 bg-white"
          title="Marks"
        />
        <span className="text-[10px] text-slate-500">marks</span>
        <button onClick={() => onMove(q.id, 'up')} disabled={isFirst} className="p-1 rounded hover:bg-white text-slate-500 disabled:opacity-30" title="Move up">↑</button>
        <button onClick={() => onMove(q.id, 'down')} disabled={isLast} className="p-1 rounded hover:bg-white text-slate-500 disabled:opacity-30" title="Move down">↓</button>
        <button onClick={() => onRemove(q.id)} className="p-1 rounded hover:bg-red-50 text-red-500" title="Delete">
          <Trash2 size={13} />
        </button>
      </div>

      <div className="p-3 space-y-2">
        <div>
          <label className="block text-[10px] font-semibold text-slate-600 mb-1">Question Text</label>
          <textarea
            rows={q.type === 'simple' ? 2 : 1}
            className="w-full px-2 py-1.5 rounded border border-slate-200 text-sm text-slate-800 outline-none focus:border-indigo-500 resize-y"
            value={q.text}
            placeholder="Write the question instruction..."
            onChange={(e) => onUpdate(q.id, { text: e.target.value })}
          />
        </div>

        {(q.type === 'fill' || q.type === 'tick' || q.type === 'truefalse' || q.type === 'short' || q.type === 'long' || q.type === 'application' || q.type === 'essay' || q.type === 'story' || q.type === 'simple') && Array.isArray(q.parts) && (
          <>
            {q.parts.length > 0 && (
              <div className="flex items-center justify-between mt-2">
                <label className="text-[10px] font-semibold text-slate-600">Parts ({q.parts.length})</label>
                <button onClick={() => onAddPart(q.id)} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1">
                  <Plus size={11} /> Add part
                </button>
              </div>
            )}
            <div className="space-y-1.5">
              {q.parts.map((p, pi) => (
                <div key={p.id} className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-indigo-600 w-8 flex-none">
                    {q.type === 'fill' || q.type === 'tick' || q.type === 'truefalse' ? `${pi + 1}.` : `•`}
                  </span>
                  <input
                    className="flex-1 min-w-0 px-2 py-1 rounded border border-slate-200 text-xs outline-none focus:border-indigo-500"
                    value={p.text}
                    placeholder={
                      q.type === 'fill' ? 'Statement with _____ for blank'
                      : q.type === 'tick' ? 'Statement to tick'
                      : q.type === 'truefalse' ? 'Statement'
                      : 'Part text'
                    }
                    onChange={(e) => onUpdatePart(q.id, p.id, { text: e.target.value })}
                  />
                  <button onClick={() => onRemovePart(q.id, p.id)} className="p-1 rounded hover:bg-red-50 text-red-500 flex-none">
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
            {q.parts.length === 0 && (
              <button onClick={() => onAddPart(q.id)} className="text-[10px] font-bold text-indigo-600 inline-flex items-center gap-1 mt-1">
                <Plus size={11} /> Add first part
              </button>
            )}
          </>
        )}

        {q.type === 'mcq' && (
          <>
            <div className="flex items-center justify-between mt-2">
              <label className="text-[10px] font-semibold text-slate-600">Sub-questions ({q.parts?.length || 0})</label>
              <button onClick={() => onAddPart(q.id)} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1">
                <Plus size={11} /> Add sub-question
              </button>
            </div>
            <div className="space-y-2">
              {(q.parts || []).map((p, pi) => (
                <div key={p.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-bold text-indigo-600 w-8">Q{pi + 1}</span>
                    <input
                      className="flex-1 min-w-0 px-2 py-1 rounded border border-slate-200 text-xs outline-none focus:border-indigo-500 bg-white"
                      value={p.text}
                      placeholder="Question stem"
                      onChange={(e) => onUpdatePart(q.id, p.id, { text: e.target.value })}
                    />
                    <button onClick={() => onRemovePart(q.id, p.id)} className="p-1 rounded hover:bg-red-50 text-red-500">
                      <Trash2 size={11} />
                    </button>
                  </div>
                  {/* FIX 2 in editor: type options freely (e.g. "(i) Apple", "1. Orange", "• Mango", "A. Banana") */}
                  <div className="grid grid-cols-2 gap-1.5 pl-8">
                    {(p.options || []).map((opt, oi) => (
                      <input
                        key={oi}
                        className="w-full px-2 py-1 rounded border border-slate-200 text-xs outline-none focus:border-indigo-500 bg-white"
                        value={opt}
                        placeholder={`Option ${oi + 1}  e.g. (i) Apple`}
                        onChange={(e) => onUpdateOption(q.id, p.id, oi, e.target.value)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {q.type === 'match' && (
          <>
            <div className="flex items-center justify-between mt-2">
              <label className="text-[10px] font-semibold text-slate-600">Match pairs ({q.parts?.length || 0})</label>
              <button onClick={() => onAddPart(q.id)} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1">
                <Plus size={11} /> Add pair
              </button>
            </div>
            <div className="space-y-1.5">
              {(q.parts || []).map((p, pi) => (
                <div key={p.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                  <input
                    className="px-2 py-1 rounded border border-slate-200 text-xs outline-none focus:border-indigo-500"
                    value={p.colA || ''}
                    placeholder={`Column A — ${pi + 1}`}
                    onChange={(e) => onUpdatePart(q.id, p.id, { colA: e.target.value })}
                  />
                  <input
                    className="px-2 py-1 rounded border border-slate-200 text-xs outline-none focus:border-indigo-500"
                    value={p.colB || ''}
                    placeholder={`Column B — ${pi + 1}`}
                    onChange={(e) => onUpdatePart(q.id, p.id, { colB: e.target.value })}
                  />
                  <button onClick={() => onRemovePart(q.id, p.id)} className="p-1 rounded hover:bg-red-50 text-red-500">
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Preview content (mirrors print exactly)
// ─────────────────────────────────────────────
function PreviewContent({ meta, questions, school, totalMarks, resolved }) {
  const isRTL = meta.language === 'ur'
  const labels = L[meta.language] || L.en
  const dir = isRTL ? 'rtl' : 'ltr'
  const align = isRTL ? 'right' : 'left'
  const flexDir = isRTL ? 'row-reverse' : 'row'
  const fontFamily = isRTL
    ? "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Segoe UI', Arial, sans-serif"
    : meta.font

  return (
    <div dir={dir} style={{ fontFamily }}>
      {meta.showHeader && (
        <>
          <div style={{ display: 'flex', flexDirection: flexDir, alignItems: 'center', gap: '4mm', paddingBottom: '2mm' }}>
            {meta.showLogo && school.logo && (
              <img src={school.logo} alt="" style={{ width: '18mm', height: '18mm', objectFit: 'contain', borderRadius: '3mm' }} />
            )}
            <div style={{ flex: 1, textAlign: align }}>
              <div style={{ fontSize: '16pt', fontWeight: 800, color: meta.accent, textTransform: 'uppercase', lineHeight: 1.1 }}>
                {resolved.schoolName}
              </div>
              {resolved.schoolAddr && (
                <div style={{ fontSize: '8.5pt', color: '#475569', marginTop: '0.6mm' }}>{resolved.schoolAddr}</div>
              )}
              {resolved.schoolPhone && (
                <div style={{ fontSize: '8.5pt', color: '#475569' }}>
                  {isRTL ? 'فون' : 'Phone'}: {resolved.schoolPhone}
                </div>
              )}
            </div>
          </div>
          <div style={{ height: '0.5mm', background: meta.accent, margin: '1.5mm 0 2.5mm', borderRadius: '1mm' }} />
        </>
      )}

      <div style={{ textAlign: 'center', marginBottom: '2.5mm' }}>
        <div style={{ display: 'inline-block', fontSize: '12pt', fontWeight: 800, textTransform: 'uppercase', letterSpacing: isRTL ? '0' : '1mm', padding: '1.2mm 5mm', background: `${meta.accent}1A`, borderRadius: '2mm' }}>
          {isRTL ? (TERMS_UR[meta.term] || meta.term) : meta.term}
          {meta.session ? ' — ' + meta.session : ''}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5mm 5mm', fontSize: '9.5pt', marginBottom: '2.5mm', textAlign: align }}>
        <div><b style={{ color: meta.accent }}>{labels.subject}:</b> {resolved.subject || '—'}</div>
        <div><b style={{ color: meta.accent }}>{labels.class}:</b> {meta.grade || '—'}{meta.section ? ' - ' + meta.section : ''}</div>
        <div><b style={{ color: meta.accent }}>{labels.time}:</b> {meta.timeAllowed}</div>
        <div><b style={{ color: meta.accent }}>{labels.totalMarks}:</b> {totalMarks}</div>
        <div><b style={{ color: meta.accent }}>{labels.date}:</b> {fmtDate()}</div>
        <div><b style={{ color: meta.accent }}>{labels.session}:</b> {meta.session || '—'}</div>
      </div>

      {resolved.instructions && (
        <div style={{ fontSize: '8.5pt', color: '#475569', background: '#f8fafc', padding: '2mm 3mm', borderRight: isRTL ? `1mm solid ${meta.accent}` : 'none', borderLeft: isRTL ? 'none' : `1mm solid ${meta.accent}`, marginBottom: '3mm', borderRadius: '1mm', textAlign: align }}>
          <b style={{ color: '#0f172a' }}>{labels.instructions}:</b> {resolved.instructions}
        </div>
      )}

      {questions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20mm 0', color: '#94a3b8', fontSize: '11pt', fontStyle: 'italic' }}>
          {isRTL ? 'سوالات شامل کریں' : 'Add questions on the left to see them here'}
        </div>
      ) : (
        questions.map((q, i) => (
          <div key={q.id} dangerouslySetInnerHTML={{ __html: renderQuestionHTML(q, i, meta) }} />
        ))
      )}

      <div style={{ marginTop: '4mm', paddingTop: '2.5mm', borderTop: '0.3mm solid #cbd5e1', display: 'flex', flexDirection: flexDir, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ minWidth: '45mm', textAlign: 'center' }}>
          <div style={{ width: '40mm', borderTop: '0.3mm solid #0f172a', margin: '0 auto' }} />
          <div style={{ fontSize: '8.5pt', color: '#475569', marginTop: '1mm' }}>
            {resolved.signature}
          </div>
        </div>
        <div style={{ flex: 1, textAlign: 'center', fontSize: '9pt' }}>
          <b style={{ color: meta.accent }}>{labels.totalMarks}:</b> {totalMarks}
        </div>
        <div style={{ width: '45mm' }} />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// HTML renderer (shared by preview & print)
// ─────────────────────────────────────────────
function renderQuestionHTML(q, i, meta) {
  const isRTL = meta.language === 'ur'
  const labels = L[meta.language] || L.en
  const align = isRTL ? 'right' : 'left'
  const flexDir = isRTL ? 'row-reverse' : 'row'
  const padSide = isRTL ? 'right' : 'left'

  const qNum = i + 1
  const numColor = meta.accent
  const marksStyle = `width:11mm;text-align:center;font-size:8.5pt;font-weight:700;color:${meta.accent};background:${meta.accent}14;padding:0.8mm 0;border-radius:1mm;flex:none;`

  // FIX 1: removed `border-bottom:0.2mm dotted #cbd5e1` from all `.q` wrappers
  const mainLine = `
    <div class="q-line" style="display:flex;flex-direction:${flexDir};align-items:flex-start;gap:2mm;">
      <span class="q-num" style="font-size:10.5pt;font-weight:800;color:${numColor};flex:none;width:10mm;text-align:${align};">Q${qNum}.</span>
      <div class="q-text" style="flex:1;font-size:10.5pt;line-height:1.5;text-align:${align};">${esc(q.text || '').replace(/\n/g, '<br/>')}</div>
      <span class="q-marks" style="${marksStyle}">${q.marks}</span>
    </div>
  `

  if (
    q.type === 'fill' || q.type === 'tick' || q.type === 'truefalse' ||
    (Array.isArray(q.parts) && q.parts.length > 0 && (q.type === 'short' || q.type === 'long' || q.type === 'application' || q.type === 'essay' || q.type === 'story' || q.type === 'simple'))
  ) {
    const parts = (q.parts || []).map((p, pi) => `
      <div class="part" style="display:flex;flex-direction:${flexDir};gap:2mm;font-size:10.5pt;margin-bottom:1mm;">
        <span class="part-label" style="color:${meta.accent};font-weight:700;width:8mm;flex:none;text-align:${align};">${pi + 1}.</span>
        <span class="part-text" style="flex:1;text-align:${align};">${esc(p.text || '')}</span>
      </div>
    `).join('')
    return `<div class="q" style="padding:2mm 0;page-break-inside:avoid;">${mainLine}<div class="parts" style="margin-top:1mm;padding-${padSide}:10mm;">${parts}</div></div>`
  }

  if (q.type === 'mcq') {
    // FIX 2: print options exactly as typed — no auto A./B./C. prefix
    const parts = (q.parts || []).map((p, pi) => `
      <div style="margin-top:${pi === 0 ? '1mm' : '1.5mm'};">
        <div style="display:flex;flex-direction:${flexDir};gap:2mm;font-size:10.5pt;">
          <span style="color:${meta.accent};font-weight:700;width:8mm;flex:none;text-align:${align};">${pi + 1}.</span>
          <span style="flex:1;text-align:${align};">${esc(p.text || '')}</span>
        </div>
        <div class="opts" style="display:grid;grid-template-columns:repeat(4,1fr);gap:1mm 4mm;margin-top:1mm;padding-${padSide}:10mm;">
          ${(p.options || []).map((o) => `
            <div class="opt" style="font-size:10.5pt;text-align:${align};line-height:1.4;">${esc(o || '')}</div>
          `).join('')}
        </div>
      </div>
    `).join('')
    return `<div class="q" style="padding:2mm 0;page-break-inside:avoid;">${mainLine}<div style="padding-${padSide}:10mm;">${parts}</div></div>`
  }

  if (q.type === 'match') {
    const rows = (q.parts || []).map((p, pi) => `
      <tr>
        <td class="colA" style="padding:1mm 2mm;font-size:10.5pt;border-${isRTL ? 'left' : 'right'}:0.3mm solid #cbd5e1;width:50%;text-align:${align};">${pi + 1}. ${esc(p.colA || '')}</td>
        <td style="padding:1mm 2mm;font-size:10.5pt;text-align:${align};">${String.fromCharCode(65 + pi)}. ${esc(p.colB || '')}</td>
      </tr>
    `).join('')
    return `<div class="q" style="padding:2mm 0;page-break-inside:avoid;">${mainLine}
      <table class="match-table" style="width:100%;border-collapse:collapse;margin-top:1mm;">
        <thead><tr>
          <th style="text-align:${align};padding:1mm 2mm;font-size:10pt;color:${meta.accent};border-bottom:0.3mm solid ${meta.accent};">${labels.columnA}</th>
          <th style="text-align:${align};padding:1mm 2mm;font-size:10pt;color:${meta.accent};border-bottom:0.3mm solid ${meta.accent};">${labels.columnB}</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`
  }

  return `<div class="q" style="padding:2mm 0;page-break-inside:avoid;">${mainLine}</div>`
}