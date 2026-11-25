"use client"

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  FileEdit, Plus, Trash2, Printer, RotateCcw, Loader2,
  Layout, FileText, ChevronDown, ChevronUp, GripVertical,
  Copy, Eye, ListOrdered, Square, CheckSquare, AlignLeft,
} from 'lucide-react'
import GlobalApi from '@/app/_services/GlobalApi'
import { useProgram } from '@/src/context/ProgramContext'

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const TEMPLATES_KEY = 'paper_templates_v2'

const GRADES = [
  'Nursery', 'Prep',
  '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th',
]
const SECTIONS = ['A', 'B', 'C']
const TERMS = ['1st Term', '2nd Term', 'Mid Term', 'Final Term', 'Monthly Test', 'Annual Exam', 'Pre-Board']

const FONTS = [
  { label: 'Segoe UI (modern)', value: "'Segoe UI', Arial, sans-serif" },
  { label: 'Georgia (classic)', value: "Georgia, 'Times New Roman', serif" },
  { label: 'Times New Roman (exam)', value: "'Times New Roman', Times, serif" },
  { label: 'Arial (clean)', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Verdana (readable)', value: 'Verdana, Geneva, sans-serif' },
]

const PAGE_SIZES = [
  { value: 'A4', label: 'A4 — 210 × 297 mm (default)' },
  { value: 'A5', label: 'A5 — 148 × 210 mm (half page)' },
]

const PART_STYLES = [
  { value: 'roman', label: 'Roman (i, ii, iii…)' },
  { value: 'alpha', label: 'Alphabet (a, b, c…)' },
  { value: 'number', label: 'Number (1, 2, 3…)' },
  { value: 'paren', label: 'Parenthesized ((1), (2)…)' },
]

const Q_TYPES = [
  { value: 'simple', label: 'Simple question', icon: FileText },
  { value: 'fill', label: 'Fill in the blanks', icon: AlignLeft },
  { value: 'mcq', label: 'Multiple choice', icon: CheckSquare },
  { value: 'short', label: 'Short answer', icon: ListOrdered },
]

const OPTIONS_PER_ROW = [
  { value: 4, label: '4 per row' },
  { value: 3, label: '3 per row' },
  { value: 2, label: '2 per row' },
]

const INPUT =
  'w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
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

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

const fmtDate = (d = new Date()) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })

const clone = (o) => JSON.parse(JSON.stringify(o))

