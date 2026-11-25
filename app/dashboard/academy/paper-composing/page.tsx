"use client"

import React, { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  FileEdit, Upload, Download, Printer, Trash2, Loader2,
  Type, X, ArrowUp, ArrowDown, RotateCw, Sun, Contrast,
  Eraser, Wand2, Move, ZoomIn, ZoomOut, Save,
} from 'lucide-react'
import { useProgram } from '@/src/context/ProgramContext'

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const clamp = (n, a, b) => Math.min(b, Math.max(a, n))

// Rotate image by degrees on a canvas
function rotateImage(img, deg) {
  const rad = (deg * Math.PI) / 180
  const w = img.width
  const h = img.height
  const cw = Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad))
  const ch = Math.abs(w * Math.sin(rad)) + Math.abs(h * Math.cos(rad))
  const c = document.createElement('canvas')
  c.width = Math.round(cw)
  c.height = Math.round(ch)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.translate(c.width / 2, c.height / 2)
  ctx.rotate(rad)
  ctx.drawImage(img, -w / 2, -h / 2)
  return c
}

// Auto-clean: brighten + increase contrast + desaturate slightly to make whites whiter
function autoClean(img) {
  const c = document.createElement('canvas')
  c.width = img.width
  c.height = img.height
  const ctx = c.getContext('2d')
  ctx.drawImage(img, 0, 0)

  const data = ctx.getImageData(0, 0, c.width, c.height)
  const d = data.data
  for (let i = 0; i < d.length; i += 4) {
    // grayscale mix with slight original color to keep tone
    const r = d[i]
    const g = d[i + 1]
    const b = d[i + 2]
    // contrast: push mid values outward
    const applyContrast = (v, amount = 1.25) => {
      const nv = (v / 255 - 0.5) * amount + 0.5
      return clamp(Math.round(nv * 255), 0, 255)
    }
    let nr = applyContrast(r)
    let ng = applyContrast(g)
    let nb = applyContrast(b)
    // brighten whites
    if (nr > 200) nr = Math.min(255, nr + 20)
    if (ng > 200) ng = Math.min(255, ng + 20)
    if (nb > 200) nb = Math.min(255, nb + 20)
    d[i] = nr
    d[i + 1] = ng
    d[i + 2] = nb
  }
  ctx.putImageData(data, 0, 0)
  return c
}

