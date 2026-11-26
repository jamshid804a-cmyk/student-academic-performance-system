"use client"

import React, { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  FileEdit, Upload, Download, Printer, Trash2, Loader2, Type, RotateCw,
  Sun, Eraser, Wand2, Move, ZoomIn, ZoomOut, Square, Pipette, ImagePlus,
  Copy, ArrowUp, ArrowDown,
} from 'lucide-react'
import { useProgram } from '@/src/context/ProgramContext'

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const clamp = (n, a, b) => Math.min(b, Math.max(a, n))
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
const isRtl = (t) => /[\u0600-\u06FF]/.test(t || '')
const hex2 = (n) => Math.round(n).toString(16).padStart(2, '0')

const BASE_WIDTH = 720

const FONTS = [
  { label: 'Computer (Arial)', value: "Arial, Helvetica, sans-serif" },
  { label: 'Segoe UI', value: "'Segoe UI', Arial, sans-serif" },
  { label: 'Times New Roman', value: "'Times New Roman', Times, serif" },
  { label: 'Georgia', value: "Georgia, serif" },
  { label: 'Courier (typewriter)', value: "'Courier New', monospace" },
  { label: 'Handwriting (Segoe Script)', value: "'Segoe Script', 'Brush Script MT', cursive" },
  { label: 'Handwriting (Comic)', value: "'Comic Sans MS', 'Comic Sans', cursive" },
  { label: 'Urdu (Nastaliq)', value: "'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', 'Segoe UI', Arial, sans-serif" },
]

const EMPTY_SLOT = { original: '', url: '', rotation: 0, brightness: 0, contrast: 0 }

const loadFromUrl = (url) =>
  new Promise((resolve, reject) => {
    const im = new Image()
    im.onload = () => resolve(im)
    im.onerror = reject
    im.src = url
  })

// Rotate image/canvas by degrees on a canvas
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

// Auto-clean: more contrast + whiter whites
function autoClean(img) {
  const c = document.createElement('canvas')
  c.width = img.width
  c.height = img.height
  const ctx = c.getContext('2d')
  ctx.drawImage(img, 0, 0)
  const data = ctx.getImageData(0, 0, c.width, c.height)
  const d = data.data
  const applyContrast = (v, amount = 1.25) => {
    const nv = (v / 255 - 0.5) * amount + 0.5
    return clamp(Math.round(nv * 255), 0, 255)
  }
  for (let i = 0; i < d.length; i += 4) {
    let nr = applyContrast(d[i])
    let ng = applyContrast(d[i + 1])
    let nb = applyContrast(d[i + 2])
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

// Adjustable brightness & contrast
function enhance(img, brightness, contrast) {
  const c = document.createElement('canvas')
  c.width = img.width
  c.height = img.height
  const ctx = c.getContext('2d')
  ctx.drawImage(img, 0, 0)
  if (!brightness && !contrast) return c
  const data = ctx.getImageData(0, 0, c.width, c.height)
  const d = data.data
  const cf = (259 * (contrast + 255)) / (255 * (259 - contrast))
  for (let i = 0; i < d.length; i += 4) {
    d[i] = clamp(cf * (d[i] + brightness), 0, 255)
    d[i + 1] = clamp(cf * (d[i + 1] + brightness), 0, 255)
    d[i + 2] = clamp(cf * (d[i + 2] + brightness), 0, 255)
  }
  ctx.putImageData(data, 0, 0)
  return c
}

async function renderSlot(original, rotation, brightness, contrast, auto) {
  const img = await loadFromUrl(original)
  let c = img
  if (rotation) c = rotateImage(img, rotation)
  if (auto) c = autoClean(c)
  c = enhance(c, brightness, contrast)
  return c.toDataURL('image/jpeg', 0.94)
}

// File -> resized data URL (max 2400px so it stays fast)
async function fileToDataUrl(file, maxDim = 2400) {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadFromUrl(url)
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * scale)
    c.height = Math.round(img.height * scale)
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', 0.95)
  } finally {
    URL.revokeObjectURL(url)
  }
}

// Text reader (loads from the internet the first time)
function loadTesseract() {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.Tesseract) return resolve(window.Tesseract)
    const s = document.createElement('script')
    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js'
    s.onload = () => resolve(window.Tesseract)
    s.onerror = () => reject(new Error('Could not load the text reader'))
    document.body.appendChild(s)
  })
}

const makeText = (text = 'Your text here') => ({
  id: uid(),
  type: 'text',
  x: 0.1,
  y: 0.1,
  text,
  size: 0.03,
  color: '#111827',
  bold: false,
  italic: false,
  font: FONTS[1].value,
  align: isRtl(text) ? 'right' : 'left',
  rotate: 0,
})

const handleStyle = {
  position: 'absolute',
  right: -7,
  bottom: -7,
  width: 14,
  height: 14,
  background: '#f59e0b',
  borderRadius: 3,
  cursor: 'nwse-resize',
  pointerEvents: 'auto',
  touchAction: 'none',
}