const toRoman = (n) => {
  const map = [[10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']]
  let r = ''
  map.forEach(([v, s]) => { while (n >= v) { r += s; n -= v } })
  return r
}

const partLabel = (i, style) => {
  const n = i + 1
  if (style === 'roman') return `${toRoman(n)}.`
  if (style === 'alpha') return `${String.fromCharCode(96 + n)}.`
  if (style === 'number') return `${n}.`
  if (style === 'paren') return `(${n})`
  return `${n}.`
}

const optionsLabel = (i) => `${String.fromCharCode(65 + i)}.`

// ─────────────────────────────────────────────
// Defaults
// ─────────────────────────────────────────────
const DEFAULT_TEMPLATE = {
  id: uid(),
  name: 'Standard Exam Template',
  pageSize: 'A4',
  font: FONTS[0].value,
  accent: '#1e40af',
  showLogo: true,
  showSchoolName: true,
  showSchoolAddress: true,
  showSession: true,
  showTerm: true,
  showSubject: true,
  showClass: true,
  showTime: true,
  showTotalMarks: true,
  showInstructions: true,
  instructionsText: 'Attempt all questions. Write your name and roll number clearly on the answer sheet.',
  showSignature: true,
  signatureLabel: 'Principal',
  showSerial: true,
  paperBorder: true,
  markBoxPosition: 'right',
  // ── Question layout rules ──
  questionsPerPage: 5,
  optionsPerRow: 4,
  partsLabelStyle: 'roman',
  sections: [
    { id: uid(), name: 'Section A', description: 'Multiple Choice Questions', marksPerQuestion: 1 },
    { id: uid(), name: 'Section B', description: 'Short Questions', marksPerQuestion: 2 },
    { id: uid(), name: 'Section C', description: 'Long Questions', marksPerQuestion: 5 },
  ],
}

const DEFAULT_PAPER = {
  templateId: '',
  subject: '',
  grade: '',
  section: '',
  session: '',
  term: 'Mid Term',
  timeAllowed: '2 hours',
  totalMarks: 100,
  questions: {},
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export default function PaperComposingPage() {
  const ctx = useProgram() || {}
  const programValue = ctx.program || 'school'
  const isAcademy = programValue === 'academy'

  const [tab, setTab] = useState('compose')
  const [school, setSchool] = useState({ name: '', address: '', phone: '', logo: '' })
  const [templates, setTemplates] = useState([])
  const [activeTemplateId, setActiveTemplateId] = useState('')
  const [paper, setPaper] = useState(DEFAULT_PAPER)
  const [sessionOptions, setSessionOptions] = useState([])

  const hydrated = useRef(false)

  // Load templates
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TEMPLATES_KEY)
      if (raw) {
        const list = JSON.parse(raw)
        if (Array.isArray(list) && list.length) {
          setTemplates(list)
          setActiveTemplateId(list[0].id)
          return
        }
      }
    } catch {}
    const seed = [DEFAULT_TEMPLATE]
    setTemplates(seed)
    setActiveTemplateId(seed[0].id)
    try { localStorage.setItem(TEMPLATES_KEY, JSON.stringify(seed)) } catch {}
    hydrated.current = true
  }, [])

  useEffect(() => {
    if (!hydrated.current || !templates.length) return
    try { localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates)) } catch {}
  }, [templates])

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
        if (arr.length && !paper.session) setPaper((p) => ({ ...p, session: arr[0] }))
      })
      .catch(() => {})
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programValue])

  const activeTemplate = useMemo(
    () => templates.find((t) => t.id === activeTemplateId) || templates[0] || null,
    [templates, activeTemplateId]
  )

  useEffect(() => {
    if (activeTemplate && paper.templateId !== activeTemplate.id) {
      setPaper((p) => ({ ...p, templateId: activeTemplate.id }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTemplateId])

  useEffect(() => {
    if (!activeTemplate) return
    setPaper((p) => {
      const next = { ...p, questions: { ...p.questions } }
      activeTemplate.sections.forEach((sec) => {
        if (!Array.isArray(next.questions[sec.id])) next.questions[sec.id] = []
      })
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTemplate?.id, activeTemplate?.sections?.map((s) => s.id).join(',')])

  // Template ops
  const updateTemplate = (patch) =>
    setTemplates((prev) => prev.map((t) => (t.id === activeTemplateId ? { ...t, ...patch } : t)))

  const addNewTemplate = () => {
    const t = { ...clone(DEFAULT_TEMPLATE), id: uid(), name: `Template ${templates.length + 1}` }
    setTemplates((prev) => [...prev, t])
    setActiveTemplateId(t.id)
    toast.success('New template added')
  }

  const duplicateTemplate = () => {
    if (!activeTemplate) return
    const t = { ...clone(activeTemplate), id: uid(), name: `${activeTemplate.name} (copy)` }
    setTemplates((prev) => [...prev, t])
    setActiveTemplateId(t.id)
    toast.success('Template duplicated')
  }

  const deleteTemplate = (id) => {
    if (templates.length === 1) {
      toast.error('At least one template must remain')
      return
    }
    if (!window.confirm('Delete this template?')) return
    const next = templates.filter((t) => t.id !== id)
    setTemplates(next)
    if (activeTemplateId === id) setActiveTemplateId(next[0].id)
  }

  const addSection = () => {
    const sec = {
      id: uid(),
      name: `Section ${String.fromCharCode(65 + (activeTemplate?.sections?.length || 0))}`,
      description: 'Questions',
      marksPerQuestion: 5,
    }
    updateTemplate({ sections: [...activeTemplate.sections, sec] })
  }

  const updateSection = (id, patch) => {
    updateTemplate({
      sections: activeTemplate.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    })
  }

  const removeSection = (id) => {
    if (!window.confirm('Remove this section and all its questions?')) return
    updateTemplate({ sections: activeTemplate.sections.filter((s) => s.id !== id) })
    setPaper((p) => {
      const next = { ...p, questions: { ...p.questions } }
      delete next.questions[id]
      return next
    })
  }

  const moveSection = (id, dir) => {
    const arr = [...activeTemplate.sections]
    const i = arr.findIndex((s) => s.id === id)
    if (i < 0) return
    const j = dir === 'up' ? i - 1 : i + 1
    if (j < 0 || j >= arr.length) return
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    updateTemplate({ sections: arr })
  }

  // Question ops
  const addQuestion = (sectionId, type = 'simple') => {
    setPaper((p) => {
      const list = Array.isArray(p.questions[sectionId]) ? [...p.questions[sectionId]] : []
      const sec = activeTemplate?.sections.find((s) => s.id === sectionId)
      const q = {
        id: uid(),
        type,
        text: '',
        marks: sec?.marksPerQuestion || 5,
        parts: [],
      }
      if (type === 'fill') {
        q.text = 'Fill in the blanks:'
        q.parts = [1, 2, 3, 4, 5].map(() => ({ id: uid(), text: '' }))
      } else if (type === 'mcq') {
        q.text = 'Choose the correct option:'
        q.parts = [1, 2, 3, 4, 5].map(() => ({
          id: uid(),
          text: '',
          options: ['', '', '', ''],
        }))
      }
      list.push(q)
      return { ...p, questions: { ...p.questions, [sectionId]: list } }
    })
  }

  const updateQuestion = (sectionId, qid, patch) => {
    setPaper((p) => ({
      ...p,
      questions: {
        ...p.questions,
        [sectionId]: (p.questions[sectionId] || []).map((q) =>
          q.id === qid ? { ...q, ...patch } : q
        ),
      },
    }))
  }

  const removeQuestion = (sectionId, qid) => {
    setPaper((p) => ({
      ...p,
      questions: {
        ...p.questions,
        [sectionId]: (p.questions[sectionId] || []).filter((q) => q.id !== qid),
      },
    }))
  }

  const moveQuestion = (sectionId, qid, dir) => {
    setPaper((p) => {
      const arr = [...(p.questions[sectionId] || [])]
      const i = arr.findIndex((q) => q.id === qid)
      if (i < 0) return p
      const j = dir === 'up' ? i - 1 : i + 1
      if (j < 0 || j >= arr.length) return p
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      return { ...p, questions: { ...p.questions, [sectionId]: arr } }
    })
  }

  // Sub-part ops
  const addPart = (sectionId, qid) => {
    setPaper((p) => ({
      ...p,
      questions: {
        ...p.questions,
        [sectionId]: (p.questions[sectionId] || []).map((q) => {
          if (q.id !== qid) return q
          const part = q.type === 'mcq'
            ? { id: uid(), text: '', options: ['', '', '', ''] }
            : { id: uid(), text: '' }
          return { ...q, parts: [...(q.parts || []), part] }
        }),
      },
    }))
  }

  const updatePart = (sectionId, qid, partId, patch) => {
    setPaper((p) => ({
      ...p,
      questions: {
        ...p.questions,
        [sectionId]: (p.questions[sectionId] || []).map((q) => {
          if (q.id !== qid) return q
          return {
            ...q,
            parts: (q.parts || []).map((pt) => (pt.id === partId ? { ...pt, ...patch } : pt)),
          }
        }),
      },
    }))
  }

  const removePart = (sectionId, qid, partId) => {
    setPaper((p) => ({
      ...p,
      questions: {
        ...p.questions,
        [sectionId]: (p.questions[sectionId] || []).map((q) => {
          if (q.id !== qid) return q
          return { ...q, parts: (q.parts || []).filter((pt) => pt.id !== partId) }
        }),
      },
    }))
  }

  const updateOption = (sectionId, qid, partId, optIndex, value) => {
    setPaper((p) => ({
      ...p,
      questions: {
        ...p.questions,
        [sectionId]: (p.questions[sectionId] || []).map((q) => {
          if (q.id !== qid) return q
          return {
            ...q,
            parts: (q.parts || []).map((pt) => {
              if (pt.id !== partId) return pt
              const opts = [...(pt.options || [])]
              opts[optIndex] = value
              return { ...pt, options: opts }
            }),
          }
        }),
      },
    }))
  }

  const computedTotalMarks = useMemo(() => {
    let total = 0
    if (activeTemplate) {
      activeTemplate.sections.forEach((sec) => {
        ;(paper.questions[sec.id] || []).forEach((q) => { total += Number(q.marks) || 0 })
      })
    }
    return total
  }, [paper.questions, activeTemplate])

  const resetPaper = () => {
    if (!window.confirm('Clear all questions from this paper?')) return
    setPaper((p) => ({ ...p, questions: {} }))
    toast.success('Paper cleared')
  }

  // ─────────────────────────────────────────────
  // PRINT
  // ─────────────────────────────────────────────
  const handlePrint = () => {
    if (!activeTemplate) return
    const hasAny = activeTemplate.sections.some((sec) => (paper.questions[sec.id] || []).length > 0)
    if (!hasAny) {
      toast.error('Add at least one question first')
      return
    }
    if (!paper.subject || !paper.grade) {
      toast.error('Please fill subject and class')
      return
    }

    const win = window.open('', '_blank', 'width=1000,height=800')
    if (!win) {
      toast.error('Please allow pop-ups to print')
      return
    }

    const T = activeTemplate
    const pageCSS = T.pageSize === 'A5'
      ? '@page { size: A5; margin: 10mm; }'
      : '@page { size: A4; margin: 12mm; }'

    const logoHtml = T.showLogo && school.logo
      ? `<img src="${esc(school.logo)}" alt="" style="width:22mm;height:22mm;object-fit:contain;border-radius:3mm;" />`
      : ''

    const headerHtml = `
      <div class="head">
        ${logoHtml}
        <div class="head-info">
          ${T.showSchoolName ? `<div class="school-name">${esc(school.name || 'School Name')}</div>` : ''}
          ${T.showSchoolAddress && school.address ? `<div class="school-addr">${esc(school.address)}</div>` : ''}
          ${school.phone ? `<div class="school-addr">Phone: ${esc(school.phone)}</div>` : ''}
        </div>
      </div>
      <div class="head-sep"></div>
      <div class="paper-title">
        <div class="paper-title-text">${esc(paper.term || 'EXAMINATION')}${paper.session ? ' — ' + esc(paper.session) : ''}</div>
      </div>
      <div class="meta">
        ${T.showSubject && paper.subject ? `<div><b>Subject:</b> ${esc(paper.subject)}</div>` : ''}
        ${T.showClass && paper.grade ? `<div><b>Class:</b> ${esc(paper.grade)}${paper.section ? ' - ' + esc(paper.section) : ''}</div>` : ''}
        ${T.showTime && paper.timeAllowed ? `<div><b>Time:</b> ${esc(paper.timeAllowed)}</div>` : ''}
        ${T.showTotalMarks ? `<div><b>Total Marks:</b> ${computedTotalMarks || paper.totalMarks}</div>` : ''}
        <div><b>Date:</b> ${fmtDate()}</div>
        ${T.showSession && paper.session ? `<div><b>Session:</b> ${esc(paper.session)}</div>` : ''}
      </div>
      ${T.showInstructions && T.instructionsText ? `<div class="instr"><b>Instructions:</b> ${esc(T.instructionsText)}</div>` : ''}
    `

    let qCounter = 0
    const sectionsHtml = T.sections.map((sec) => {
      const list = paper.questions[sec.id] || []
      if (!list.length) return ''
      const sectionMarks = list.reduce((sum, q) => sum + (Number(q.marks) || 0), 0)

      const questionsHtml = list.map((q) => {
        qCounter += 1
        const partsHtml = renderParts(q, T)
        const mainText = esc(q.text || '').replace(/\n/g, '<br/>')
        const marksBox = T.markBoxPosition === 'inline'
          ? `<span class="marks-inline">(${q.marks})</span>`
          : `<span class="marks">${q.marks}</span>`
        return `<div class="question">
          <div class="q-line">
            <span class="q-num">Q${qCounter}.</span>
            <div class="q-text">${mainText} ${T.markBoxPosition === 'inline' ? marksBox : ''}</div>
            ${T.markBoxPosition !== 'inline' ? marksBox : ''}
          </div>
          ${partsHtml}
        </div>`
      }).join('')

      return `
        <div class="section">
          <div class="section-head">
            <span class="sec-name">${esc(sec.name)}</span>
            <span class="sec-desc">${esc(sec.description || '')}</span>
            <span class="sec-marks">${sectionMarks} Marks</span>
          </div>
          ${questionsHtml}
        </div>
      `
    }).join('')

    const footerHtml = `
      <div class="paper-footer">
        <div class="footer-line"></div>
        <div class="footer-row">
          <div class="footer-sign">
            ${T.showSignature ? `<div class="sig-line"></div><div class="sig-label">${esc(T.signatureLabel || 'Principal')}</div>` : ''}
          </div>
          <div class="footer-center"><b>Total Marks:</b> ${computedTotalMarks}</div>
          <div class="footer-end">
            ${T.showSerial ? `<div class="serial">PAPER-${Date.now().toString(36).toUpperCase()}</div>` : ''}
          </div>
        </div>
      </div>
    `

    const baseSize = T.pageSize === 'A5' ? '10pt' : '10.5pt'

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<title>${esc(paper.subject || 'Paper')} — ${esc(paper.grade || '')}</title>
<style>
  ${pageCSS}
  * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  html, body { margin: 0; padding: 0; background: #fff; font-family: ${T.font}; color: #0f172a; }
  .paper { width: 100%; ${T.paperBorder ? `border: 0.4mm solid ${T.accent}; padding: 5mm; border-radius: 2mm;` : ''} }
  .head { display: flex; align-items: center; gap: 5mm; padding-bottom: 3mm; }
  .head-info { flex: 1; }
  .school-name { font-size: 16pt; font-weight: 800; color: ${T.accent}; line-height: 1.1; text-transform: uppercase; }
  .school-addr { font-size: 8.5pt; color: #475569; margin-top: 0.6mm; }
  .head-sep { height: 0.5mm; background: ${T.accent}; margin: 1.5mm 0 2.5mm; border-radius: 1mm; }
  .paper-title { text-align: center; margin-bottom: 2.5mm; }
  .paper-title-text { display: inline-block; font-size: 12pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1mm; padding: 1.2mm 5mm; background: ${T.accent}1A; border-radius: 2mm; }
  .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5mm 5mm; font-size: 9.5pt; margin-bottom: 2.5mm; }
  .meta b { color: ${T.accent}; }
  .instr { font-size: 8.5pt; color: #475569; background: #f8fafc; padding: 2mm 3mm; border-left: 1mm solid ${T.accent}; margin-bottom: 3mm; border-radius: 1mm; }
  .instr b { color: #0f172a; }
  .section { margin-bottom: 4mm; }
  .section-head { display: flex; align-items: center; justify-content: space-between; background: ${T.accent}; color: #fff; padding: 1.5mm 3mm; border-radius: 1.5mm; margin-bottom: 2mm; }
  .sec-name { font-size: 10pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4mm; }
  .sec-desc { font-size: 8.5pt; opacity: 0.9; font-style: italic; flex: 1; text-align: center; }
  .sec-marks { font-size: 8.5pt; font-weight: 700; }
  .question { padding: 1.5mm 0 2mm; border-bottom: 0.2mm dotted #cbd5e1; page-break-inside: avoid; break-inside: avoid; }
  .question:last-child { border-bottom: none; }
  .q-line { display: flex; align-items: flex-start; gap: 2mm; }
  .q-num { font-size: ${baseSize}; font-weight: 800; color: ${T.accent}; flex: none; width: 10mm; }
  .q-text { flex: 1; font-size: ${baseSize}; line-height: 1.5; }
  .marks { flex: none; width: 11mm; text-align: center; font-size: 8.5pt; font-weight: 700; color: ${T.accent}; background: ${T.accent}14; padding: 0.8mm 0; border-radius: 1mm; }
  .marks-inline { color: ${T.accent}; font-weight: 700; font-size: 8.5pt; margin-left: 1mm; }
  /* Sub-parts */
  .parts { margin-top: 1mm; padding-left: 10mm; display: flex; flex-direction: column; gap: 1mm; }
  .part-fill { display: flex; align-items: baseline; gap: 2mm; font-size: ${baseSize}; }
  .part-fill .p-label { color: ${T.accent}; font-weight: 700; flex: none; width: 8mm; }
  .part-fill .p-text { flex: 1; }
  .part-mcq { margin-top: 1mm; }
  .part-mcq .p-stem { font-size: ${baseSize}; display: flex; gap: 2mm; }
  .part-mcq .p-label { color: ${T.accent}; font-weight: 700; flex: none; width: 8mm; }
  .part-mcq .p-text { flex: 1; }
  .options-grid { display: grid; grid-template-columns: repeat(${T.optionsPerRow}, 1fr); gap: 1mm 4mm; margin-top: 1mm; padding-left: 10mm; }
  .opt { font-size: ${baseSize}; }
  .opt .opt-letter { color: ${T.accent}; font-weight: 700; }
  /* Footer */
  .paper-footer { margin-top: 4mm; }
  .footer-line { height: 0.3mm; background: #cbd5e1; margin-bottom: 2.5mm; }
  .footer-row { display: flex; align-items: center; justify-content: space-between; }
  .footer-sign { min-width: 45mm; text-align: center; }
  .sig-line { width: 40mm; border-top: 0.3mm solid #0f172a; margin: 0 auto; }
  .sig-label { font-size: 8.5pt; color: #475569; margin-top: 1mm; }
  .footer-center { flex: 1; text-align: center; font-size: 9pt; }
  .footer-center b { color: ${T.accent}; }
  .footer-end { min-width: 35mm; text-align: right; }
  .serial { font-size: 7pt; color: #94a3b8; font-family: 'Courier New', monospace; letter-spacing: 0.3mm; }
</style></head>
<body>
<div class="paper">
  ${headerHtml}
  ${sectionsHtml}
  ${footerHtml}
</div>
<script>window.onload = function () { setTimeout(function () { window.print() }, 600) }</script>
</body></html>`

    win.document.open()
    win.document.write(html)
    win.document.close()
  }

  // Renders fill / mcq / short / simple question sub-parts
  const renderParts = (q, T) => {
    if (!Array.isArray(q.parts) || !q.parts.length) return ''
    if (q.type === 'fill') {
      return `<div class="parts">${q.parts.map((p, i) => `
        <div class="part-fill">
          <span class="p-label">${partLabel(i, T.partsLabelStyle)}</span>
          <span class="p-text">${esc(p.text || '____________________')}</span>
        </div>`).join('')}</div>`
    }
    if (q.type === 'mcq') {
      return `<div class="parts">${q.parts.map((p, i) => `
        <div class="part-mcq">
          <div class="p-stem">
            <span class="p-label">${partLabel(i, T.partsLabelStyle)}</span>
            <span class="p-text">${esc(p.text || '____________')}</span>
          </div>
          <div class="options-grid">
            ${(p.options || []).map((opt, j) => `
              <div class="opt"><span class="opt-letter">${optionsLabel(j)}</span> ${esc(opt || '___')}</div>
            `).join('')}
          </div>
        </div>`).join('')}</div>`
    }
    return ''
  }

  // ─────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────
  const accent = isAcademy ? 'from-violet-500 to-purple-600' : 'from-indigo-500 to-blue-600'

  return (
    <div className="p-7">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${accent} text-white flex items-center justify-center shadow`}>
            <FileEdit size={22} />
          </div>
          <div>
            <h2 className="font-bold text-2xl leading-tight">Paper Composing</h2>
            <p className="text-xs text-slate-500">
              Design a template once → compose papers with sub-parts → print A4 / A5
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={resetPaper}
            variant="outline"
            className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
          >
            <RotateCcw size={15} /> Clear Questions
          </Button>
          <Button onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
            <Printer size={15} /> Print / Save PDF
          </Button>
        </div>
      </div>

      <div className="flex gap-2 mb-5 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab('compose')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition ${
            tab === 'compose' ? 'bg-white text-indigo-700 shadow' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText size={16} /> Compose Paper
        </button>
        <button
          onClick={() => setTab('templates')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition ${
            tab === 'templates' ? 'bg-white text-indigo-700 shadow' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layout size={16} /> Design Templates
        </button>
      </div>

      {tab === 'templates' ? (
        <TemplatesTab
          templates={templates}
          activeId={activeTemplateId}
          setActiveId={setActiveTemplateId}
          active={activeTemplate}
          update={updateTemplate}
          addNew={addNewTemplate}
          duplicate={duplicateTemplate}
          deleteT={deleteTemplate}
          addSection={addSection}
          updateSection={updateSection}
          removeSection={removeSection}
          moveSection={moveSection}
          school={school}
        />
      ) : (
        <ComposeTab
          templates={templates}
          active={activeTemplate}
          setActiveId={setActiveTemplateId}
          paper={paper}
          setPaper={setPaper}
          addQuestion={addQuestion}
          updateQuestion={updateQuestion}
          removeQuestion={removeQuestion}
          moveQuestion={moveQuestion}
          addPart={addPart}
          updatePart={updatePart}
          removePart={removePart}
          updateOption={updateOption}
          computedTotalMarks={computedTotalMarks}
          sessionOptions={sessionOptions}
          school={school}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Templates Tab
// ─────────────────────────────────────────────
function TemplatesTab({
  templates, activeId, setActiveId, active, update,
  addNew, duplicate, deleteT, addSection, updateSection, removeSection, moveSection, school,
}) {
  if (!active) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
        <p className="mt-2 text-sm text-slate-500">Loading templates…</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6 items-start">
      <div className="space-y-4">
        {/* Template picker */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-800">1. Template</h3>
            <div className="flex gap-1">
              <button onClick={addNew} className="p-1.5 rounded hover:bg-indigo-50 text-indigo-600" title="New">
                <Plus size={16} />
              </button>
              <button onClick={duplicate} className="p-1.5 rounded hover:bg-indigo-50 text-indigo-600" title="Duplicate">
                <Copy size={15} />
              </button>
              <button onClick={() => deleteT(activeId)} className="p-1.5 rounded hover:bg-red-50 text-red-600" title="Delete">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
          <select className={INPUT} value={activeId} onChange={(e) => setActiveId(e.target.value)}>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <div className="mt-2">
            <label className={LABEL}>Template name</label>
            <input
              className={INPUT}
              value={active.name}
              onChange={(e) => update({ name: e.target.value })}
            />
          </div>
        </div>

        {/* Design */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 mb-3">2. Design</h3>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className={LABEL}>Page size</label>
              <select className={INPUT} value={active.pageSize} onChange={(e) => update({ pageSize: e.target.value })}>
                {PAGE_SIZES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Font</label>
              <select className={INPUT} value={active.font} onChange={(e) => update({ font: e.target.value })}>
                {FONTS.map((f) => <option key={f.label} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Accent color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={active.accent}
                  onChange={(e) => update({ accent: e.target.value })}
                  className="w-9 h-9 rounded border border-slate-300 cursor-pointer p-0.5 bg-white"
                />
                <input
                  className={INPUT}
                  value={active.accent}
                  onChange={(e) => update({ accent: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className={LABEL}>Mark box</label>
              <select className={INPUT} value={active.markBoxPosition} onChange={(e) => update({ markBoxPosition: e.target.value })}>
                <option value="right">Right</option>
                <option value="left">Left</option>
                <option value="inline">Inline</option>
              </select>
            </div>
          </div>

          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 mt-3">Question layout</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className={LABEL}>Questions per page</label>
              <input
                type="number"
                min={1}
                max={20}
                className={INPUT}
                value={active.questionsPerPage}
                onChange={(e) => update({ questionsPerPage: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className={LABEL}>MCQ options per row</label>
              <select className={INPUT} value={active.optionsPerRow} onChange={(e) => update({ optionsPerRow: Number(e.target.value) })}>
                {OPTIONS_PER_ROW.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className={LABEL}>Sub-part label style</label>
              <select className={INPUT} value={active.partsLabelStyle} onChange={(e) => update({ partsLabelStyle: e.target.value })}>
                {PART_STYLES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 mt-3">Show in paper</p>
          <div className="grid grid-cols-2 gap-y-2 gap-x-3">
            {[
              ['showLogo', 'School logo'],
              ['showSchoolName', 'School name'],
              ['showSchoolAddress', 'School address'],
              ['showSession', 'Session'],
              ['showTerm', 'Term'],
              ['showSubject', 'Subject'],
              ['showClass', 'Class'],
              ['showTime', 'Time allowed'],
              ['showTotalMarks', 'Total marks'],
              ['showInstructions', 'Instructions'],
              ['showSignature', 'Signature'],
              ['showSerial', 'Serial number'],
              ['paperBorder', 'Paper border'],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!active[key]}
                  onChange={(e) => update({ [key]: e.target.checked })}
                  className="w-3.5 h-3.5 accent-indigo-600"
                />
                {label}
              </label>
            ))}
          </div>

          <div className="mt-3">
            <label className={LABEL}>Instructions text</label>
            <textarea
              className={INPUT}
              rows={2}
              value={active.instructionsText}
              onChange={(e) => update({ instructionsText: e.target.value })}
            />
          </div>
          <div className="mt-3">
            <label className={LABEL}>Signature label</label>
            <input
              className={INPUT}
              value={active.signatureLabel}
              onChange={(e) => update({ signatureLabel: e.target.value })}
            />
          </div>
        </div>

        {/* Sections */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-800">3. Sections</h3>
            <button onClick={addSection} className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800">
              <Plus size={14} /> Add
            </button>
          </div>
          <div className="space-y-2">
            {active.sections.map((sec, i) => (
              <div key={sec.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2 mb-2">
                  <GripVertical size={14} className="text-slate-400" />
                  <input
                    className="flex-1 min-w-0 bg-transparent text-sm font-bold text-slate-800 outline-none"
                    value={sec.name}
                    onChange={(e) => updateSection(sec.id, { name: e.target.value })}
                  />
                  <button onClick={() => moveSection(sec.id, 'up')} disabled={i === 0} className="p-1 rounded hover:bg-white text-slate-500 disabled:opacity-30">
                    <ChevronUp size={13} />
                  </button>
                  <button onClick={() => moveSection(sec.id, 'down')} disabled={i === active.sections.length - 1} className="p-1 rounded hover:bg-white text-slate-500 disabled:opacity-30">
                    <ChevronDown size={13} />
                  </button>
                  <button onClick={() => removeSection(sec.id)} className="p-1 rounded hover:bg-red-50 text-red-500">
                    <Trash2 size={13} />
                  </button>
                </div>
                <input
                  className="w-full bg-white rounded px-2 py-1 text-xs text-slate-700 outline-none border border-slate-200 focus:border-indigo-500 mb-2"
                  value={sec.description}
                  placeholder="Description"
                  onChange={(e) => updateSection(sec.id, { description: e.target.value })}
                />
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-500">Default marks/question:</span>
                  <input
                    type="number"
                    min={1}
                    className="w-16 px-2 py-1 rounded border border-slate-200 text-xs text-center outline-none focus:border-indigo-500"
                    value={sec.marksPerQuestion}
                    onChange={(e) => updateSection(sec.id, { marksPerQuestion: Number(e.target.value) })}
                  />
                </div>
              </div>
            ))}
            {active.sections.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">No sections yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 min-w-0">
        <div className="flex items-center gap-2 mb-4">
          <Eye size={16} className="text-indigo-600" />
          <h3 className="font-bold text-slate-800">Live template preview ({active.pageSize})</h3>
        </div>
        <div className="rounded-xl bg-slate-100 p-6 overflow-auto" style={{ maxHeight: '80vh' }}>
          <TemplatePreview template={active} school={school} />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Template Preview (shows sample with sub-parts)
// ─────────────────────────────────────────────
function TemplatePreview({ template, school }) {
  const T = template
  const scale = T.pageSize === 'A5' ? 0.85 : 0.62
  const w = T.pageSize === 'A5' ? '148mm' : '210mm'
  const h = T.pageSize === 'A5' ? '210mm' : '297mm'

  return (
    <div
      style={{
        width: w,
        minHeight: h,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        background: '#ffffff',
        padding: '10mm',
        boxSizing: 'border-box',
        fontFamily: T.font,
        color: '#0f172a',
        boxShadow: '0 10px 30px rgba(15,23,42,0.15)',
        borderRadius: '2mm',
        border: T.paperBorder ? `0.4mm solid ${T.accent}` : 'none',
        marginBottom: T.pageSize === 'A5' ? '-30mm' : '-110mm',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '4mm', paddingBottom: '2mm' }}>
        {T.showLogo && school.logo && (
          <img src={school.logo} alt="" style={{ width: '18mm', height: '18mm', objectFit: 'contain', borderRadius: '3mm' }} />
        )}
        <div style={{ flex: 1 }}>
          {T.showSchoolName && (
            <div style={{ fontSize: '16pt', fontWeight: 800, color: T.accent, textTransform: 'uppercase', lineHeight: 1.1 }}>
              {school.name || 'School Name'}
            </div>
          )}
          {T.showSchoolAddress && school.address && (
            <div style={{ fontSize: '8.5pt', color: '#475569', marginTop: '0.6mm' }}>{school.address}</div>
          )}
        </div>
      </div>
      <div style={{ height: '0.5mm', background: T.accent, margin: '1.5mm 0 2.5mm', borderRadius: '1mm' }} />

      <div style={{ textAlign: 'center', marginBottom: '2.5mm' }}>
        <div style={{ display: 'inline-block', fontSize: '12pt', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1mm', padding: '1.2mm 5mm', background: `${T.accent}1A`, borderRadius: '2mm' }}>
          Mid Term — 2025-2026
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5mm 5mm', fontSize: '9.5pt', marginBottom: '2.5mm' }}>
        {T.showSubject && <div><b style={{ color: T.accent }}>Subject:</b> Mathematics</div>}
        {T.showClass && <div><b style={{ color: T.accent }}>Class:</b> 5th - A</div>}
        {T.showTime && <div><b style={{ color: T.accent }}>Time:</b> 2 hours</div>}
        {T.showTotalMarks && <div><b style={{ color: T.accent }}>Total Marks:</b> 100</div>}
        <div><b style={{ color: T.accent }}>Date:</b> {fmtDate()}</div>
        {T.showSession && <div><b style={{ color: T.accent }}>Session:</b> 2025-2026</div>}
      </div>

      {T.showInstructions && T.instructionsText && (
        <div style={{ fontSize: '8.5pt', color: '#475569', background: '#f8fafc', padding: '2mm 3mm', borderLeft: `1mm solid ${T.accent}`, marginBottom: '3mm', borderRadius: '1mm' }}>
          <b style={{ color: '#0f172a' }}>Instructions:</b> {T.instructionsText}
        </div>
      )}

      {T.sections.map((sec) => (
        <div key={sec.id} style={{ marginBottom: '4mm' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: T.accent, color: '#fff', padding: '1.5mm 3mm', borderRadius: '1.5mm', marginBottom: '2mm' }}>
            <span style={{ fontSize: '10pt', fontWeight: 800, textTransform: 'uppercase' }}>{sec.name}</span>
            <span style={{ fontSize: '8.5pt', opacity: 0.9, fontStyle: 'italic', flex: 1, textAlign: 'center' }}>{sec.description}</span>
            <span style={{ fontSize: '8.5pt', fontWeight: 700 }}>— Marks</span>
          </div>

          {/* Sample question 1: fill in blanks */}
          <div style={{ padding: '1.5mm 0', borderBottom: '0.2mm dotted #cbd5e1' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '2mm' }}>
              <span style={{ fontSize: '10.5pt', fontWeight: 800, color: T.accent, width: '10mm' }}>Q1.</span>
              <div style={{ flex: 1, fontSize: '10.5pt' }}>Fill in the blanks:</div>
              <span style={{ width: '11mm', textAlign: 'center', fontSize: '8.5pt', fontWeight: 700, color: T.accent, background: `${T.accent}14`, padding: '0.8mm 0', borderRadius: '1mm' }}>{sec.marksPerQuestion}</span>
            </div>
            <div style={{ marginTop: '1mm', paddingLeft: '10mm', display: 'flex', flexDirection: 'column', gap: '1mm' }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} style={{ display: 'flex', gap: '2mm', fontSize: '10.5pt' }}>
                  <span style={{ color: T.accent, fontWeight: 700, width: '8mm' }}>{partLabel(i - 1, T.partsLabelStyle)}</span>
                  <span style={{ flex: 1 }}>The capital of Pakistan is ____________________</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sample question 2: MCQ */}
          <div style={{ padding: '1.5mm 0', borderBottom: '0.2mm dotted #cbd5e1' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '2mm' }}>
              <span style={{ fontSize: '10.5pt', fontWeight: 800, color: T.accent, width: '10mm' }}>Q2.</span>
              <div style={{ flex: 1, fontSize: '10.5pt' }}>Choose the correct option:</div>
              <span style={{ width: '11mm', textAlign: 'center', fontSize: '8.5pt', fontWeight: 700, color: T.accent, background: `${T.accent}14`, padding: '0.8mm 0', borderRadius: '1mm' }}>{sec.marksPerQuestion}</span>
            </div>
            <div style={{ marginTop: '1mm', paddingLeft: '10mm' }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ marginTop: i === 1 ? 0 : '1.5mm' }}>
                  <div style={{ display: 'flex', gap: '2mm', fontSize: '10.5pt' }}>
                    <span style={{ color: T.accent, fontWeight: 700, width: '8mm' }}>{partLabel(i - 1, T.partsLabelStyle)}</span>
                    <span style={{ flex: 1 }}>What is the name of the fruit?</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${T.optionsPerRow}, 1fr)`, gap: '1mm 4mm', marginTop: '1mm', paddingLeft: '10mm' }}>
                    {['Apple', 'Orange', 'Banana', 'Vegetable'].map((opt, j) => (
                      <div key={j} style={{ fontSize: '10.5pt' }}>
                        <span style={{ color: T.accent, fontWeight: 700 }}>{optionsLabel(j)}</span> {opt}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      <div style={{ marginTop: '4mm' }}>
        <div style={{ height: '0.3mm', background: '#cbd5e1', marginBottom: '2.5mm' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ minWidth: '45mm', textAlign: 'center' }}>
            {T.showSignature && (
              <>
                <div style={{ width: '40mm', borderTop: '0.3mm solid #0f172a', margin: '0 auto' }} />
                <div style={{ fontSize: '8.5pt', color: '#475569', marginTop: '1mm' }}>{T.signatureLabel}</div>
              </>
            )}
          </div>
          <div style={{ flex: 1, textAlign: 'center', fontSize: '9pt' }}>
            <b style={{ color: T.accent }}>Total Marks:</b> 100
          </div>
          <div style={{ minWidth: '35mm', textAlign: 'right' }}>
            {T.showSerial && (
              <div style={{ fontSize: '7pt', color: '#94a3b8', fontFamily: "'Courier New', monospace", letterSpacing: '0.3mm' }}>
                PAPER-XXXXXX
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Compose Tab
// ─────────────────────────────────────────────
function ComposeTab({
  templates, active, setActiveId, paper, setPaper,
  addQuestion, updateQuestion, removeQuestion, moveQuestion,
  addPart, updatePart, removePart, updateOption,
  computedTotalMarks, sessionOptions, school,
}) {
  if (!active) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
        <p className="mt-2 text-sm text-slate-500">Loading…</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-6 items-start">
      {/* LEFT — form */}
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 mb-3">Paper details</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={LABEL}>Template</label>
              <select className={INPUT} value={active.id} onChange={(e) => setActiveId(e.target.value)}>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.pageSize})</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Subject *</label>
              <input
                className={INPUT}
                value={paper.subject}
                onChange={(e) => setPaper((p) => ({ ...p, subject: e.target.value }))}
                placeholder="Mathematics"
              />
            </div>
            <div>
              <label className={LABEL}>Term</label>
              <select className={INPUT} value={paper.term} onChange={(e) => setPaper((p) => ({ ...p, term: e.target.value }))}>
                {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Class *</label>
              <select className={INPUT} value={paper.grade} onChange={(e) => setPaper((p) => ({ ...p, grade: e.target.value }))}>
                <option value="">Select</option>
                {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Section</label>
              <select className={INPUT} value={paper.section} onChange={(e) => setPaper((p) => ({ ...p, section: e.target.value }))}>
                <option value="">—</option>
                {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Session</label>
              <select className={INPUT} value={paper.session} onChange={(e) => setPaper((p) => ({ ...p, session: e.target.value }))}>
                <option value="">—</option>
                {sessionOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Time allowed</label>
              <input
                className={INPUT}
                value={paper.timeAllowed}
                onChange={(e) => setPaper((p) => ({ ...p, timeAllowed: e.target.value }))}
              />
            </div>
            <div className="col-span-2 flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
              <span className="text-xs font-semibold text-indigo-800">Computed total marks</span>
              <span className="text-lg font-extrabold text-indigo-700">{computedTotalMarks}</span>
            </div>
          </div>
        </div>

        {active.sections.map((sec) => {
          const list = paper.questions[sec.id] || []
          const sectionMarks = list.reduce((sum, q) => sum + (Number(q.marks) || 0), 0)
          return (
            <div key={sec.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    {sec.name}
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                      {list.length} q · {sectionMarks} marks
                    </span>
                  </h3>
                  {sec.description && <p className="text-xs text-slate-500 mt-0.5">{sec.description}</p>}
                </div>
                <div className="flex items-center gap-1">
                  {Q_TYPES.map((qt) => {
                    const Icon = qt.icon
                    return (
                      <button
                        key={qt.value}
                        onClick={() => addQuestion(sec.id, qt.value)}
                        className="p-1.5 rounded text-indigo-600 hover:bg-indigo-50"
                        title={`Add ${qt.label}`}
                      >
                        <Icon size={14} />
                      </button>
                    )
                  })}
                </div>
              </div>

              {list.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-lg">
                  No questions yet — use the icons above to add
                </p>
              ) : (
                <div className="space-y-3">
                  {list.map((q, i) => (
                    <QuestionEditor
                      key={q.id}
                      q={q}
                      index={i}
                      sectionId={sec.id}
                      updateQuestion={updateQuestion}
                      removeQuestion={removeQuestion}
                      moveQuestion={moveQuestion}
                      addPart={addPart}
                      updatePart={updatePart}
                      removePart={removePart}
                      updateOption={updateOption}
                      partsLabelStyle={active.partsLabelStyle}
                      isFirst={i === 0}
                      isLast={i === list.length - 1}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* RIGHT — paper preview */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 min-w-0">
        <div className="flex items-center gap-2 mb-4">
          <Eye size={16} className="text-indigo-600" />
          <h3 className="font-bold text-slate-800">Live paper preview ({active.pageSize})</h3>
        </div>
        <div className="rounded-xl bg-slate-100 p-6 overflow-auto" style={{ maxHeight: '80vh' }}>
          <PaperPreview template={active} paper={paper} school={school} computedTotalMarks={computedTotalMarks} />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Question Editor
// ─────────────────────────────────────────────
function QuestionEditor({
  q, index, sectionId,
  updateQuestion, removeQuestion, moveQuestion,
  addPart, updatePart, removePart, updateOption,
  partsLabelStyle, isFirst, isLast,
}) {
  const [open, setOpen] = useState(true)

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50">
      <div className="flex items-center gap-2 p-2">
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => moveQuestion(sectionId, q.id, 'up')}
            disabled={isFirst}
            className="p-0.5 rounded hover:bg-white text-slate-500 disabled:opacity-30"
          >
            <ChevronUp size={12} />
          </button>
          <button
            onClick={() => moveQuestion(sectionId, q.id, 'down')}
            disabled={isLast}
            className="p-0.5 rounded hover:bg-white text-slate-500 disabled:opacity-30"
          >
            <ChevronDown size={12} />
          </button>
        </div>
        <span className="text-xs font-bold text-indigo-600 w-8">Q{index + 1}.</span>
        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
          {Q_TYPES.find((t) => t.value === q.type)?.label}
        </span>
        <div className="flex-1" />
        <input
          type="number"
          min={1}
          value={q.marks}
          onChange={(e) => updateQuestion(sectionId, q.id, { marks: Number(e.target.value) })}
          className="w-14 px-2 py-1 rounded border border-slate-200 text-sm text-center outline-none focus:border-indigo-500 bg-white"
          title="Marks"
        />
        <button onClick={() => setOpen((o) => !o)} className="p-1 rounded hover:bg-white text-slate-500">
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
        <button onClick={() => removeQuestion(sectionId, q.id)} className="p-1 rounded hover:bg-red-50 text-red-500">
          <Trash2 size={13} />
        </button>
      </div>

      {open && (
        <div className="px-2 pb-2 border-t border-slate-200 pt-2">
          <label className="block text-[10px] font-semibold text-slate-600 mb-1">Question stem</label>
          <textarea
            rows={2}
            className="w-full px-2 py-1 rounded border border-slate-200 text-sm text-slate-800 outline-none focus:border-indigo-500 bg-white resize-y"
            value={q.text}
            placeholder="Write the question instruction…"
            onChange={(e) => updateQuestion(sectionId, q.id, { text: e.target.value })}
          />

          {(q.type === 'fill' || q.type === 'mcq') && (
            <>
              <div className="flex items-center justify-between mt-2 mb-1">
                <label className="text-[10px] font-semibold text-slate-600">
                  Sub-parts ({q.parts?.length || 0})
                </label>
                <button
                  onClick={() => addPart(sectionId, q.id)}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                >
                  <Plus size={11} /> Add part
                </button>
              </div>

              <div className="space-y-1.5">
                {(q.parts || []).map((pt, pi) => (
                  <div key={pt.id} className="bg-white rounded border border-slate-200 p-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-indigo-600 w-8">
                        {partLabel(pi, partsLabelStyle)}
                      </span>
                      <input
                        className="flex-1 min-w-0 px-2 py-1 rounded border border-slate-200 text-xs outline-none focus:border-indigo-500"
                        value={pt.text}
                        placeholder={q.type === 'mcq' ? 'Question stem' : 'Part text (use _____ for blanks)'}
                        onChange={(e) => updatePart(sectionId, q.id, pt.id, { text: e.target.value })}
                      />
                      <button
                        onClick={() => removePart(sectionId, q.id, pt.id)}
                        className="p-1 rounded hover:bg-red-50 text-red-500"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    {q.type === 'mcq' && (
                      <div className="mt-1.5 grid grid-cols-2 gap-1.5 pl-8">
                        {(pt.options || []).map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-indigo-600 w-3">
                              {String.fromCharCode(65 + oi)}
                            </span>
                            <input
                              className="flex-1 min-w-0 px-2 py-1 rounded border border-slate-200 text-xs outline-none focus:border-indigo-500"
                              value={opt}
                              placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                              onChange={(e) => updateOption(sectionId, q.id, pt.id, oi, e.target.value)}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Paper Preview (live render)
// ─────────────────────────────────────────────
function PaperPreview({ template, paper, school, computedTotalMarks }) {
  const T = template
  const scale = T.pageSize === 'A5' ? 0.85 : 0.62
  const w = T.pageSize === 'A5' ? '148mm' : '210mm'
  const h = T.pageSize === 'A5' ? '210mm' : '297mm'

  let qCounter = 0

  return (
    <div
      style={{
        width: w,
        minHeight: h,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        background: '#ffffff',
        padding: '10mm',
        boxSizing: 'border-box',
        fontFamily: T.font,
        color: '#0f172a',
        boxShadow: '0 10px 30px rgba(15,23,42,0.15)',
        borderRadius: '2mm',
        border: T.paperBorder ? `0.4mm solid ${T.accent}` : 'none',
        marginBottom: T.pageSize === 'A5' ? '-30mm' : '-110mm',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4mm', paddingBottom: '2mm' }}>
        {T.showLogo && school.logo && (
          <img src={school.logo} alt="" style={{ width: '18mm', height: '18mm', objectFit: 'contain', borderRadius: '3mm' }} />
        )}
        <div style={{ flex: 1 }}>
          {T.showSchoolName && (
            <div style={{ fontSize: '16pt', fontWeight: 800, color: T.accent, textTransform: 'uppercase', lineHeight: 1.1 }}>
              {school.name || 'School Name'}
            </div>
          )}
          {T.showSchoolAddress && school.address && (
            <div style={{ fontSize: '8.5pt', color: '#475569', marginTop: '0.6mm' }}>{school.address}</div>
          )}
          {school.phone && <div style={{ fontSize: '8.5pt', color: '#475569' }}>Phone: {school.phone}</div>}
        </div>
      </div>
      <div style={{ height: '0.5mm', background: T.accent, margin: '1.5mm 0 2.5mm', borderRadius: '1mm' }} />

      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: '2.5mm' }}>
        <div style={{ display: 'inline-block', fontSize: '12pt', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1mm', padding: '1.2mm 5mm', background: `${T.accent}1A`, borderRadius: '2mm' }}>
          {paper.term || 'Examination'}{paper.session ? ' — ' + paper.session : ''}
        </div>
      </div>

      {/* Meta */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5mm 5mm', fontSize: '9.5pt', marginBottom: '2.5mm' }}>
        {T.showSubject && paper.subject && <div><b style={{ color: T.accent }}>Subject:</b> {paper.subject}</div>}
        {T.showClass && paper.grade && <div><b style={{ color: T.accent }}>Class:</b> {paper.grade}{paper.section ? ' - ' + paper.section : ''}</div>}
        {T.showTime && paper.timeAllowed && <div><b style={{ color: T.accent }}>Time:</b> {paper.timeAllowed}</div>}
        {T.showTotalMarks && <div><b style={{ color: T.accent }}>Total Marks:</b> {computedTotalMarks || paper.totalMarks}</div>}
        <div><b style={{ color: T.accent }}>Date:</b> {fmtDate()}</div>
        {T.showSession && paper.session && <div><b style={{ color: T.accent }}>Session:</b> {paper.session}</div>}
      </div>

      {T.showInstructions && T.instructionsText && (
        <div style={{ fontSize: '8.5pt', color: '#475569', background: '#f8fafc', padding: '2mm 3mm', borderLeft: `1mm solid ${T.accent}`, marginBottom: '3mm', borderRadius: '1mm' }}>
          <b style={{ color: '#0f172a' }}>Instructions:</b> {T.instructionsText}
        </div>
      )}

      {/* Sections */}
      {T.sections.map((sec) => {
        const list = paper.questions[sec.id] || []
        if (!list.length) return null
        const sectionMarks = list.reduce((sum, q) => sum + (Number(q.marks) || 0), 0)
        return (
          <div key={sec.id} style={{ marginBottom: '4mm' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: T.accent, color: '#fff', padding: '1.5mm 3mm', borderRadius: '1.5mm', marginBottom: '2mm' }}>
              <span style={{ fontSize: '10pt', fontWeight: 800, textTransform: 'uppercase' }}>{sec.name}</span>
              <span style={{ fontSize: '8.5pt', opacity: 0.9, fontStyle: 'italic', flex: 1, textAlign: 'center' }}>{sec.description}</span>
              <span style={{ fontSize: '8.5pt', fontWeight: 700 }}>{sectionMarks} Marks</span>
            </div>
            {list.map((q) => {
              qCounter += 1
              return (
                <div key={q.id} style={{ padding: '1.5mm 0', borderBottom: '0.2mm dotted #cbd5e1' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '2mm' }}>
                    <span style={{ fontSize: '10.5pt', fontWeight: 800, color: T.accent, width: '10mm' }}>Q{qCounter}.</span>
                    <div style={{ flex: 1, fontSize: '10.5pt', whiteSpace: 'pre-wrap' }}>
                      {q.text || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Question…</span>}
                    </div>
                    <span style={{ width: '11mm', textAlign: 'center', fontSize: '8.5pt', fontWeight: 700, color: T.accent, background: `${T.accent}14`, padding: '0.8mm 0', borderRadius: '1mm' }}>{q.marks}</span>
                  </div>

                  {q.type === 'fill' && Array.isArray(q.parts) && (
                    <div style={{ marginTop: '1mm', paddingLeft: '10mm', display: 'flex', flexDirection: 'column', gap: '1mm' }}>
                      {q.parts.map((pt, i) => (
                        <div key={pt.id} style={{ display: 'flex', gap: '2mm', fontSize: '10.5pt' }}>
                          <span style={{ color: T.accent, fontWeight: 700, width: '8mm' }}>{partLabel(i, T.partsLabelStyle)}</span>
                          <span style={{ flex: 1 }}>{pt.text || '____________________'}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {q.type === 'mcq' && Array.isArray(q.parts) && (
                    <div style={{ marginTop: '1mm', paddingLeft: '10mm' }}>
                      {q.parts.map((pt, i) => (
                        <div key={pt.id} style={{ marginTop: i === 0 ? 0 : '1.5mm' }}>
                          <div style={{ display: 'flex', gap: '2mm', fontSize: '10.5pt' }}>
                            <span style={{ color: T.accent, fontWeight: 700, width: '8mm' }}>{partLabel(i, T.partsLabelStyle)}</span>
                            <span style={{ flex: 1 }}>{pt.text || '____________'}</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${T.optionsPerRow}, 1fr)`, gap: '1mm 4mm', marginTop: '1mm', paddingLeft: '10mm' }}>
                            {(pt.options || []).map((opt, j) => (
                              <div key={j} style={{ fontSize: '10.5pt' }}>
                                <span style={{ color: T.accent, fontWeight: 700 }}>{optionsLabel(j)}</span> {opt || '___'}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}

      {T.sections.every((sec) => !(paper.questions[sec.id] || []).length) && (
        <div style={{ textAlign: 'center', padding: '20mm 0', color: '#94a3b8', fontSize: '11pt', fontStyle: 'italic' }}>
          Add questions on the left to see them here
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: '4mm' }}>
        <div style={{ height: '0.3mm', background: '#cbd5e1', marginBottom: '2.5mm' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ minWidth: '45mm', textAlign: 'center' }}>
            {T.showSignature && (
              <>
                <div style={{ width: '40mm', borderTop: '0.3mm solid #0f172a', margin: '0 auto' }} />
                <div style={{ fontSize: '8.5pt', color: '#475569', marginTop: '1mm' }}>{T.signatureLabel}</div>
              </>
            )}
          </div>
          <div style={{ flex: 1, textAlign: 'center', fontSize: '9pt' }}>
            <b style={{ color: T.accent }}>Total Marks:</b> {computedTotalMarks || paper.totalMarks}
          </div>
          <div style={{ minWidth: '35mm', textAlign: 'right' }}>
            {T.showSerial && (
              <div style={{ fontSize: '7pt', color: '#94a3b8', fontFamily: "'Courier New', monospace", letterSpacing: '0.3mm' }}>
                PAPER-XXXXXX
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}