// Enhance with adjustable brightness & contrast (for slider)
function enhance(img, brightness, contrast) {
  const c = document.createElement('canvas')
  c.width = img.width
  c.height = img.height
  const ctx = c.getContext('2d')
  ctx.drawImage(img, 0, 0)

  const data = ctx.getImageData(0, 0, c.width, c.height)
  const d = data.data
  const bf = brightness // -100..100
  const cf = (259 * (contrast + 255)) / (255 * (259 - contrast)) // contrast -100..100

  for (let i = 0; i < d.length; i += 4) {
    d[i] = clamp(cf * (d[i] + bf) + 0, 0, 255)
    d[i + 1] = clamp(cf * (d[i + 1] + bf) + 0, 0, 255)
    d[i + 2] = clamp(cf * (d[i + 2] + bf) + 0, 0, 255)
  }
  ctx.putImageData(data, 0, 0)
  return c
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export default function PaperComposingPage() {
  const ctx = useProgram() || {}
  const isAcademy = (ctx.program || 'school') === 'academy'

  // Original file → cleaned canvas → data URL
  const [originalDataUrl, setOriginalDataUrl] = useState('')
  const [cleanDataUrl, setCleanDataUrl] = useState('')
  const [rotation, setRotation] = useState(0)
  const [brightness, setBrightness] = useState(0)
  const [contrast, setContrast] = useState(10)

  // Overlay text boxes on top of the image
  const [texts, setTexts] = useState([]) // [{ id, x, y, text, fontSize, color, bold }]
  const [selectedText, setSelectedText] = useState(null)

  // UI
  const [busy, setBusy] = useState(false)
  const [previewMode, setPreviewMode] = useState('image') // 'image' | 'edit'
  const [zoom, setZoom] = useState(1)

  const fileInputRef = useRef(null)
  const dragRef = useRef(null)
  const canvasRef = useRef(null)

  // ── Upload ──
  const onUpload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file (JPG/PNG)')
      return
    }
    setBusy(true)
    try {
      const img = await new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file)
        const im = new Image()
        im.onload = () => { URL.revokeObjectURL(url); resolve(im) }
        im.onerror = (err) => { URL.revokeObjectURL(url); reject(err) }
        im.src = url
      })

      // Keep max dimension ~2400px so processing is fast and PDFs stay small
      const maxDim = 2400
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const base = document.createElement('canvas')
      base.width = Math.round(img.width * scale)
      base.height = Math.round(img.height * scale)
      base.getContext('2d').drawImage(img, 0, 0, base.width, base.height)

      setOriginalDataUrl(base.toDataURL('image/jpeg', 0.95))
      setCleanDataUrl(base.toDataURL('image/jpeg', 0.95))
      setTexts([])
      setRotation(0)
      setBrightness(0)
      setContrast(10)
      setPreviewMode('image')
      toast.success('Paper loaded — previewing exactly as uploaded')
    } catch {
      toast.error('Could not read this image')
    } finally {
      setBusy(false)
    }
  }

  // ── Auto clean (brightness + contrast + sharpen-ish) ──
  const runAutoClean = async () => {
    if (!originalDataUrl) return
    setBusy(true)
    try {
      const img = await loadFromUrl(originalDataUrl)
      let c = img
      if (rotation) c = rotateImage(img, rotation)
      c = autoClean(c)
      c = enhance(c, brightness, contrast)
      setCleanDataUrl(c.toDataURL('image/jpeg', 0.94))
      toast.success('Cleaned — text is now sharper')
    } catch {
      toast.error('Could not process image')
    } finally {
      setBusy(false)
    }
  }

  // ── Manual sliders (apply live) ──
  const applyEnhance = async () => {
    if (!originalDataUrl) return
    setBusy(true)
    try {
      const img = await loadFromUrl(originalDataUrl)
      let c = img
      if (rotation) c = rotateImage(img, rotation)
      c = enhance(c, brightness, contrast)
      setCleanDataUrl(c.toDataURL('image/jpeg', 0.94))
    } catch {
      toast.error('Could not process image')
    } finally {
      setBusy(false)
    }
  }

  const loadFromUrl = (url) =>
    new Promise((resolve, reject) => {
      const im = new Image()
      im.onload = () => resolve(im)
      im.onerror = reject
      im.src = url
    })

  // ── Text overlay ──
  const addText = () => {
    const t = {
      id: uid(),
      x: 10,
      y: 10,
      text: 'Double-click to edit',
      fontSize: 16,
      color: '#111827',
      bold: false,
    }
    setTexts((prev) => [...prev, t])
    setSelectedText(t.id)
    setPreviewMode('edit')
  }

  const updateText = (id, patch) =>
    setTexts((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))

  const removeText = (id) => {
    setTexts((prev) => prev.filter((t) => t.id !== id))
    if (selectedText === id) setSelectedText(null)
  }

  // ── Drag text on image ──
  const startDrag = (e, id) => {
    e.preventDefault()
    const box = e.currentTarget.parentElement.getBoundingClientRect()
    dragRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      boxLeft: box.left,
      boxTop: box.top,
      boxW: box.width,
      boxH: box.height,
    }
    setSelectedText(id)
  }

  useEffect(() => {
    const move = (e) => {
      if (!dragRef.current) return
      const d = dragRef.current
      const dx = ((e.clientX - d.startX) / d.boxW) * 100
      const dy = ((e.clientY - d.startY) / d.boxH) * 100
      setTexts((prev) =>
        prev.map((t) =>
          t.id === d.id
            ? {
                ...t,
                x: clamp(t.x + dx, 0, 100),
                y: clamp(t.y + dy, 0, 100),
              }
            : t
        )
      )
      dragRef.current.startX = e.clientX
      dragRef.current.startY = e.clientY
    }
    const up = () => { dragRef.current = null }
    if (dragRef.current) {
      window.addEventListener('mousemove', move)
      window.addEventListener('mouseup', up)
      return () => {
        window.removeEventListener('mousemove', move)
        window.removeEventListener('mouseup', up)
      }
    }
  }, [texts])

  // ── Download PDF ──
  const downloadPdf = async () => {
    if (!cleanDataUrl) return toast.error('Upload a paper first')
    setBusy(true)
    try {
      // Compose final canvas: cleaned image + text overlays
      const img = await loadFromUrl(cleanDataUrl)
      const c = document.createElement('canvas')
      c.width = img.width
      c.height = img.height
      const g = c.getContext('2d')
      g.drawImage(img, 0, 0)

      texts.forEach((t) => {
        const px = (t.x / 100) * c.width
        const py = (t.y / 100) * c.height
        const fs = (t.fontSize / 100) * c.width * 0.12 + 12
        g.font = `${t.bold ? '700 ' : ''}${fs}px 'Segoe UI', Arial, sans-serif`
        g.fillStyle = t.color
        g.textBaseline = 'top'
        t.text.split('\n').forEach((line, i) => {
          g.fillText(line, px, py + i * fs * 1.2)
        })
      })

      const finalDataUrl = c.toDataURL('image/jpeg', 0.92)

      // Build an A4 PDF via print window (works without any external lib)
      const win = window.open('', '_blank', 'width=900,height=1100')
      if (!win) {
        toast.error('Please allow pop-ups to download PDF')
        return
      }
      const a4Ratio = 210 / 297
      const imgRatio = c.width / c.height
      const isLandscape = imgRatio > 1

      win.document.open()
      win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<title>Paper</title>
<style>
  @page { size: A4 ${isLandscape ? 'landscape' : 'portrait'}; margin: 8mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  html, body { margin: 0; padding: 0; background: #fff; }
  .page { width: 100%; height: 100vh; display: flex; align-items: center; justify-content: center; padding: 8mm; }
  img { max-width: 100%; max-height: 100%; object-fit: contain; }
</style></head>
<body>
<div class="page"><img src="${finalDataUrl}" /></div>
<script>window.onload = function () { setTimeout(function () { window.print() }, 500) }</script>
</body></html>`)
      win.document.close()
      toast.success('Print dialog opened — choose "Save as PDF"')
    } catch {
      toast.error('Could not prepare PDF')
    } finally {
      setBusy(false)
    }
  }

  // ── Print same as above (alias for clarity) ──
  const printPaper = downloadPdf

  // ─────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────
  const accent = isAcademy
    ? 'from-purple-500 to-fuchsia-600'
    : 'from-amber-500 to-orange-600'

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
              Upload a photo of any paper → get the exact paper → edit if needed → download
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onUpload}
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="gap-2"
          >
            <Upload size={16} /> Upload Paper
          </Button>
          <Button
            onClick={downloadPdf}
            disabled={!cleanDataUrl || busy}
            className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Download PDF
          </Button>
        </div>
      </div>

      {!cleanDataUrl ? (
        /* Empty state — big upload box */
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const f = e.dataTransfer.files?.[0]
            if (f) onUpload({ target: { files: [f], value: '' } })
          }}
          className="bg-white rounded-2xl border-2 border-dashed border-slate-300 shadow-sm p-16 text-center cursor-pointer hover:border-amber-500 hover:bg-amber-50/30 transition"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <Upload size={28} />
          </div>
          <h3 className="font-bold text-lg text-slate-800 mb-1">
            Drop your paper photo here
          </h3>
          <p className="text-sm text-slate-500">
            or click to browse — JPG / PNG, any size
          </p>
          <p className="text-[11px] text-slate-400 mt-3">
            The paper is reproduced exactly as uploaded. Clean-up only brightens and sharpens — no content changes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6 items-start">
          {/* ── LEFT: Tools ── */}
          <div className="space-y-4">
            {/* Mode toggle */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Mode
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPreviewMode('image')}
                  className={`px-3 py-2 rounded-lg text-sm font-bold border-2 transition ${
                    previewMode === 'image'
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-amber-400'
                  }`}
                >
                  Image
                </button>
                <button
                  onClick={() => setPreviewMode('edit')}
                  className={`px-3 py-2 rounded-lg text-sm font-bold border-2 transition ${
                    previewMode === 'edit'
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-amber-400'
                  }`}
                >
                  Edit Text
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                {previewMode === 'image'
                  ? 'The exact paper — nothing changed.'
                  : 'Add text boxes on top of the paper.'}
              </p>
            </div>

            {/* Clean tools */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                Clean-up
              </p>

              <Button
                onClick={runAutoClean}
                disabled={busy}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white gap-2 mb-3"
              >
                <Wand2 size={15} /> Auto Clean
              </Button>

              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Rotation: {rotation}°
              </label>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setRotation((r) => r - 90)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold hover:bg-slate-50"
                >
                  <RotateCw size={13} className="-scale-x-100" /> -90°
                </button>
                <button
                  onClick={() => setRotation((r) => r + 90)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold hover:bg-slate-50"
                >
                  <RotateCw size={13} /> +90°
                </button>
              </div>

              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Brightness: {brightness}
              </label>
              <input
                type="range" min="-80" max="80" step="1"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="w-full accent-amber-600 mb-3"
              />

              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Contrast: {contrast}
              </label>
              <input
                type="range" min="-50" max="100" step="1"
                value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                className="w-full accent-amber-600 mb-3"
              />

              <Button
                onClick={applyEnhance}
                disabled={busy}
                variant="outline"
                className="w-full gap-2"
              >
                <Sun size={15} /> Apply Adjustments
              </Button>
            </div>

            {/* Text overlay controls */}
            {previewMode === 'edit' && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Text boxes
                  </p>
                  <Button
                    onClick={addText}
                    className="bg-amber-600 hover:bg-amber-700 text-white gap-1 text-xs h-8 px-2"
                  >
                    <Type size={12} /> Add
                  </Button>
                </div>

                {texts.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    No text yet — click <b>Add</b>
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {texts.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedText(t.id)}
                        className={`p-2 rounded-lg border cursor-pointer ${
                          selectedText === t.id
                            ? 'border-amber-500 bg-amber-50'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Move size={12} className="text-slate-400" />
                          <input
                            className="flex-1 min-w-0 bg-transparent text-xs font-semibold outline-none"
                            value={t.text.split('\n')[0].slice(0, 20)}
                            onChange={(e) => updateText(t.id, { text: e.target.value })}
                          />
                          <button
                            onClick={(e) => { e.stopPropagation(); removeText(t.id) }}
                            className="p-1 rounded hover:bg-red-50 text-red-500"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedText && (() => {
                  const t = texts.find((x) => x.id === selectedText)
                  if (!t) return null
                  return (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Full text
                        </label>
                        <textarea
                          rows={2}
                          className="w-full px-2 py-1 rounded border border-slate-300 text-xs outline-none focus:border-amber-500"
                          value={t.text}
                          onChange={(e) => updateText(t.id, { text: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">
                            Size
                          </label>
                          <input
                            type="range" min="8" max="60" step="1"
                            value={t.fontSize}
                            onChange={(e) => updateText(t.id, { fontSize: Number(e.target.value) })}
                            className="w-full accent-amber-600"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">
                            Color
                          </label>
                          <input
                            type="color"
                            value={t.color}
                            onChange={(e) => updateText(t.id, { color: e.target.value })}
                            className="w-full h-8 rounded border border-slate-300 cursor-pointer p-0.5 bg-white"
                          />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={t.bold}
                          onChange={(e) => updateText(t.id, { bold: e.target.checked })}
                          className="accent-amber-600"
                        />
                        Bold
                      </label>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Reset */}
            <Button
              onClick={() => {
                if (!window.confirm('Clear the uploaded paper and all edits?')) return
                setOriginalDataUrl('')
                setCleanDataUrl('')
                setTexts([])
                setRotation(0)
                setBrightness(0)
                setContrast(10)
                setSelectedText(null)
              }}
              variant="outline"
              className="w-full gap-2 text-red-600 border-red-200 hover:bg-red-50"
            >
              <Eraser size={15} /> Clear Paper
            </Button>
          </div>

          {/* ── RIGHT: Canvas ── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Preview
                </span>
                <span className="text-[11px] text-slate-400">
                  {previewMode === 'image'
                    ? '— exact uploaded paper'
                    : '— text overlays are editable'}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setZoom((z) => clamp(z - 0.1, 0.4, 2.5))}
                  className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
                  title="Zoom out"
                >
                  <ZoomOut size={16} />
                </button>
                <span className="text-xs font-semibold text-slate-500 w-12 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom((z) => clamp(z + 0.1, 0.4, 2.5))}
                  className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
                  title="Zoom in"
                >
                  <ZoomIn size={16} />
                </button>
              </div>
            </div>

            <div
              className="rounded-xl bg-slate-100 p-4 overflow-auto"
              style={{ maxHeight: '75vh' }}
            >
              <div
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top center',
                  width: 'fit-content',
                  margin: '0 auto',
                }}
              >
                <div
                  className="relative inline-block shadow-lg bg-white"
                  ref={canvasRef}
                >
                  <img
                    src={cleanDataUrl}
                    alt="paper"
                    style={{ display: 'block', maxWidth: '100%' }}
                    draggable={false}
                  />
                  {previewMode === 'edit' &&
                    texts.map((t) => (
                      <div
                        key={t.id}
                        onMouseDown={(e) => startDrag(e, t.id)}
                        className={`absolute cursor-move select-none px-1 py-0.5 ${
                          selectedText === t.id
                            ? 'ring-2 ring-amber-500 bg-amber-50/40'
                            : 'hover:ring-2 hover:ring-amber-300'
                        }`}
                        style={{
                          left: `${t.x}%`,
                          top: `${t.y}%`,
                          fontSize: `${t.fontSize}px`,
                          color: t.color,
                          fontWeight: t.bold ? 700 : 400,
                          whiteSpace: 'pre',
                          lineHeight: 1.2,
                          fontFamily: "'Segoe UI', Arial, sans-serif",
                        }}
                        onClick={() => setSelectedText(t.id)}
                      >
                        {t.text}
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"
              >
                <Upload size={12} /> Replace paper
              </button>
              <Button
                onClick={printPaper}
                disabled={!cleanDataUrl || busy}
                variant="outline"
                className="gap-2"
              >
                <Printer size={15} /> Print
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}