const INPUT = "w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 outline-none focus:border-amber-500"
const LABEL = "block text-xs font-semibold text-slate-600 mb-1"

// ─────────────────────────────────────────────
// Clean-up tools (used for BOTH pictures)
// ─────────────────────────────────────────────
function CleanTools({ slot, onChange }) {
  const [busy, setBusy] = useState(false)

  const run = async (patch = {}, auto = false) => {
    const next = { ...slot, ...patch }
    setBusy(true)
    try {
      const url = await renderSlot(next.original, next.rotation, next.brightness, next.contrast, auto)
      onChange({ ...next, url })
    } catch {
      toast.error('Could not process the image')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <div className="flex gap-2 mb-3">
        <Button
          onClick={() => run({}, true)}
          disabled={busy}
          className="flex-1 bg-slate-800 hover:bg-slate-900 text-white gap-2 h-8 text-xs"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
          Auto Clean
        </Button>
        <button
          onClick={() => run({ rotation: slot.rotation - 90 })}
          disabled={busy}
          title="Rotate left"
          className="px-3 rounded-lg border border-slate-300 hover:bg-slate-50"
        >
          <RotateCw size={14} className="-scale-x-100" />
        </button>
        <button
          onClick={() => run({ rotation: slot.rotation + 90 })}
          disabled={busy}
          title="Rotate right"
          className="px-3 rounded-lg border border-slate-300 hover:bg-slate-50"
        >
          <RotateCw size={14} />
        </button>
      </div>

      <label className={LABEL}>Brightness: {slot.brightness}</label>
      <input
        type="range" min="-80" max="80" step="1"
        value={slot.brightness}
        onChange={(e) => onChange({ ...slot, brightness: Number(e.target.value) })}
        className="w-full accent-amber-600 mb-2"
      />

      <label className={LABEL}>Contrast: {slot.contrast}</label>
      <input
        type="range" min="-50" max="100" step="1"
        value={slot.contrast}
        onChange={(e) => onChange({ ...slot, contrast: Number(e.target.value) })}
        className="w-full accent-amber-600 mb-3"
      />

      <div className="flex gap-2">
        <Button
          onClick={() => run({})}
          disabled={busy}
          variant="outline"
          className="flex-1 gap-2 h-8 text-xs"
        >
          <Sun size={13} /> Apply
        </Button>
        <Button
          onClick={() => onChange({ ...slot, rotation: 0, brightness: 0, contrast: 0, url: slot.original })}
          disabled={busy}
          variant="outline"
          className="flex-1 h-8 text-xs"
        >
          Reset
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────
export default function PaperComposingPage() {
  const ctx = useProgram() || {}
  const isAcademy = (ctx.program || 'school') === 'academy'

  const [tpl, setTpl] = useState(EMPTY_SLOT)      // sample paper (template)
  const [src, setSrc] = useState(EMPTY_SLOT)      // content picture
  const [tplDim, setTplDim] = useState({ w: 0, h: 0 })
  const [srcDim, setSrcDim] = useState({ w: 0, h: 0 })

  const [layers, setLayers] = useState([])        // text / cover / snippet
  const [selId, setSelId] = useState(null)
  const [tool, setTool] = useState('move')        // 'move' | 'cover' | 'pick'
  const [coverColor, setCoverColor] = useState('#ffffff')
  const [zoom, setZoom] = useState(1)
  const [crop, setCrop] = useState(null)          // {x,y,w,h} fractions of content picture
  const [ocrLang, setOcrLang] = useState('eng')
  const [busy, setBusy] = useState(false)

  const tplInputRef = useRef(null)
  const srcInputRef = useRef(null)
  const stageRef = useRef(null)
  const srcStageRef = useRef(null)
  const tplImgRef = useRef(null)
  const dragRef = useRef(null)
  const drawRef = useRef(null)
  const cropRef = useRef(null)

  const displayWidth = BASE_WIDTH * zoom
  const selLayer = layers.find((l) => l.id === selId) || null

  // ── layer helpers ──
  const addLayer = (layer) => {
    setLayers((prev) => [...prev, layer])
    setSelId(layer.id)
  }
  const updateLayer = (id, patch) =>
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  const removeLayer = (id) => {
    setLayers((prev) => prev.filter((l) => l.id !== id))
    setSelId((s) => (s === id ? null : s))
  }
  const duplicateLayer = (id) => {
    const l = layers.find((x) => x.id === id)
    if (!l) return
    addLayer({ ...l, id: uid(), x: clamp(l.x + 0.02, 0, 1), y: clamp(l.y + 0.02, 0, 1) })
  }
  const moveLayer = (id, dir) =>
    setLayers((prev) => {
      const i = prev.findIndex((l) => l.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  // ── Upload ──
  const onUploadTemplate = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file (JPG/PNG)')
    if (layers.length > 0 && !window.confirm('A new sample paper will remove the items you placed. Continue?')) return
    setBusy(true)
    try {
      const url = await fileToDataUrl(file)
      setTpl({ ...EMPTY_SLOT, original: url, url })
      setLayers([])
      setSelId(null)
      toast.success('Sample paper loaded')
    } catch {
      toast.error('Could not read this image')
    } finally {
      setBusy(false)
    }
  }

  const onUploadSource = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file (JPG/PNG)')
    setBusy(true)
    try {
      const url = await fileToDataUrl(file)
      setSrc({ ...EMPTY_SLOT, original: url, url })
      setCrop(null)
      toast.success('Content picture loaded. Drag on it to select an area.')
    } catch {
      toast.error('Could not read this image')
    } finally {
      setBusy(false)
    }
  }

  // ── Global pointer listeners (drag / draw / crop) ──
  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current
      if (d) {
        const dx = (e.clientX - d.sx) / d.rect.width
        const dy = (e.clientY - d.sy) / d.rect.height
        if (d.mode === 'move') {
          updateLayer(d.id, {
            x: clamp(d.orig.x + dx, 0, 1),
            y: clamp(d.orig.y + dy, 0, 1),
          })
        } else if (d.orig.type === 'cover') {
          updateLayer(d.id, {
            w: clamp(d.orig.w + dx, 0.01, 1),
            h: clamp(d.orig.h + dy, 0.01, 1),
          })
        } else if (d.orig.type === 'snippet') {
          const nw = clamp(d.orig.w + dx, 0.02, 1)
          updateLayer(d.id, { w: nw, h: (d.orig.h * nw) / d.orig.w })
        }
      }

      const w = drawRef.current
      if (w) {
        const fx = clamp((e.clientX - w.rect.left) / w.rect.width, 0, 1)
        const fy = clamp((e.clientY - w.rect.top) / w.rect.height, 0, 1)
        updateLayer(w.id, {
          x: Math.min(w.sx, fx),
          y: Math.min(w.sy, fy),
          w: Math.abs(fx - w.sx),
          h: Math.abs(fy - w.sy),
        })
      }

      const c = cropRef.current
      if (c) {
        const fx = clamp((e.clientX - c.rect.left) / c.rect.width, 0, 1)
        const fy = clamp((e.clientY - c.rect.top) / c.rect.height, 0, 1)
        setCrop({
          x: Math.min(c.sx, fx),
          y: Math.min(c.sy, fy),
          w: Math.abs(fx - c.sx),
          h: Math.abs(fy - c.sy),
        })
      }
    }

    const onUp = () => {
      if (drawRef.current) {
        const id = drawRef.current.id
        drawRef.current = null
        setLayers((prev) => prev.filter((l) => !(l.id === id && (l.w < 0.005 || l.h < 0.005))))
      }
      if (cropRef.current) {
        cropRef.current = null
        setCrop((c) => (c && (c.w < 0.01 || c.h < 0.01) ? null : c))
      }
      dragRef.current = null
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [])

  const startDrag = (e, layer, mode) => {
    if (tool !== 'move') return // let the stage handle drawing / picking
    e.stopPropagation()
    e.preventDefault()
    const rect = stageRef.current.getBoundingClientRect()
    dragRef.current = {
      id: layer.id,
      mode,
      sx: e.clientX,
      sy: e.clientY,
      rect,
      orig: { ...layer },
    }
    setSelId(layer.id)
  }

  // ── Pick a color from the sample paper ──
  const pickColor = (fx, fy) => {
    const img = tplImgRef.current
    if (!img) return
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    const g = c.getContext('2d')
    g.drawImage(img, 0, 0)
    const px = clamp(Math.round(fx * c.width) - 2, 0, Math.max(0, c.width - 5))
    const py = clamp(Math.round(fy * c.height) - 2, 0, Math.max(0, c.height - 5))
    const d = g.getImageData(px, py, 5, 5).data
    let r = 0, gr = 0, b = 0
    const n = d.length / 4
    for (let i = 0; i < d.length; i += 4) {
      r += d[i]; gr += d[i + 1]; b += d[i + 2]
    }
    const color = `#${hex2(r / n)}${hex2(gr / n)}${hex2(b / n)}`
    setCoverColor(color)
    if (selLayer && selLayer.type === 'cover') updateLayer(selLayer.id, { color })
    setTool('cover')
    toast.success('Color picked. Draw a cover box over the old text.')
  }

  const onStageDown = (e) => {
    if (!tpl.url || !stageRef.current) return
    const rect = stageRef.current.getBoundingClientRect()
    const fx = clamp((e.clientX - rect.left) / rect.width, 0, 1)
    const fy = clamp((e.clientY - rect.top) / rect.height, 0, 1)

    if (tool === 'cover') {
      e.preventDefault()
      const id = uid()
      drawRef.current = { id, sx: fx, sy: fy, rect }
      addLayer({ id, type: 'cover', x: fx, y: fy, w: 0, h: 0, color: coverColor })
      return
    }
    if (tool === 'pick') {
      e.preventDefault()
      pickColor(fx, fy)
      return
    }
    setSelId(null)
  }

  // ── Select an area on the content picture ──
  const onSrcDown = (e) => {
    if (!src.url || !srcStageRef.current) return
    e.preventDefault()
    const rect = srcStageRef.current.getBoundingClientRect()
    const fx = clamp((e.clientX - rect.left) / rect.width, 0, 1)
    const fy = clamp((e.clientY - rect.top) / rect.height, 0, 1)
    cropRef.current = { sx: fx, sy: fy, rect }
    setCrop({ x: fx, y: fy, w: 0, h: 0 })
  }

  // ── Add the selected area as a picture on the sample paper ──
  const addSnippet = async () => {
    if (!tpl.url) return toast.error('Upload the sample paper first')
    if (!src.url) return toast.error('Upload the content picture first')
    try {
      const img = await loadFromUrl(src.url)
      const c0 = crop && crop.w > 0.01 && crop.h > 0.01 ? crop : { x: 0, y: 0, w: 1, h: 1 }
      const sx = Math.round(c0.x * img.width)
      const sy = Math.round(c0.y * img.height)
      const sw = Math.max(1, Math.round(c0.w * img.width))
      const sh = Math.max(1, Math.round(c0.h * img.height))
      const c = document.createElement('canvas')
      c.width = sw
      c.height = sh
      c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)

      const TW = tplDim.w || 1
      const TH = tplDim.h || 1.414
      let fw = clamp(c0.w, 0.12, 0.9)
      let fh = (fw * TW) / ((sw / sh) * TH)
      if (fh > 0.9) {
        const k = 0.9 / fh
        fw *= k
        fh = 0.9
      }

      addLayer({
        id: uid(),
        type: 'snippet',
        src: c.toDataURL('image/png'),
        x: 0.1,
        y: 0.1,
        w: fw,
        h: fh,
        blend: true,
        rotate: 0,
      })
      setTool('move')
      toast.success('Picture added. Drag it into place and use the corner to resize.')
    } catch {
      toast.error('Could not add the picture')
    }
  }

  // ── Read text from the content picture ──
  const runOcr = async () => {
    if (!src.url) return toast.error('Upload the content picture first')
    setBusy(true)
    toast.info('Reading text... the first time can take a minute')
    try {
      const T = await loadTesseract()
      const worker = await T.createWorker(ocrLang)
      const opts = {}
      if (crop && crop.w > 0.01 && crop.h > 0.01 && srcDim.w) {
        opts.rectangle = {
          left: Math.round(crop.x * srcDim.w),
          top: Math.round(crop.y * srcDim.h),
          width: Math.max(1, Math.round(crop.w * srcDim.w)),
          height: Math.max(1, Math.round(crop.h * srcDim.h)),
        }
      }
      const { data } = await worker.recognize(src.url, opts)
      await worker.terminate()
      const text = (data?.text || '').trim()
      if (!text) {
        toast.error('No text found. For handwriting use "Add selection as picture".')
        return
      }
      addLayer(makeText(text))
      setTool('move')
      toast.success('Text added to the paper. Check it and fix any mistakes.')
    } catch (err) {
      console.error(err)
      toast.error('Could not read the text. The first time needs internet.')
    } finally {
      setBusy(false)
    }
  }

  // ── Build the final picture ──
  const composeCanvas = async () => {
    const base = await loadFromUrl(tpl.url)
    const W = base.width
    const H = base.height
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const g = c.getContext('2d')
    g.drawImage(base, 0, 0)

    for (const l of layers) {
      if (l.type === 'cover') {
        g.fillStyle = l.color
        g.fillRect(l.x * W, l.y * H, l.w * W, l.h * H)
      } else if (l.type === 'snippet') {
        const im = await loadFromUrl(l.src)
        const w = l.w * W
        const h = l.h * H
        g.save()
        g.globalCompositeOperation = l.blend ? 'multiply' : 'source-over'
        g.translate(l.x * W + w / 2, l.y * H + h / 2)
        g.rotate(((l.rotate || 0) * Math.PI) / 180)
        g.drawImage(im, -w / 2, -h / 2, w, h)
        g.restore()
      } else {
        const fs = l.size * W
        g.save()
        g.translate(l.x * W, l.y * H)
        g.rotate(((l.rotate || 0) * Math.PI) / 180)
        g.font = `${l.italic ? 'italic ' : ''}${l.bold ? '700' : '400'} ${fs}px ${l.font}`
        g.fillStyle = l.color
        g.textBaseline = 'middle'
        g.textAlign = 'left'
        g.direction = isRtl(l.text) ? 'rtl' : 'ltr'
        const lines = String(l.text).split('\n')
        const widths = lines.map((t) => g.measureText(t).width)
        const maxW = Math.max(0, ...widths)
        lines.forEach((line, i) => {
          let x = 0
          if (l.align === 'center') x = (maxW - widths[i]) / 2
          else if (l.align === 'right') x = maxW - widths[i]
          g.fillText(line, x, fs * 1.25 * (i + 0.5))
        })
        g.restore()
      }
    }
    return c
  }

  const downloadImage = async () => {
    if (!tpl.url) return toast.error('Upload the sample paper first')
    setBusy(true)
    try {
      const c = await composeCanvas()
      c.toBlob((blob) => {
        if (!blob) return toast.error('Could not create the image')
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = 'paper.png'
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(a.href), 1000)
        toast.success('Image downloaded')
      }, 'image/png')
    } catch {
      toast.error('Could not prepare the image')
    } finally {
      setBusy(false)
    }
  }

  const openPrint = async () => {
    if (!tpl.url) return toast.error('Upload the sample paper first')
    setBusy(true)
    try {
      const c = await composeCanvas()
      const finalUrl = c.toDataURL('image/jpeg', 0.95)
      const win = window.open('', '_blank', 'width=900,height=1100')
      if (!win) {
        toast.error('Please allow pop-ups to print')
        return
      }
      const isLandscape = c.width / c.height > 1
      win.document.open()
      win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<title>Paper</title>
<style>
  @page { size: A4 ${isLandscape ? 'landscape' : 'portrait'}; margin: 6mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  html, body { margin: 0; padding: 0; background: #fff; }
  .page { width: 100%; height: 100vh; display: flex; align-items: center; justify-content: center; }
  img { max-width: 100%; max-height: 100%; object-fit: contain; }
</style></head>
<body>
<div class="page"><img src="${finalUrl}" /></div>
<script>window.onload = function () { setTimeout(function () { window.print() }, 500) }</script>
</body></html>`)
      win.document.close()
      toast.success('Print window opened. Choose "Save as PDF" to make a PDF.')
    } catch {
      toast.error('Could not prepare the print')
    } finally {
      setBusy(false)
    }
  }

  const clearAll = () => {
    if (!window.confirm('Clear both pictures and everything you placed?')) return
    setTpl(EMPTY_SLOT)
    setSrc(EMPTY_SLOT)
    setLayers([])
    setSelId(null)
    setCrop(null)
    setTool('move')
  }

  // ─────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────
  const accent = isAcademy ? 'from-purple-500 to-fuchsia-600' : 'from-amber-500 to-orange-600'
  const toolBtn = (id, label, Icon) => (
    <button
      key={id}
      onClick={() => setTool(id)}
      className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg border-2 text-xs font-bold transition ${
        tool === id
          ? 'bg-amber-600 text-white border-amber-600'
          : 'bg-white text-slate-600 border-slate-200 hover:border-amber-400'
      }`}
    >
      <Icon size={13} /> {label}
    </button>
  )

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
              1. Upload the sample paper &nbsp;→&nbsp; 2. Upload your content picture &nbsp;→&nbsp; 3. Put it on the paper &nbsp;→&nbsp; 4. Download
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={downloadImage}
            disabled={!tpl.url || busy}
            variant="outline"
            className="gap-2"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Download Image
          </Button>
          <Button
            onClick={openPrint}
            disabled={!tpl.url || busy}
            className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
          >
            <Printer size={16} /> Print / PDF
          </Button>
        </div>
      </div>

      <input ref={tplInputRef} type="file" accept="image/*" className="hidden" onChange={onUploadTemplate} />
      <input ref={srcInputRef} type="file" accept="image/*" className="hidden" onChange={onUploadSource} />

      {!tpl.url ? (
        /* Empty state: upload the sample paper first */
        <div
          onClick={() => tplInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const f = e.dataTransfer.files?.[0]
            if (f) onUploadTemplate({ target: { files: [f], value: '' } })
          }}
          className="bg-white rounded-2xl border-2 border-dashed border-slate-300 shadow-sm p-16 text-center cursor-pointer hover:border-amber-500 hover:bg-amber-50/30 transition"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <Upload size={28} />
          </div>
          <h3 className="font-bold text-lg text-slate-800 mb-1">
            Step 1: Upload the sample paper
          </h3>
          <p className="text-sm text-slate-500">
            This is the paper whose look you want to copy. Click here or drop the photo (JPG / PNG).
          </p>
          <p className="text-[11px] text-slate-400 mt-3">
            After that you upload your second picture (handwriting or computer text) and place it on this paper.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6 items-start">
          {/* ───────── LEFT: Tools ───────── */}
          <div className="space-y-4">
            {/* 1. Template */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  1. Sample paper
                </p>
                <button
                  onClick={() => tplInputRef.current?.click()}
                  className="text-xs font-semibold text-amber-700 hover:text-amber-900 inline-flex items-center gap-1"
                >
                  <Upload size={12} /> Replace
                </button>
              </div>
              <CleanTools slot={tpl} onChange={setTpl} />
              <p className="text-[11px] text-slate-400 mt-2">
                Tip: clean and rotate the sample paper before placing items on it.
              </p>
            </div>

            {/* 2. Source */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  2. Content picture
                </p>
                <button
                  onClick={() => srcInputRef.current?.click()}
                  className="text-xs font-semibold text-amber-700 hover:text-amber-900 inline-flex items-center gap-1"
                >
                  <Upload size={12} /> {src.url ? 'Replace' : 'Upload'}
                </button>
              </div>
              {src.url ? (
                <CleanTools slot={src} onChange={setSrc} />
              ) : (
                <p className="text-xs text-slate-500">
                  Upload the picture with the handwriting or computer text you want to move onto the sample paper.
                </p>
              )}
            </div>

            {/* 3. Put on paper */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                3. Put content on the paper
              </p>

              <Button
                onClick={addSnippet}
                disabled={!src.url || busy}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white gap-2 mb-2 text-xs h-9"
              >
                <ImagePlus size={14} /> Add selection as picture
              </Button>
              <p className="text-[11px] text-slate-400 mb-3">
                Best for handwriting. First drag a box on the content picture (right side).
              </p>

              <div className="flex gap-2 mb-2">
                <select
                  value={ocrLang}
                  onChange={(e) => setOcrLang(e.target.value)}
                  className={INPUT + ' !w-28'}
                >
                  <option value="eng">English</option>
                  <option value="urd">Urdu</option>
                </select>
                <Button
                  onClick={runOcr}
                  disabled={!src.url || busy}
                  variant="outline"
                  className="flex-1 gap-2 text-xs h-9"
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Type size={14} />}
                  Read text from picture
                </Button>
              </div>
              <p className="text-[11px] text-slate-400 mb-3">
                Works for printed or typed text. Handwriting is often not recognized.
              </p>

              <Button
                onClick={() => { addLayer(makeText()); setTool('move') }}
                variant="outline"
                className="w-full gap-2 text-xs h-9"
              >
                <Type size={14} /> Add text box
              </Button>
            </div>

            {/* Tools */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                Tools on the sample paper
              </p>
              <div className="flex gap-2 mb-3">
                {toolBtn('move', 'Move', Move)}
                {toolBtn('cover', 'Cover', Square)}
                {toolBtn('pick', 'Pick color', Pipette)}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={coverColor}
                  onChange={(e) => {
                    setCoverColor(e.target.value)
                    if (selLayer?.type === 'cover') updateLayer(selLayer.id, { color: e.target.value })
                  }}
                  className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white"
                />
                <p className="text-[11px] text-slate-500 flex-1">
                  <b>Cover</b>: drag a box over old text to hide it. Use <b>Pick color</b>, then click the paper so the box matches.
                </p>
              </div>
            </div>

            {/* Selected item */}
            {selLayer && (
              <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                    Selected: {selLayer.type === 'text' ? 'Text' : selLayer.type === 'cover' ? 'Cover box' : 'Picture'}
                  </p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveLayer(selLayer.id, 1)} title="Bring forward" className="p-1.5 rounded hover:bg-slate-100"><ArrowUp size={14} /></button>
                    <button onClick={() => moveLayer(selLayer.id, -1)} title="Send back" className="p-1.5 rounded hover:bg-slate-100"><ArrowDown size={14} /></button>
                    <button onClick={() => duplicateLayer(selLayer.id)} title="Duplicate" className="p-1.5 rounded hover:bg-slate-100"><Copy size={14} /></button>
                    <button onClick={() => removeLayer(selLayer.id)} title="Delete" className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
                  </div>
                </div>

                {selLayer.type === 'text' && (
                  <div className="space-y-3">
                    <div>
                      <label className={LABEL}>Text</label>
                      <textarea
                        rows={4}
                        value={selLayer.text}
                        onChange={(e) => updateLayer(selLayer.id, { text: e.target.value })}
                        className={INPUT}
                      />
                    </div>
                    <div>
                      <label className={LABEL}>Font</label>
                      <select
                        value={selLayer.font}
                        onChange={(e) => updateLayer(selLayer.id, { font: e.target.value })}
                        className={INPUT}
                      >
                        {FONTS.map((f) => <option key={f.label} value={f.value}>{f.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={LABEL}>Size</label>
                      <input
                        type="range" min="0.01" max="0.12" step="0.001"
                        value={selLayer.size}
                        onChange={(e) => updateLayer(selLayer.id, { size: Number(e.target.value) })}
                        className="w-full accent-amber-600"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={selLayer.color}
                        onChange={(e) => updateLayer(selLayer.id, { color: e.target.value })}
                        className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white"
                      />
                      <label className="flex items-center gap-1 text-xs font-semibold text-slate-600 cursor-pointer">
                        <input type="checkbox" checked={selLayer.bold} onChange={(e) => updateLayer(selLayer.id, { bold: e.target.checked })} className="accent-amber-600" /> Bold
                      </label>
                      <label className="flex items-center gap-1 text-xs font-semibold text-slate-600 cursor-pointer">
                        <input type="checkbox" checked={selLayer.italic} onChange={(e) => updateLayer(selLayer.id, { italic: e.target.checked })} className="accent-amber-600" /> Italic
                      </label>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {['left', 'center', 'right'].map((a) => (
                        <button
                          key={a}
                          onClick={() => updateLayer(selLayer.id, { align: a })}
                          className={`py-1.5 rounded-lg border text-xs font-semibold capitalize ${
                            selLayer.align === a ? 'bg-amber-600 text-white border-amber-600' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                    <div>
                      <label className={LABEL}>Rotate: {selLayer.rotate || 0}°</label>
                      <input
                        type="range" min="-180" max="180" step="1"
                        value={selLayer.rotate || 0}
                        onChange={(e) => updateLayer(selLayer.id, { rotate: Number(e.target.value) })}
                        className="w-full accent-amber-600"
                      />
                    </div>
                  </div>
                )}

                {selLayer.type === 'cover' && (
                  <div className="space-y-2">
                    <label className={LABEL}>Box color</label>
                    <input
                      type="color"
                      value={selLayer.color}
                      onChange={(e) => updateLayer(selLayer.id, { color: e.target.value })}
                      className="w-12 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white"
                    />
                    <p className="text-[11px] text-slate-400">Drag the orange corner to resize the box.</p>
                  </div>
                )}

                {selLayer.type === 'snippet' && (
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selLayer.blend}
                        onChange={(e) => updateLayer(selLayer.id, { blend: e.target.checked })}
                        className="accent-amber-600"
                      />
                      Remove white background (best for handwriting)
                    </label>
                    <div>
                      <label className={LABEL}>Size</label>
                      <input
                        type="range" min="0.05" max="1" step="0.005"
                        value={selLayer.w}
                        onChange={(e) => {
                          const nw = Number(e.target.value)
                          updateLayer(selLayer.id, { w: nw, h: (selLayer.h * nw) / selLayer.w })
                        }}
                        className="w-full accent-amber-600"
                      />
                    </div>
                    <div>
                      <label className={LABEL}>Rotate: {selLayer.rotate || 0}°</label>
                      <input
                        type="range" min="-180" max="180" step="1"
                        value={selLayer.rotate || 0}
                        onChange={(e) => updateLayer(selLayer.id, { rotate: Number(e.target.value) })}
                        className="w-full accent-amber-600"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Items list */}
            {layers.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Items on the paper ({layers.length})
                </p>
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {layers.map((l) => (
                    <div
                      key={l.id}
                      onClick={() => { setSelId(l.id); setTool('move') }}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border cursor-pointer text-xs ${
                        selId === l.id ? 'border-amber-500 bg-amber-50' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="font-semibold text-slate-700 flex-1 truncate">
                        {l.type === 'text'
                          ? `Text: ${String(l.text).split('\n')[0].slice(0, 18)}`
                          : l.type === 'cover' ? 'Cover box' : 'Picture'}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeLayer(l.id) }}
                        className="p-1 rounded hover:bg-red-50 text-red-500"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={clearAll}
              variant="outline"
              className="w-full gap-2 text-red-600 border-red-200 hover:bg-red-50"
            >
              <Eraser size={15} /> Clear everything
            </Button>
          </div>

          {/* ───────── RIGHT: Papers ───────── */}
          <div className="space-y-6 min-w-0">
            {/* Template stage */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Sample paper
                  </span>
                  <span className="text-[11px] text-slate-400 ml-2">
                    {tool === 'move' && 'Drag items to move them. Click empty space to unselect.'}
                    {tool === 'cover' && 'Drag on the paper to draw a cover box.'}
                    {tool === 'pick' && 'Click on the paper to copy its color.'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setZoom((z) => clamp(z - 0.1, 0.4, 2))} className="p-1.5 rounded hover:bg-slate-100 text-slate-600" title="Zoom out">
                    <ZoomOut size={16} />
                  </button>
                  <span className="text-xs font-semibold text-slate-500 w-12 text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button onClick={() => setZoom((z) => clamp(z + 0.1, 0.4, 2))} className="p-1.5 rounded hover:bg-slate-100 text-slate-600" title="Zoom in">
                    <ZoomIn size={16} />
                  </button>
                </div>
              </div>

              <div className="rounded-xl bg-slate-100 p-4 overflow-auto" style={{ maxHeight: '80vh' }}>
                <div
                  ref={stageRef}
                  onPointerDown={onStageDown}
                  className="relative bg-white shadow-lg select-none mx-auto"
                  style={{
                    width: displayWidth,
                    touchAction: 'none',
                    cursor: tool === 'move' ? 'default' : 'crosshair',
                  }}
                >
                  <img
                    ref={tplImgRef}
                    src={tpl.url}
                    alt="sample paper"
                    draggable={false}
                    onLoad={(e) => setTplDim({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
                    style={{ width: '100%', display: 'block' }}
                  />

                  {layers.map((l) => {
                    const sel = l.id === selId
                    const cursor = tool === 'move' ? 'move' : 'crosshair'

                    if (l.type === 'cover') {
                      return (
                        <div
                          key={l.id}
                          onPointerDown={(e) => startDrag(e, l, 'move')}
                          style={{
                            position: 'absolute',
                            left: `${l.x * 100}%`,
                            top: `${l.y * 100}%`,
                            width: `${l.w * 100}%`,
                            height: `${l.h * 100}%`,
                            background: l.color,
                            cursor,
                            outline: sel ? '2px dashed #f59e0b' : 'none',
                            touchAction: 'none',
                          }}
                        >
                          {sel && tool === 'move' && (
                            <div onPointerDown={(e) => startDrag(e, l, 'resize')} style={handleStyle} />
                          )}
                        </div>
                      )
                    }

                    if (l.type === 'snippet') {
                      return (
                        <div
                          key={l.id}
                          onPointerDown={(e) => startDrag(e, l, 'move')}
                          style={{
                            position: 'absolute',
                            left: `${l.x * 100}%`,
                            top: `${l.y * 100}%`,
                            width: `${l.w * 100}%`,
                            height: `${l.h * 100}%`,
                            transform: `rotate(${l.rotate || 0}deg)`,
                            mixBlendMode: l.blend ? 'multiply' : 'normal',
                            cursor,
                            touchAction: 'none',
                          }}
                        >
                          <img
                            src={l.src}
                            alt=""
                            draggable={false}
                            style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }}
                          />
                        </div>
                      )
                    }

                    return (
                      <div
                        key={l.id}
                        onPointerDown={(e) => startDrag(e, l, 'move')}
                        style={{
                          position: 'absolute',
                          left: `${l.x * 100}%`,
                          top: `${l.y * 100}%`,
                          fontSize: l.size * displayWidth,
                          color: l.color,
                          fontFamily: l.font,
                          fontWeight: l.bold ? 700 : 400,
                          fontStyle: l.italic ? 'italic' : 'normal',
                          whiteSpace: 'pre',
                          lineHeight: 1.25,
                          textAlign: l.align,
                          direction: isRtl(l.text) ? 'rtl' : 'ltr',
                          transform: `rotate(${l.rotate || 0}deg)`,
                          transformOrigin: 'top left',
                          cursor,
                          outline: sel ? '2px solid #f59e0b' : 'none',
                          outlineOffset: 2,
                          touchAction: 'none',
                        }}
                      >
                        {l.text}
                      </div>
                    )
                  })}

                  {/* Selection frame for pictures (kept separate so blending stays correct) */}
                  {selLayer && selLayer.type === 'snippet' && tool === 'move' && (
                    <div
                      style={{
                        position: 'absolute',
                        left: `${selLayer.x * 100}%`,
                        top: `${selLayer.y * 100}%`,
                        width: `${selLayer.w * 100}%`,
                        height: `${selLayer.h * 100}%`,
                        transform: `rotate(${selLayer.rotate || 0}deg)`,
                        border: '2px dashed #f59e0b',
                        pointerEvents: 'none',
                      }}
                    >
                      <div onPointerDown={(e) => startDrag(e, selLayer, 'resize')} style={handleStyle} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content picture stage */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Content picture
                  </span>
                  <span className="text-[11px] text-slate-400 ml-2">
                    Drag a box on it to choose the part you want
                  </span>
                </div>
                {crop && (
                  <button
                    onClick={() => setCrop(null)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                  >
                    Clear selection
                  </button>
                )}
              </div>

              {src.url ? (
                <div className="rounded-xl bg-slate-100 p-4 overflow-auto">
                  <div
                    ref={srcStageRef}
                    onPointerDown={onSrcDown}
                    className="relative select-none mx-auto shadow bg-white"
                    style={{ width: 640, maxWidth: '100%', touchAction: 'none', cursor: 'crosshair' }}
                  >
                    <img
                      src={src.url}
                      alt="content"
                      draggable={false}
                      onLoad={(e) => setSrcDim({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
                      style={{ width: '100%', display: 'block' }}
                    />
                    {crop && crop.w > 0 && crop.h > 0 && (
                      <div
                        style={{
                          position: 'absolute',
                          left: `${crop.x * 100}%`,
                          top: `${crop.y * 100}%`,
                          width: `${crop.w * 100}%`,
                          height: `${crop.h * 100}%`,
                          border: '2px dashed #f59e0b',
                          background: 'rgba(245,158,11,0.15)',
                          pointerEvents: 'none',
                        }}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => srcInputRef.current?.click()}
                  className="rounded-xl border-2 border-dashed border-slate-300 p-10 text-center cursor-pointer hover:border-amber-500 hover:bg-amber-50/30 transition"
                >
                  <Upload size={22} className="mx-auto text-amber-600 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">Step 2: Upload the content picture</p>
                  <p className="text-xs text-slate-500">
                    Handwriting or computer text that you want on the sample paper
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}