"use client"

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  FileEdit, Plus, Trash2, Printer, Save, RotateCcw, Loader2,
  Layout, FileText, ChevronDown, ChevronUp, GripVertical, X,
  Type, Palette, ListOrdered, Check, Copy, Eye, Settings,
} from 'lucide-react'
import GlobalApi from '@/app/_services/GlobalApi'
import { useProgram } from '@/src/context/ProgramContext'

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const TEMPLATES_KEY = 'paper_templates_v1'
const PAPERS_KEY = 'paper_papers_v1'

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
const LAYOUTS = [
  { value: 'one-column', label: 'One column' },
  { value: 'two-column', label: 'Two columns' },
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

const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

const fmtDate = (d = new Date()) =>
  new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

const clone = (o) => JSON.parse(JSON.stringify(o))

// Default template
const DEFAULT_TEMPLATE = {
  id: uid(),
  name: 'Standard Exam Template',
  font: FONTS[0].value,
  layout: 'one-column',
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
  markBoxPosition: 'right', // left | right | inline
  sections: [
    { id: uid(), name: 'Section A', description: 'Multiple Choice Questions', marksPerQuestion: 1 },
    { id: uid(), name: 'Section B', description: 'Short Questions', marksPerQuestion: 5 },
    { id: uid(), name: 'Section C', description: 'Long Questions', marksPerQuestion: 10 },
  ],
}

// Default paper
const DEFAULT_PAPER = {
  templateId: '',
  subject: '',
  grade: '',
  section: '',
  session: '',
  term: 'Mid Term',
  timeAllowed: '2 hours',
  totalMarks: 100,
  // questions per section: { sectionId: [ { id, text, marks } ] }
  questions: {},
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export default function PaperComposingPage() {
  const ctx = useProgram() || {}
  const programValue = ctx.program || 'school'
  const isAcademy = programValue === 'academy'

  const [tab, setTab] = useState('compose') // 'templates' | 'compose'

  const [school, setSchool] = useState({ name: '', address: '', phone: '', logo: '' })

  const [templates, setTemplates] = useState([])
  const [activeTemplateId, setActiveTemplateId] = useState('')

  const [paper, setPaper] = useState(DEFAULT_PAPER)

  const [sessionOptions, setSessionOptions] = useState([])
  const [busy, setBusy] = useState(false)

  const hydrated = useRef(false)

  // ── Load everything ──
  useEffect(() => {
    try {
      const rawT = localStorage.getItem(TEMPLATES_KEY)
      if (rawT) {
        const list = JSON.parse(rawT)
        if (Array.isArray(list) && list.length) {
          setTemplates(list)
          setActiveTemplateId(list[0].id)
          return
        }
      }
    } catch {}
    // Seed with default template
    const seed = [DEFAULT_TEMPLATE]
    setTemplates(seed)
    setActiveTemplateId(seed[0].id)
    try {
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(seed))
    } catch {}
    hydrated.current = true
  }, [])

  // Save templates on change
  useEffect(() => {
    if (!hydrated.current || !templates.length) return
    try {
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates))
    } catch {}
  }, [templates])

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

  // ── Students for session options ──
  useEffect(() => {
    let alive = true
    GlobalApi.GetAllStudents?.({ program: programValue })
      .then((resp) => {
        if (!alive) return
        const list = Array.isArray(resp?.data) ? resp.data : []
        const setS = new Set()
        list.forEach((s) => { if (s.session) setS.add(String(s.session).trim()) })
        setSessionOptions(Array.from(setS).sort())
        // Auto-pick newest
        const sorted = Array.from(setS).sort((a, b) => {
          const ay = Number(a.match(/^(\d{4})/)?.[1] || 0)
          const by = Number(b.match(/^(\d{4})/)?.[1] || 0)
          return by - ay
        })
        if (sorted.length && !paper.session) {
          setPaper((p) => ({ ...p, session: sorted[0] }))
        }
      })
      .catch(() => {})
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programValue])

  const activeTemplate = useMemo(
    () => templates.find((t) => t.id === activeTemplateId) || templates[0] || null,
    [templates, activeTemplateId]
  )

  // Auto-set paper.templateId
  useEffect(() => {
    if (activeTemplate && paper.templateId !== activeTemplate.id) {
      setPaper((p) => ({ ...p, templateId: activeTemplate.id }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTemplateId])

  // Initialize questions map when template sections change
  useEffect(() => {
    if (!activeTemplate) return
    setPaper((p) => {
      const next = { ...p, questions: { ...p.questions } }
      activeTemplate.sections.forEach((sec) => {
        if (!Array.isArray(next.questions[sec.id])) {
          next.questions[sec.id] = []
        }
      })
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTemplate?.id, activeTemplate?.sections?.map((s) => s.id).join(',')])

  // ── Template management ──
  const updateTemplate = (patch) =>
    setTemplates((prev) =>
      prev.map((t) => (t.id === activeTemplateId ? { ...t, ...patch } : t))
    )

  const addNewTemplate = () => {
    const t = {
      ...clone(DEFAULT_TEMPLATE),
      id: uid(),
      name: `Template ${templates.length + 1}`,
    }
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
    updateTemplate({
      sections: activeTemplate.sections.filter((s) => s.id !== id),
    })
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

  // ── Question management ──
  const addQuestion = (sectionId) => {
    setPaper((p) => {
      const list = Array.isArray(p.questions[sectionId]) ? [...p.questions[sectionId]] : []
      const sec = activeTemplate?.sections.find((s) => s.id === sectionId)
      list.push({
        id: uid(),
        text: '',
        marks: sec?.marksPerQuestion || 5,
      })
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

  // Computed total marks from questions
  const computedTotalMarks = useMemo(() => {
    let total = 0
    if (activeTemplate) {
      activeTemplate.sections.forEach((sec) => {
        ;(paper.questions[sec.id] || []).forEach((q) => {
          total += Number(q.marks) || 0
        })
      })
    }
    return total
  }, [paper.questions, activeTemplate])

  // ── Reset paper ──
  const resetPaper = () => {
    if (!window.confirm('Clear all questions from this paper?')) return
    setPaper((p) => ({ ...p, questions: {} }))
    toast.success('Paper cleared')
  }

  // ── Print / PDF ──
  const handlePrint = () => {
    if (!activeTemplate) return
    const hasAny = activeTemplate.sections.some(
      (sec) => (paper.questions[sec.id] || []).length > 0
    )
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
    const logoHtml =
      T.showLogo && school.logo
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
      <div class="head-separator"></div>
      <div class="paper-title">
        <div class="paper-title-text">${esc(paper.term || 'EXAMINATION')} ${paper.session ? ' — ' + esc(paper.session) : ''}</div>
      </div>
      <div class="meta-grid">
        ${T.showSubject && paper.subject ? `<div><b>Subject:</b> ${esc(paper.subject)}</div>` : ''}
        ${T.showClass && paper.grade ? `<div><b>Class:</b> ${esc(paper.grade)}${paper.section ? ' - ' + esc(paper.section) : ''}</div>` : ''}
        ${T.showTime && paper.timeAllowed ? `<div><b>Time Allowed:</b> ${esc(paper.timeAllowed)}</div>` : ''}
        ${T.showTotalMarks ? `<div><b>Total Marks:</b> ${computedTotalMarks || paper.totalMarks}</div>` : ''}
        <div><b>Date:</b> ${fmtDate()}</div>
        ${T.showSession && paper.session ? `<div><b>Session:</b> ${esc(paper.session)}</div>` : ''}
      </div>
      ${T.showInstructions && T.instructionsText ? `<div class="instructions"><b>Instructions:</b> ${esc(T.instructionsText)}</div>` : ''}
    `

    const sectionsHtml = T.sections.map((sec) => {
      const list = paper.questions[sec.id] || []
      if (!list.length) return ''
      const sectionMarks = list.reduce((sum, q) => sum + (Number(q.marks) || 0), 0)
      const questionsHtml = list.map((q, i) => {
        const text = (q.text || '').replace(/\n/g, '<br/>')
        const marksHtml = T.markBoxPosition === 'inline'
          ? `<span class="q-marks-inline">(${q.marks})</span>`
          : `<span class="q-marks">${q.marks}</span>`
        return `<div class="question ${T.markBoxPosition === 'left' ? 'q-left' : ''}">
          <span class="q-num">Q${i + 1}.</span>
          <div class="q-text">${text} ${T.markBoxPosition === 'inline' ? marksHtml : ''}</div>
          ${T.markBoxPosition !== 'inline' ? marksHtml : ''}
        </div>`
      }).join('')

      return `
        <div class="section">
          <div class="section-head">
            <div class="section-name">${esc(sec.name)}</div>
            <div class="section-desc">${esc(sec.description || '')}</div>
            <div class="section-marks">${sectionMarks} Marks</div>
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
          <div class="footer-center">
            <div class="footer-total"><b>Total Marks:</b> ${computedTotalMarks}</div>
          </div>
          <div class="footer-end">
            ${T.showSerial ? `<div class="serial">PAPER-${Date.now().toString(36).toUpperCase()}</div>` : ''}
          </div>
        </div>
      </div>
    `

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<title>${esc(paper.subject || 'Paper')} — ${esc(paper.grade || '')}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  html, body { margin: 0; padding: 0; background: #fff; font-family: ${T.font}; color: #0f172a; }
  .paper { width: 100%; ${T.paperBorder ? `border: 0.4mm solid ${T.accent}; padding: 6mm; border-radius: 2mm;` : ''} }
  .head { display: flex; align-items: center; gap: 5mm; padding-bottom: 3mm; }
  .head-info { flex: 1; }
  .school-name { font-size: 18pt; font-weight: 800; color: ${T.accent}; line-height: 1.1; text-transform: uppercase; letter-spacing: 0.2mm; }
  .school-addr { font-size: 9pt; color: #475569; margin-top: 0.8mm; }
  .head-separator { height: 0.6mm; background: ${T.accent}; margin: 2mm 0 3mm; border-radius: 1mm; }
  .paper-title { text-align: center; margin-bottom: 3mm; }
  .paper-title-text { display: inline-block; font-size: 13pt; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 1mm; padding: 1.5mm 6mm; background: ${T.accent}1A; border-radius: 2mm; }
  .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2mm 6mm; font-size: 10pt; margin-bottom: 3mm; }
  .meta-grid b { color: ${T.accent}; }
  .instructions { font-size: 9pt; color: #475569; background: #f8fafc; padding: 2.5mm 3mm; border-left: 1mm solid ${T.accent}; margin-bottom: 4mm; border-radius: 1mm; }
  .instructions b { color: #0f172a; }
  .section { margin-bottom: 5mm; }
  .section-head { display: flex; align-items: center; justify-content: space-between; background: ${T.accent}; color: #fff; padding: 1.8mm 3mm; border-radius: 1.5mm; margin-bottom: 3mm; }
  .section-name { font-size: 11pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5mm; }
  .section-desc { font-size: 9pt; opacity: 0.9; font-style: italic; flex: 1; text-align: center; }
  .section-marks { font-size: 9pt; font-weight: 700; }
  .question { display: flex; align-items: flex-start; gap: 2.5mm; padding: 1.5mm 0; border-bottom: 0.2mm dotted #cbd5e1; ${T.markBoxPosition === 'left' ? 'flex-direction: row-reverse;' : ''} }
  .question:last-child { border-bottom: none; }
  .q-num { font-size: 10pt; font-weight: 800; color: ${T.accent}; flex: none; width: 10mm; }
  .q-text { flex: 1; font-size: 10.5pt; line-height: 1.5; color: #0f172a; }
  .q-marks { flex: none; width: 12mm; text-align: center; font-size: 9pt; font-weight: 700; color: ${T.accent}; background: ${T.accent}14; padding: 1mm 0; border-radius: 1mm; }
  .q-marks-inline { color: ${T.accent}; font-weight: 700; font-size: 9pt; margin-left: 1mm; }
  .paper-footer { margin-top: 6mm; }
  .footer-line { height: 0.3mm; background: #cbd5e1; margin-bottom: 3mm; }
  .footer-row { display: flex; align-items: center; justify-content: space-between; }
  .footer-sign { min-width: 50mm; text-align: center; }
  .sig-line { width: 45mm; border-top: 0.3mm solid #0f172a; margin: 0 auto; }
  .sig-label { font-size: 9pt; color: #475569; margin-top: 1mm; }
  .footer-center { flex: 1; text-align: center; font-size: 10pt; }
  .footer-total b { color: ${T.accent}; }
  .footer-end { min-width: 40mm; text-align: right; }
  .serial { font-size: 7.5pt; color: #94a3b8; font-family: 'Courier New', monospace; letter-spacing: 0.3mm; }
  ${T.layout === 'two-column' ? `
    .section { column-count: 2; column-gap: 8mm; }
    .section-head { column-span: all; }
    .question { break-inside: avoid; }
  ` : ''}
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
            <FileEdit size={22} />
          </div>
          <div>
            <h2 className="font-bold text-2xl leading-tight">Paper Composing</h2>
            <p className="text-xs text-slate-500">
              Design a template once → compose exam papers in minutes → print A4
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
          <Button
            onClick={handlePrint}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
          >
            <Printer size={15} /> Print / Save PDF
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab('compose')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition ${
            tab === 'compose'
              ? 'bg-white text-indigo-700 shadow'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText size={16} /> Compose Paper
        </button>
        <button
          onClick={() => setTab('templates')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition ${
            tab === 'templates'
              ? 'bg-white text-indigo-700 shadow'
              : 'text-slate-600 hover:text-slate-900'
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
  addNew, duplicate, deleteT, addSection, updateSection, removeSection, moveSection,
  school,
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
      {/* LEFT */}
      <div className="space-y-4">
        {/* Template selector */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-800">1. Choose template</h3>
            <div className="flex gap-1">
              <button
                onClick={addNew}
                className="p-1.5 rounded hover:bg-indigo-50 text-indigo-600"
                title="New template"
              >
                <Plus size={16} />
              </button>
              <button
                onClick={duplicate}
                className="p-1.5 rounded hover:bg-indigo-50 text-indigo-600"
                title="Duplicate"
              >
                <Copy size={15} />
              </button>
              <button
                onClick={() => deleteT(activeId)}
                className="p-1.5 rounded hover:bg-red-50 text-red-600"
                title="Delete"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
          <select
            className={INPUT}
            value={activeId}
            onChange={(e) => setActiveId(e.target.value)}
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
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
              <label className={LABEL}>Font</label>
              <select className={INPUT} value={active.font} onChange={(e) => update({ font: e.target.value })}>
                {FONTS.map((f) => <option key={f.label} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Layout</label>
              <select className={INPUT} value={active.layout} onChange={(e) => update({ layout: e.target.value })}>
                {LAYOUTS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
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

          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Show in paper</p>
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
            <button
              onClick={addSection}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              <Plus size={14} /> Add section
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
                  placeholder="Section description"
                  onChange={(e) => updateSection(sec.id, { description: e.target.value })}
                />
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-500">Default marks per question:</span>
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

      {/* RIGHT — preview */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 min-w-0">
        <div className="flex items-center gap-2 mb-4">
          <Eye size={16} className="text-indigo-600" />
          <h3 className="font-bold text-slate-800">Live template preview</h3>
        </div>

        <div className="rounded-xl bg-slate-100 p-6 overflow-auto" style={{ maxHeight: '80vh' }}>
          <div
            style={{
              width: '210mm',
              minHeight: '297mm',
              transform: 'scale(0.62)',
              transformOrigin: 'top left',
              background: '#ffffff',
              padding: '12mm',
              boxSizing: 'border-box',
              fontFamily: active.font,
              color: '#0f172a',
              boxShadow: '0 10px 30px rgba(15,23,42,0.15)',
              borderRadius: '2mm',
              border: active.paperBorder ? `0.4mm solid ${active.accent}` : 'none',
              marginBottom: '-110mm',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5mm', paddingBottom: '3mm' }}>
              {active.showLogo && school.logo && (
                <img src={school.logo} alt="" style={{ width: '22mm', height: '22mm', objectFit: 'contain', borderRadius: '3mm' }} />
              )}
              <div style={{ flex: 1 }}>
                {active.showSchoolName && (
                  <div style={{ fontSize: '18pt', fontWeight: 800, color: active.accent, lineHeight: 1.1, textTransform: 'uppercase', letterSpacing: '0.2mm' }}>
                    {school.name || 'School Name'}
                  </div>
                )}
                {active.showSchoolAddress && school.address && (
                  <div style={{ fontSize: '9pt', color: '#475569', marginTop: '0.8mm' }}>{school.address}</div>
                )}
                {school.phone && (
                  <div style={{ fontSize: '9pt', color: '#475569' }}>Phone: {school.phone}</div>
                )}
              </div>
            </div>
            <div style={{ height: '0.6mm', background: active.accent, margin: '2mm 0 3mm', borderRadius: '1mm' }} />

            {/* Title */}
            <div style={{ textAlign: 'center', marginBottom: '3mm' }}>
              <div style={{ display: 'inline-block', fontSize: '13pt', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '1mm', padding: '1.5mm 6mm', background: `${active.accent}1A`, borderRadius: '2mm' }}>
                Mid Term — 2025-2026
              </div>
            </div>

            {/* Meta */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2mm 6mm', fontSize: '10pt', marginBottom: '3mm' }}>
              {active.showSubject && <div><b style={{ color: active.accent }}>Subject:</b> Mathematics</div>}
              {active.showClass && <div><b style={{ color: active.accent }}>Class:</b> 5th - A</div>}
              {active.showTime && <div><b style={{ color: active.accent }}>Time Allowed:</b> 2 hours</div>}
              {active.showTotalMarks && <div><b style={{ color: active.accent }}>Total Marks:</b> 100</div>}
              <div><b style={{ color: active.accent }}>Date:</b> {fmtDate()}</div>
              {active.showSession && <div><b style={{ color: active.accent }}>Session:</b> 2025-2026</div>}
            </div>

            {active.showInstructions && active.instructionsText && (
              <div style={{ fontSize: '9pt', color: '#475569', background: '#f8fafc', padding: '2.5mm 3mm', borderLeft: `1mm solid ${active.accent}`, marginBottom: '4mm', borderRadius: '1mm' }}>
                <b style={{ color: '#0f172a' }}>Instructions:</b> {active.instructionsText}
              </div>
            )}

            {/* Sections */}
            {active.sections.map((sec) => (
              <div key={sec.id} style={{ marginBottom: '5mm' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: active.accent, color: '#fff', padding: '1.8mm 3mm', borderRadius: '1.5mm', marginBottom: '3mm' }}>
                  <div style={{ fontSize: '11pt', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5mm' }}>{sec.name}</div>
                  <div style={{ fontSize: '9pt', opacity: 0.9, fontStyle: 'italic', flex: 1, textAlign: 'center' }}>{sec.description}</div>
                  <div style={{ fontSize: '9pt', fontWeight: 700 }}>— Marks</div>
                </div>
                {[1, 2, 3].map((n) => (
                  <div key={n} style={{ display: 'flex', alignItems: 'flex-start', gap: '2.5mm', padding: '1.5mm 0', borderBottom: '0.2mm dotted #cbd5e1' }}>
                    <span style={{ fontSize: '10pt', fontWeight: 800, color: active.accent, flex: 'none', width: '10mm' }}>Q{n}.</span>
                    <div style={{ flex: 1, fontSize: '10.5pt', lineHeight: 1.5, color: '#94a3b8', fontStyle: 'italic' }}>
                      Question text will appear here…
                    </div>
                    <span style={{ flex: 'none', width: '12mm', textAlign: 'center', fontSize: '9pt', fontWeight: 700, color: active.accent, background: `${active.accent}14`, padding: '1mm 0', borderRadius: '1mm' }}>
                      {sec.marksPerQuestion}
                    </span>
                  </div>
                ))}
              </div>
            ))}

            {/* Footer */}
            <div style={{ marginTop: '6mm' }}>
              <div style={{ height: '0.3mm', background: '#cbd5e1', marginBottom: '3mm' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ minWidth: '50mm', textAlign: 'center' }}>
                  {active.showSignature && (
                    <>
                      <div style={{ width: '45mm', borderTop: '0.3mm solid #0f172a', margin: '0 auto' }} />
                      <div style={{ fontSize: '9pt', color: '#475569', marginTop: '1mm' }}>{active.signatureLabel}</div>
                    </>
                  )}
                </div>
                <div style={{ flex: 1, textAlign: 'center', fontSize: '10pt' }}>
                  <b style={{ color: active.accent }}>Total Marks:</b> 100
                </div>
                <div style={{ minWidth: '40mm', textAlign: 'right' }}>
                  {active.showSerial && (
                    <div style={{ fontSize: '7.5pt', color: '#94a3b8', fontFamily: "'Courier New', monospace", letterSpacing: '0.3mm' }}>
                      PAPER-XXXXXX
                    </div>
                  )}
                </div>
              </div>
            </div>
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
  computedTotalMarks, sessionOptions, school,
}) {
  if (!active) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
        <p className="mt-2 text-sm text-slate-500">Loading template…</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-6 items-start">
      {/* LEFT — form */}
      <div className="space-y-4">
        {/* Paper details */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 mb-3">Paper details</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={LABEL}>Template</label>
              <select className={INPUT} value={active.id} onChange={(e) => setActiveId(e.target.value)}>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Subject *</label>
              <input
                className={INPUT}
                value={paper.subject}
                onChange={(e) => setPaper((p) => ({ ...p, subject: e.target.value }))}
                placeholder="Mathematics, English…"
              />
            </div>
            <div>
              <label className={LABEL}>Term</label>
              <select
                className={INPUT}
                value={paper.term}
                onChange={(e) => setPaper((p) => ({ ...p, term: e.target.value }))}
              >
                {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Class *</label>
              <select className={INPUT} value={paper.grade} onChange={(e) => setPaper((p) => ({ ...p, grade: e.target.value }))}>
                <option value="">Select class</option>
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
                placeholder="2 hours"
              />
            </div>
            <div className="col-span-2 flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
              <span className="text-xs font-semibold text-indigo-800">Computed total marks</span>
              <span className="text-lg font-extrabold text-indigo-700">{computedTotalMarks}</span>
            </div>
          </div>
        </div>

        {/* Questions per section */}
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
                  {sec.description && (
                    <p className="text-xs text-slate-500 mt-0.5">{sec.description}</p>
                  )}
                </div>
                <button
                  onClick={() => addQuestion(sec.id)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition"
                >
                  <Plus size={13} /> Add
                </button>
              </div>

              {list.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-lg">
                  No questions yet — click <b>Add</b> to start
                </p>
              ) : (
                <div className="space-y-2">
                  {list.map((q, i) => (
                    <div key={q.id} className="flex items-start gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50">
                      <div className="flex flex-col gap-0.5 pt-1">
                        <button
                          onClick={() => moveQuestion(sec.id, q.id, 'up')}
                          disabled={i === 0}
                          className="p-0.5 rounded hover:bg-white text-slate-500 disabled:opacity-30"
                        >
                          <ChevronUp size={12} />
                        </button>
                        <button
                          onClick={() => moveQuestion(sec.id, q.id, 'down')}
                          disabled={i === list.length - 1}
                          className="p-0.5 rounded hover:bg-white text-slate-500 disabled:opacity-30"
                        >
                          <ChevronDown size={12} />
                        </button>
                      </div>
                      <span className="text-xs font-bold text-indigo-600 pt-1.5 w-8">Q{i + 1}.</span>
                      <textarea
                        rows={2}
                        className="flex-1 px-2 py-1 rounded border border-slate-200 text-sm text-slate-800 outline-none focus:border-indigo-500 bg-white resize-y"
                        value={q.text}
                        placeholder="Write the question…"
                        onChange={(e) => updateQuestion(sec.id, q.id, { text: e.target.value })}
                      />
                      <input
                        type="number"
                        min={1}
                        value={q.marks}
                        onChange={(e) => updateQuestion(sec.id, q.id, { marks: Number(e.target.value) })}
                        className="w-14 px-2 py-1 rounded border border-slate-200 text-sm text-center outline-none focus:border-indigo-500 bg-white"
                        title="Marks"
                      />
                      <button
                        onClick={() => removeQuestion(sec.id, q.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-red-500 mt-1"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* RIGHT — live paper preview */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 min-w-0">
        <div className="flex items-center gap-2 mb-4">
          <Eye size={16} className="text-indigo-600" />
          <h3 className="font-bold text-slate-800">Live paper preview</h3>
        </div>

        <div className="rounded-xl bg-slate-100 p-6 overflow-auto" style={{ maxHeight: '80vh' }}>
          <PaperPreview
            template={active}
            paper={paper}
            school={school}
            computedTotalMarks={computedTotalMarks}
          />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Paper Preview
// ─────────────────────────────────────────────
function PaperPreview({ template, paper, school, computedTotalMarks }) {
  const T = template
  return (
    <div
      style={{
        width: '210mm',
        minHeight: '297mm',
        transform: 'scale(0.62)',
        transformOrigin: 'top left',
        background: '#ffffff',
        padding: '12mm',
        boxSizing: 'border-box',
        fontFamily: T.font,
        color: '#0f172a',
        boxShadow: '0 10px 30px rgba(15,23,42,0.15)',
        borderRadius: '2mm',
        border: T.paperBorder ? `0.4mm solid ${T.accent}` : 'none',
        marginBottom: '-110mm',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5mm', paddingBottom: '3mm' }}>
        {T.showLogo && school.logo && (
          <img src={school.logo} alt="" style={{ width: '22mm', height: '22mm', objectFit: 'contain', borderRadius: '3mm' }} />
        )}
        <div style={{ flex: 1 }}>
          {T.showSchoolName && (
            <div style={{ fontSize: '18pt', fontWeight: 800, color: T.accent, lineHeight: 1.1, textTransform: 'uppercase', letterSpacing: '0.2mm' }}>
              {school.name || 'School Name'}
            </div>
          )}
          {T.showSchoolAddress && school.address && (
            <div style={{ fontSize: '9pt', color: '#475569', marginTop: '0.8mm' }}>{school.address}</div>
          )}
          {school.phone && (
            <div style={{ fontSize: '9pt', color: '#475569' }}>Phone: {school.phone}</div>
          )}
        </div>
      </div>
      <div style={{ height: '0.6mm', background: T.accent, margin: '2mm 0 3mm', borderRadius: '1mm' }} />

      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: '3mm' }}>
        <div style={{ display: 'inline-block', fontSize: '13pt', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '1mm', padding: '1.5mm 6mm', background: `${T.accent}1A`, borderRadius: '2mm' }}>
          {paper.term || 'Examination'}{paper.session ? ' — ' + paper.session : ''}
        </div>
      </div>

      {/* Meta */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2mm 6mm', fontSize: '10pt', marginBottom: '3mm' }}>
        {T.showSubject && paper.subject && <div><b style={{ color: T.accent }}>Subject:</b> {paper.subject}</div>}
        {T.showClass && paper.grade && <div><b style={{ color: T.accent }}>Class:</b> {paper.grade}{paper.section ? ' - ' + paper.section : ''}</div>}
        {T.showTime && paper.timeAllowed && <div><b style={{ color: T.accent }}>Time Allowed:</b> {paper.timeAllowed}</div>}
        {T.showTotalMarks && <div><b style={{ color: T.accent }}>Total Marks:</b> {computedTotalMarks || paper.totalMarks}</div>}
        <div><b style={{ color: T.accent }}>Date:</b> {fmtDate()}</div>
        {T.showSession && paper.session && <div><b style={{ color: T.accent }}>Session:</b> {paper.session}</div>}
      </div>

      {T.showInstructions && T.instructionsText && (
        <div style={{ fontSize: '9pt', color: '#475569', background: '#f8fafc', padding: '2.5mm 3mm', borderLeft: `1mm solid ${T.accent}`, marginBottom: '4mm', borderRadius: '1mm' }}>
          <b style={{ color: '#0f172a' }}>Instructions:</b> {T.instructionsText}
        </div>
      )}

      {/* Sections */}
      {T.sections.map((sec) => {
        const list = paper.questions[sec.id] || []
        if (!list.length) return null
        const sectionMarks = list.reduce((sum, q) => sum + (Number(q.marks) || 0), 0)
        return (
          <div key={sec.id} style={{ marginBottom: '5mm' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: T.accent, color: '#fff', padding: '1.8mm 3mm', borderRadius: '1.5mm', marginBottom: '3mm' }}>
              <div style={{ fontSize: '11pt', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5mm' }}>{sec.name}</div>
              <div style={{ fontSize: '9pt', opacity: 0.9, fontStyle: 'italic', flex: 1, textAlign: 'center' }}>{sec.description}</div>
              <div style={{ fontSize: '9pt', fontWeight: 700 }}>{sectionMarks} Marks</div>
            </div>
            {list.map((q, i) => {
              const marksStyle = {
                flex: 'none',
                width: '12mm',
                textAlign: 'center',
                fontSize: '9pt',
                fontWeight: 700,
                color: T.accent,
                background: `${T.accent}14`,
                padding: '1mm 0',
                borderRadius: '1mm',
              }
              return (
                <div
                  key={q.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '2.5mm',
                    padding: '1.5mm 0',
                    borderBottom: '0.2mm dotted #cbd5e1',
                    flexDirection: T.markBoxPosition === 'left' ? 'row-reverse' : 'row',
                  }}
                >
                  <span style={{ fontSize: '10pt', fontWeight: 800, color: T.accent, flex: 'none', width: '10mm' }}>Q{i + 1}.</span>
                  <div style={{ flex: 1, fontSize: '10.5pt', lineHeight: 1.5, color: '#0f172a', whiteSpace: 'pre-wrap' }}>
                    {q.text || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Question text…</span>}
                    {T.markBoxPosition === 'inline' && (
                      <span style={{ color: T.accent, fontWeight: 700, fontSize: '9pt', marginLeft: '1mm' }}>
                        ({q.marks})
                      </span>
                    )}
                  </div>
                  {T.markBoxPosition !== 'inline' && (
                    <span style={marksStyle}>{q.marks}</span>
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
      <div style={{ marginTop: '6mm' }}>
        <div style={{ height: '0.3mm', background: '#cbd5e1', marginBottom: '3mm' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ minWidth: '50mm', textAlign: 'center' }}>
            {T.showSignature && (
              <>
                <div style={{ width: '45mm', borderTop: '0.3mm solid #0f172a', margin: '0 auto' }} />
                <div style={{ fontSize: '9pt', color: '#475569', marginTop: '1mm' }}>{T.signatureLabel}</div>
              </>
            )}
          </div>
          <div style={{ flex: 1, textAlign: 'center', fontSize: '10pt' }}>
            <b style={{ color: T.accent }}>Total Marks:</b> {computedTotalMarks || paper.totalMarks}
          </div>
          <div style={{ minWidth: '40mm', textAlign: 'right' }}>
            {T.showSerial && (
              <div style={{ fontSize: '7.5pt', color: '#94a3b8', fontFamily: "'Courier New', monospace", letterSpacing: '0.3mm' }}>
                PAPER-XXXXXX
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}