"use client"

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { IdCard, Printer, Search, RotateCcw, Upload, X, Loader2 } from 'lucide-react'
import GlobalApi from '@/app/_services/GlobalApi'
import { useProgram } from '@/src/context/ProgramContext'

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const STORAGE_KEY = 'idcard_settings_v1'

const GRADES = [
    "Nursery", "Prep",
    "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th",
]
const SECTIONS = ["A", "B", "C"]

const FONTS = [
    { label: 'Segoe UI (modern)', value: "'Segoe UI', Arial, sans-serif" },
    { label: 'Georgia (classic)', value: "Georgia, 'Times New Roman', serif" },
    { label: 'Trebuchet (friendly)', value: "'Trebuchet MS', Arial, sans-serif" },
    { label: 'Verdana (clear)', value: "Verdana, Geneva, sans-serif" },
]

const TEMPLATES = {
    classic: {
        label: 'Classic',
        colors: { primary: '#1d4ed8', secondary: '#f59e0b', textColor: '#0f172a', surface: '#ffffff' },
    },
    modern: {
        label: 'Modern',
        colors: { primary: '#6d28d9', secondary: '#06b6d4', textColor: '#ffffff', surface: '#ffffff' },
    },
    minimal: {
        label: 'Minimal',
        colors: { primary: '#0f766e', secondary: '#f97316', textColor: '#111827', surface: '#ffffff' },
    },
    elegant: {
        label: 'Elegant',
        colors: { primary: '#0f172a', secondary: '#d4af37', textColor: '#f8fafc', surface: '#f8fafc' },
    },
}

const PALETTES = [
    { n: 'Blue / Amber', p: '#1d4ed8', s: '#f59e0b' },
    { n: 'Green / Gold', p: '#047857', s: '#eab308' },
    { n: 'Red / Navy', p: '#b91c1c', s: '#1e3a8a' },
    { n: 'Purple / Cyan', p: '#6d28d9', s: '#06b6d4' },
    { n: 'Teal / Orange', p: '#0f766e', s: '#f97316' },
    { n: 'Black / Gold', p: '#111827', s: '#d4af37' },
]

const PATTERNS = [
    { value: 'none', label: 'None' },
    { value: 'dots', label: 'Dots' },
    { value: 'grid', label: 'Grid' },
    { value: 'lines', label: 'Diagonal lines' },
    { value: 'waves', label: 'Waves' },
    { value: 'circles', label: 'Circles' },
]

const BG_PRESETS = [
    { value: 'none', label: 'None' },
    { value: 'gradient', label: 'Gradient' },
    { value: 'waves', label: 'Waves' },
    { value: 'geometric', label: 'Geometric' },
    { value: 'bubbles', label: 'Bubbles' },
    { value: 'bands', label: 'Bands' },
    { value: 'frame', label: 'Frame' },
]

const FIELD_DEFS = [
    { key: 'father', label: 'Father name' },
    { key: 'roll', label: 'Roll no' },
    { key: 'adm', label: 'Admission no' },
    { key: 'contact', label: 'Contact' },
    { key: 'address', label: 'Address' },
    { key: 'admDate', label: 'Admission date' },
]

const DEFAULT_RULES = [
    'This card is the property of the school and is non-transferable.',
    'Must be carried at all times within the school premises.',
    'Report loss or damage to the office immediately.',
    'Use of this card by anyone other than the holder is prohibited.',
]

const DEFAULT_CFG = {
    orientation: 'landscape',
    template: 'classic',
    primary: '#1d4ed8',
    secondary: '#f59e0b',
    textColor: '#0f172a',
    surface: '#ffffff',
    pattern: 'none',
    bgPreset: 'none',
    bgImage: '',
    overlay: 0.35,
    fgImage: '',
    photoShape: 'rounded',
    font: FONTS[0].value,
    title: 'STUDENT ID CARD',
    schoolName: '',
    schoolAddress: '',
    signLabel: 'Principal',
    showSign: true,
    showSession: true,
    showLogo: true,
    fields: { father: true, roll: true, adm: true, contact: true, address: false, admDate: false },

    // ── Back side ──
    showBack: true,
    backTitle: 'INFORMATION & RULES',
    backRules: DEFAULT_RULES,
    backEmergencyLabel: 'Emergency Contact',
    backEmergencyNote: 'In case of emergency, please contact the school office.',
    backValidityNote: 'Valid until end of session.',
    backShowStudentInfo: true,
    backShowRules: true,
    backShowEmergency: true,
    backShowValidity: true,
    backShowSign: true,
    backSignLabel: 'Principal',
}

const SAMPLE_STUDENT = {
    id: 'sample',
    name: 'Ahmed Khan',
    fatherName: 'Imran Khan',
    rollNo: 12,
    admissionNo: 1001,
    contact: '03001234567',
    grade: '5th',
    section: 'A',
    session: '2025-2026',
    address: 'Gahri Chandan, Peshawar',
    admissionDate: '2025-04-01',
    image: null,
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

const toNum = (v) => {
    const n = parseInt(String(v ?? '').replace(/[^\d]/g, ''), 10)
    return Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : n
}

function sortStudents(list) {
    return [...list].sort((a, b) => {
        const r = toNum(a.rollNo) - toNum(b.rollNo)
        if (r !== 0) return r
        return toNum(a.admissionNo) - toNum(b.admissionNo)
    })
}

const studentKey = (s) => String(s?.id ?? s?._id ?? '')

const isDarkTemplate = (cfg) => cfg.template === 'modern' || cfg.template === 'elegant'

function patternStyle(kind, color) {
    const svgs = {
        dots: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="4" cy="4" r="1.8" fill="${color}"/></svg>`,
        grid: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"><path d="M22 0H0V22" fill="none" stroke="${color}" stroke-width="1"/></svg>`,
        lines: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"><path d="M0 14L14 0" stroke="${color}" stroke-width="2"/></svg>`,
        waves: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" preserveAspectRatio="none"><path d="M0 170C80 130 160 210 260 160S380 140 400 150V250H0Z" fill="${color}"/><path d="M0 205C100 175 200 240 400 195V250H0Z" fill="${color}" fill-opacity="0.6"/></svg>`,
        circles: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" preserveAspectRatio="none"><circle cx="370" cy="20" r="95" fill="${color}"/><circle cx="15" cy="245" r="75" fill="${color}" fill-opacity="0.7"/></svg>`,
    }
    const svg = svgs[kind]
    if (!svg) return ''
    const full = kind === 'waves' || kind === 'circles'
    return `background-image:url(data:image/svg+xml,${encodeURIComponent(svg)});${
        full ? 'background-size:100% 100%;background-repeat:no-repeat;' : 'background-repeat:repeat;'
    }`
}

function presetSvg(kind, P, S, SF, dark, land) {
    const w = land ? 1000 : 630
    const h = land ? 630 : 1000
    const r = (n) => Math.round(n)
    const base = dark ? P : SF
    const a = dark ? '#ffffff' : P
    const b = S
    const m = Math.min(w, h)

    if (kind === 'gradient') {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${P}"/><stop offset="1" stop-color="${S}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/></svg>`
    }

    let shapes = ''
    if (kind === 'waves') {
        shapes =
            `<path d="M0 ${r(h * 0.78)} C ${r(w * 0.25)} ${r(h * 0.68)}, ${r(w * 0.5)} ${r(h * 0.9)}, ${w} ${r(h * 0.74)} L ${w} ${h} L 0 ${h} Z" fill="${b}" fill-opacity="0.85"/>` +
            `<path d="M0 ${r(h * 0.88)} C ${r(w * 0.3)} ${r(h * 0.8)}, ${r(w * 0.6)} ${r(h * 0.98)}, ${w} ${r(h * 0.86)} L ${w} ${h} L 0 ${h} Z" fill="${a}" fill-opacity="0.9"/>` +
            `<path d="M0 0 H ${r(w * 0.55)} C ${r(w * 0.4)} ${r(h * 0.12)}, ${r(w * 0.15)} ${r(h * 0.1)}, 0 ${r(h * 0.22)} Z" fill="${b}" fill-opacity="0.35"/>`
    } else if (kind === 'geometric') {
        shapes =
            `<polygon points="0,0 ${r(w * 0.45)},0 0,${r(h * 0.5)}" fill="${a}" fill-opacity="0.16"/>` +
            `<polygon points="${w},${h} ${r(w * 0.5)},${h} ${w},${r(h * 0.45)}" fill="${b}" fill-opacity="0.35"/>` +
            `<polygon points="${w},0 ${r(w * 0.7)},0 ${w},${r(h * 0.3)}" fill="${b}" fill-opacity="0.22"/>` +
            `<polygon points="0,${h} ${r(w * 0.3)},${h} 0,${r(h * 0.7)}" fill="${a}" fill-opacity="0.18"/>`
    } else if (kind === 'bubbles') {
        shapes =
            `<circle cx="${r(w * 0.9)}" cy="${r(h * 0.12)}" r="${r(m * 0.3)}" fill="${b}" fill-opacity="0.3"/>` +
            `<circle cx="${r(w * 0.08)}" cy="${r(h * 0.9)}" r="${r(m * 0.26)}" fill="${a}" fill-opacity="0.18"/>` +
            `<circle cx="${r(w * 0.78)}" cy="${r(h * 0.85)}" r="${r(m * 0.1)}" fill="${b}" fill-opacity="0.35"/>` +
            `<circle cx="${r(w * 0.2)}" cy="${r(h * 0.15)}" r="${r(m * 0.07)}" fill="${a}" fill-opacity="0.2"/>`
    } else if (kind === 'bands') {
        shapes =
            `<polygon points="0,${r(h * 0.55)} ${w},${r(h * 0.2)} ${w},${r(h * 0.38)} 0,${r(h * 0.73)}" fill="${b}" fill-opacity="0.3"/>` +
            `<polygon points="0,${r(h * 0.75)} ${w},${r(h * 0.42)} ${w},${r(h * 0.5)} 0,${r(h * 0.83)}" fill="${a}" fill-opacity="0.22"/>`
    } else if (kind === 'frame') {
        const f = m * 0.05
        shapes =
            `<rect x="${r(f)}" y="${r(f)}" width="${r(w - 2 * f)}" height="${r(h - 2 * f)}" rx="${r(f * 0.8)}" fill="none" stroke="${b}" stroke-width="${r(f * 0.25)}"/>` +
            `<rect x="${r(f * 1.8)}" y="${r(f * 1.8)}" width="${r(w - 3.6 * f)}" height="${r(h - 3.6 * f)}" rx="${r(f * 0.6)}" fill="none" stroke="${a}" stroke-opacity="0.5" stroke-width="${r(f * 0.1)}"/>` +
            `<circle cx="${r(f)}" cy="${r(f)}" r="${r(f * 0.7)}" fill="${b}"/>` +
            `<circle cx="${r(w - f)}" cy="${r(f)}" r="${r(f * 0.7)}" fill="${b}"/>` +
            `<circle cx="${r(f)}" cy="${r(h - f)}" r="${r(f * 0.7)}" fill="${b}"/>` +
            `<circle cx="${r(w - f)}" cy="${r(h - f)}" r="${r(f * 0.7)}" fill="${b}"/>`
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><rect width="${w}" height="${h}" fill="${base}"/>${shapes}</svg>`
}

const presetUri = (kind, P, S, SF, dark, land) =>
    `data:image/svg+xml,${encodeURIComponent(presetSvg(kind, P, S, SF, dark, land))}`

const clamp = (n) =>
    `display:-webkit-box;-webkit-line-clamp:${n};-webkit-box-orient:vertical;overflow:hidden;`

function loadImage(file, maxDim, mime) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file)
        const img = new Image()
        img.onload = () => {
            const ratio = Math.min(1, maxDim / Math.max(img.width, img.height))
            const c = document.createElement('canvas')
            c.width = Math.round(img.width * ratio)
            c.height = Math.round(img.height * ratio)
            const ctx = c.getContext('2d')
            if (mime === 'image/jpeg') {
                ctx.fillStyle = '#ffffff'
                ctx.fillRect(0, 0, c.width, c.height)
            }
            ctx.drawImage(img, 0, 0, c.width, c.height)
            URL.revokeObjectURL(url)
            resolve(c.toDataURL(mime, 0.88))
        }
        img.onerror = (e) => { URL.revokeObjectURL(url); reject(e) }
        img.src = url
    })
}

const sizeOf = (cfg) =>
    cfg.orientation === 'landscape' ? { W: 85.6, H: 54 } : { W: 54, H: 85.6 }

function getTheme(t, P, S, T, SF) {
    const themes = {
        classic: {
            cardBg: SF, headBg: P, headText: '#ffffff', body: T, name: P, panel: 'transparent',
            footBg: P, footText: '#ffffff', stripBg: S, stripText: '#ffffff',
            photoBorder: P, pillBg: S, pillText: '#ffffff',
        },
        modern: {
            cardBg: `linear-gradient(135deg, ${P}, ${S})`, headBg: 'rgba(255,255,255,0.14)',
            headText: '#ffffff', body: '#ffffff', name: '#ffffff', panel: 'rgba(255,255,255,0.16)',
            footBg: 'rgba(0,0,0,0.25)', footText: '#ffffff', stripBg: 'rgba(0,0,0,0.25)',
            stripText: '#ffffff', photoBorder: '#ffffff', pillBg: 'rgba(255,255,255,0.25)', pillText: '#ffffff',
        },
        minimal: {
            cardBg: SF, headBg: 'transparent', headText: P, body: T, name: P, panel: 'transparent',
            footBg: 'transparent', footText: P, stripBg: 'transparent', stripText: S,
            photoBorder: P, pillBg: S, pillText: '#ffffff',
        },
        elegant: {
            cardBg: P, headBg: 'rgba(0,0,0,0.28)', headText: S, body: SF, name: S,
            panel: 'rgba(255,255,255,0.07)', footBg: 'rgba(0,0,0,0.32)', footText: S,
            stripBg: S, stripText: P, photoBorder: S, pillBg: S, pillText: P,
        },
    }
    return themes[t] || themes.classic
}

// ─────────────────────────────────────────────
// FRONT card
// ─────────────────────────────────────────────
function cardHtml(s, cfg, school) {
    const land = cfg.orientation === 'landscape'
    const { W, H } = sizeOf(cfg)
    const t = cfg.template
    const P = cfg.primary
    const S = cfg.secondary
    const T = cfg.textColor
    const SF = cfg.surface
    const dark = isDarkTemplate(cfg)

    const th = getTheme(t, P, S, T, SF)

    const overlayColor = dark ? '#000000' : SF
    const fill = 'position:absolute;left:0;top:0;width:100%;height:100%;'
    let layers = ''

    if (cfg.bgImage) {
        layers += `<img src="${esc(cfg.bgImage)}" alt="" style="${fill}object-fit:cover;" />`
        layers += `<div style="${fill}background:${overlayColor};opacity:${cfg.overlay};"></div>`
    } else if (cfg.bgPreset && cfg.bgPreset !== 'none') {
        layers += `<img src="${presetUri(cfg.bgPreset, P, S, SF, dark, land)}" alt="" style="${fill}object-fit:fill;" />`
    }

    if (cfg.pattern && cfg.pattern !== 'none') {
        layers += `<div style="${fill}opacity:0.14;${patternStyle(cfg.pattern, dark ? '#ffffff' : P)}"></div>`
    }
    if (t === 'modern') {
        layers += `<div style="position:absolute;right:-12mm;top:-12mm;width:36mm;height:36mm;border-radius:50%;background:rgba(255,255,255,0.1);"></div>`
    }
    if (t === 'minimal') {
        layers += land
            ? `<div style="position:absolute;left:0;top:0;bottom:0;width:2.2mm;background:${P};"></div>`
            : `<div style="position:absolute;left:0;right:0;top:0;height:2.2mm;background:${P};"></div>`
    }
    if (t === 'elegant') {
        layers += `<div style="position:absolute;left:1.2mm;top:1.2mm;right:1.2mm;bottom:1.2mm;border:0.3mm solid ${S};border-radius:2mm;"></div>`
    }
    if (cfg.fgImage) {
        layers += `<img src="${esc(cfg.fgImage)}" alt="" style="${fill}object-fit:fill;" />`
    }

    const schoolName = (cfg.schoolName || '').trim() || school.name || 'School Name'
    const schoolAddr = (cfg.schoolAddress || '').trim() || school.address || ''
    const nameLen = schoolName.length
    const hSize = (land ? 8 : 7.2) * (nameLen > 34 ? 0.78 : nameLen > 24 ? 0.9 : 1)
    const logoSize = land ? 9.5 : 7.5
    const logo = cfg.showLogo && school.logo
        ? `<img src="${esc(school.logo)}" alt="" style="width:${logoSize}mm;height:${logoSize}mm;object-fit:contain;flex:none;border-radius:1.2mm;${
            t === 'minimal' ? '' : 'background:#ffffff;padding:0.3mm;box-sizing:border-box;'
        }" />`
        : ''

    const header = land
        ? `<div style="display:flex;align-items:center;gap:2mm;height:13mm;padding:0 3mm;background:${th.headBg};color:${th.headText};flex:none;box-sizing:border-box;">
            ${logo}
            <div style="min-width:0;flex:1;">
                <div style="font-size:${hSize}pt;font-weight:800;line-height:1.15;text-transform:uppercase;${clamp(2)}">${esc(schoolName)}</div>
                ${schoolAddr ? `<div style="font-size:4.6pt;opacity:0.9;line-height:1.2;margin-top:0.4mm;${clamp(2)}">${esc(schoolAddr)}</div>` : ''}
            </div>
        </div>`
        : `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.8mm;height:19mm;padding:1mm 2.5mm;text-align:center;background:${th.headBg};color:${th.headText};flex:none;box-sizing:border-box;">
            ${logo}
            <div style="font-size:${hSize}pt;font-weight:800;line-height:1.1;text-transform:uppercase;${clamp(2)}">${esc(schoolName)}</div>
            ${schoolAddr ? `<div style="font-size:4.2pt;opacity:0.9;line-height:1.15;${clamp(1)}">${esc(schoolAddr)}</div>` : ''}
        </div>`

    const strip = (cfg.title || '').trim()
        ? `<div style="flex:none;height:4mm;display:flex;align-items:center;justify-content:center;background:${th.stripBg};color:${th.stripText};font-size:5pt;font-weight:800;letter-spacing:0.5mm;text-transform:uppercase;">${esc(cfg.title)}</div>`
        : ''

    const hasImg = typeof s.image === 'string' && /^(data:image|https?:|\/)/.test(s.image)

    // Photo sizing: landscape = wide row layout; portrait = compact, centered.
    let pw, ph
    if (land) {
        pw = 22
        ph = cfg.photoShape === 'circle' ? pw : 27
    } else {
        if (cfg.photoShape === 'circle') { pw = 18; ph = 18 }
        else if (cfg.photoShape === 'rounded') { pw = 18; ph = 21 }
        else { pw = 16; ph = 19 }
    }
    const radius =
        cfg.photoShape === 'circle' ? '50%'
        : cfg.photoShape === 'rounded' ? '2.5mm'
        : '0.6mm'
    const initial = esc((s.name || '?').trim().charAt(0).toUpperCase())
    const photo = `<div style="width:${pw}mm;height:${ph}mm;flex:none;border-radius:${radius};overflow:hidden;border:0.7mm solid ${th.photoBorder};background:#e2e8f0;box-shadow:0 0.6mm 1.6mm rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;box-sizing:border-box;">
        ${hasImg
            ? `<img src="${esc(s.image)}" alt="" style="width:100%;height:100%;object-fit:cover;" />`
            : `<span style="font-size:16pt;font-weight:800;color:${P};">${initial}</span>`}
    </div>`

    const nameText = s.name || ''
    const nSize = land
        ? (nameText.length > 22 ? 8.6 : 10.4)
        : (nameText.length > 24 ? 7.2 : nameText.length > 18 ? 8.2 : 9.4)
    const nameHtml = `<div style="font-size:${nSize}pt;font-weight:800;color:${th.name};line-height:1.15;${land ? '' : 'text-align:center;'}${clamp(2)}">${esc(nameText)}</div>`

    const clsText = [s.grade, s.section].filter(Boolean).join(' - ')
    const pill = clsText
        ? `<div style="display:inline-block;margin-top:1mm;padding:0.5mm 2.2mm;border-radius:5mm;background:${th.pillBg};color:${th.pillText};font-size:5.8pt;font-weight:800;">Class ${esc(clsText)}</div>`
        : ''

    const rowDefs = [
        ['father', 'Father', s.fatherName],
        ['roll', 'Roll No', s.rollNo],
        ['adm', 'Adm No', s.admissionNo],
        ['contact', 'Contact', s.contact],
        ['address', 'Address', s.address],
        ['admDate', 'Adm Date', s.admissionDate],
    ]
    const labelW = land ? 11 : 9.5
    const rowFont = land ? 5.8 : 5.4
    const rows = rowDefs
        .filter(([k, , v]) => cfg.fields?.[k] && v !== null && v !== undefined && String(v).trim() !== '')
        .map(([k, label, v]) => {
            const isAddress = k === 'address'
            const valueStyle = isAddress
                ? (land ? clamp(2) : clamp(3))
                : (land
                    ? 'overflow:hidden;white-space:nowrap;text-overflow:ellipsis;'
                    : 'overflow:hidden;word-break:break-word;')
            return `<div style="display:flex;gap:1mm;font-size:${rowFont}pt;line-height:${land ? 1.4 : 1.35};">
                <span style="width:${labelW}mm;flex:none;opacity:0.75;font-weight:600;">${label}</span>
                <span style="flex:1;min-width:0;font-weight:700;${valueStyle}">${esc(v)}</span>
            </div>`
        })
        .join('')

    const body = land
        ? `<div style="flex:1;min-height:0;display:flex;align-items:center;gap:3mm;padding:1mm 3.5mm;box-sizing:border-box;">
            ${photo}
            <div style="flex:1;min-width:0;">
                ${nameHtml}
                ${pill}
                <div style="margin-top:1.2mm;">${rows}</div>
            </div>
        </div>`
        : `<div style="flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;padding:1.6mm 3mm 1mm;box-sizing:border-box;overflow:hidden;">
            ${photo}
            <div style="margin-top:1.4mm;width:100%;">${nameHtml}</div>
            <div style="margin-top:0.8mm;min-height:0;">${pill}</div>
            <div style="margin-top:1.2mm;width:100%;padding:1.2mm 1.6mm;border-radius:1.5mm;background:${th.panel};box-sizing:border-box;flex:1;min-height:0;overflow:hidden;">${rows}</div>
        </div>`

    const sessionTxt = cfg.showSession && s.session ? `Session ${esc(s.session)}` : ''
    const sign = cfg.showSign
        ? `<div style="width:17mm;text-align:center;"><div style="border-top:0.2mm solid currentColor;padding-top:0.2mm;font-size:4.4pt;">${esc(cfg.signLabel)}</div></div>`
        : ''
    const footer = sessionTxt || sign
        ? `<div style="flex:none;height:6mm;display:flex;align-items:flex-end;justify-content:space-between;padding:0 3mm 0.8mm;background:${th.footBg};color:${th.footText};font-size:5pt;font-weight:700;box-sizing:border-box;${
            t === 'minimal' ? `border-top:0.2mm solid ${S};` : ''
        }"><span style="align-self:center;">${sessionTxt}</span>${sign}</div>`
        : `<div style="flex:none;height:2mm;"></div>`

    const minimalPad = t === 'minimal' ? (land ? 'padding-left:2.4mm;' : 'padding-top:2.4mm;') : ''

    return `<div class="idc" style="position:relative;width:${W}mm;height:${H}mm;overflow:hidden;border-radius:3mm;background:${th.cardBg};font-family:${cfg.font};color:${th.body};box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
        ${layers}
        <div style="position:relative;display:flex;flex-direction:column;width:100%;height:100%;box-sizing:border-box;${minimalPad}">
            ${header}${strip}${body}${footer}
        </div>
    </div>`
}

// ─────────────────────────────────────────────
// BACK side of the card
// ─────────────────────────────────────────────
function cardBackHtml(s, cfg, school) {
    const land = cfg.orientation === 'landscape'
    const { W, H } = sizeOf(cfg)
    const t = cfg.template
    const P = cfg.primary
    const S = cfg.secondary
    const T = cfg.textColor
    const SF = cfg.surface
    const dark = isDarkTemplate(cfg)

    const th = getTheme(t, P, S, T, SF)

    const overlayColor = dark ? '#000000' : SF
    const fill = 'position:absolute;left:0;top:0;width:100%;height:100%;'
    let layers = ''

    if (cfg.bgImage) {
        layers += `<img src="${esc(cfg.bgImage)}" alt="" style="${fill}object-fit:cover;" />`
        layers += `<div style="${fill}background:${overlayColor};opacity:${cfg.overlay};"></div>`
    } else if (cfg.bgPreset && cfg.bgPreset !== 'none') {
        layers += `<img src="${presetUri(cfg.bgPreset, P, S, SF, dark, land)}" alt="" style="${fill}object-fit:fill;" />`
    }
    if (cfg.pattern && cfg.pattern !== 'none') {
        layers += `<div style="${fill}opacity:0.14;${patternStyle(cfg.pattern, dark ? '#ffffff' : P)}"></div>`
    }
    if (t === 'modern') {
        layers += `<div style="position:absolute;left:-12mm;bottom:-12mm;width:36mm;height:36mm;border-radius:50%;background:rgba(255,255,255,0.1);"></div>`
    }
    if (t === 'minimal') {
        layers += land
            ? `<div style="position:absolute;left:0;top:0;bottom:0;width:2.2mm;background:${P};"></div>`
            : `<div style="position:absolute;left:0;right:0;top:0;height:2.2mm;background:${P};"></div>`
    }
    if (t === 'elegant') {
        layers += `<div style="position:absolute;left:1.2mm;top:1.2mm;right:1.2mm;bottom:1.2mm;border:0.3mm solid ${S};border-radius:2mm;"></div>`
    }
    if (cfg.fgImage) {
        layers += `<img src="${esc(cfg.fgImage)}" alt="" style="${fill}object-fit:fill;" />`
    }

    const schoolName = (cfg.schoolName || '').trim() || school.name || 'School Name'
    const schoolAddr = (cfg.schoolAddress || '').trim() || school.address || ''
    const schoolPhone = school.phone || ''
    const logoSize = land ? 7.5 : 6.5
    const logo = cfg.showLogo && school.logo
        ? `<img src="${esc(school.logo)}" alt="" style="width:${logoSize}mm;height:${logoSize}mm;object-fit:contain;flex:none;border-radius:1mm;${
            t === 'minimal' ? '' : 'background:#ffffff;padding:0.3mm;box-sizing:border-box;'
        }" />`
        : ''

    const header = `<div style="display:flex;align-items:center;gap:2mm;height:10mm;padding:0 3mm;background:${th.headBg};color:${th.headText};flex:none;box-sizing:border-box;">
        ${logo}
        <div style="min-width:0;flex:1;text-align:${land ? 'left' : 'center'};">
            <div style="font-size:${land ? 7 : 6.4}pt;font-weight:800;line-height:1.15;text-transform:uppercase;${clamp(1)}">${esc(schoolName)}</div>
            <div style="font-size:4pt;opacity:0.9;line-height:1.2;margin-top:0.3mm;${clamp(1)}">
                ${esc(schoolAddr)}${schoolAddr && schoolPhone ? ' • ' : ''}${schoolPhone ? `Ph: ${esc(schoolPhone)}` : ''}
            </div>
        </div>
    </div>`

    const strip = (cfg.backTitle || '').trim()
        ? `<div style="flex:none;height:4mm;display:flex;align-items:center;justify-content:center;background:${th.stripBg};color:${th.stripText};font-size:5pt;font-weight:800;letter-spacing:0.5mm;text-transform:uppercase;">${esc(cfg.backTitle)}</div>`
        : ''

    const clsText = [s.grade, s.section].filter(Boolean).join(' - ')
    const studentInfo = cfg.backShowStudentInfo
        ? `<div style="padding:0.8mm 1.4mm;border-radius:1.2mm;background:${th.panel};margin-bottom:1mm;">
            <div style="font-size:5.4pt;font-weight:800;color:${th.name};${clamp(1)}">${esc(s.name || '')}</div>
            <div style="font-size:4.6pt;opacity:0.85;margin-top:0.2mm;${clamp(1)}">
                ${clsText ? `Class ${esc(clsText)}` : ''}${clsText && s.rollNo ? ' • ' : ''}${s.rollNo ? `Roll ${esc(s.rollNo)}` : ''}${s.session ? ` • Session ${esc(s.session)}` : ''}
            </div>
        </div>`
        : ''

    const rules = Array.isArray(cfg.backRules) ? cfg.backRules.filter((r) => String(r || '').trim()) : []
    const rulesHtml = cfg.backShowRules && rules.length
        ? `<div style="margin-bottom:1mm;">
            <div style="font-size:4.8pt;font-weight:800;color:${th.name};margin-bottom:0.4mm;letter-spacing:0.3mm;text-transform:uppercase;">Rules</div>
            <ul style="margin:0;padding-left:3mm;font-size:4.4pt;line-height:1.3;color:${th.body};">
                ${rules.slice(0, 5).map((r) => `<li style="margin-bottom:0.2mm;">${esc(r)}</li>`).join('')}
            </ul>
        </div>`
        : ''

    const emergency = cfg.backShowEmergency
        ? `<div style="padding:0.8mm 1.4mm;border-radius:1.2mm;background:${th.panel};margin-bottom:1mm;">
            <div style="font-size:4.6pt;font-weight:800;color:${th.name};letter-spacing:0.3mm;text-transform:uppercase;">${esc(cfg.backEmergencyLabel || 'Emergency Contact')}</div>
            <div style="font-size:4.4pt;line-height:1.3;margin-top:0.2mm;">
                ${esc(cfg.backEmergencyNote || '')}
                ${schoolPhone ? `<br/><span style="font-weight:800;">${esc(schoolPhone)}</span>` : ''}
            </div>
        </div>`
        : ''

    const validity = cfg.backShowValidity && String(cfg.backValidityNote || '').trim()
        ? `<div style="font-size:4.2pt;opacity:0.8;margin-bottom:0.6mm;">${esc(cfg.backValidityNote)}</div>`
        : ''
    const backSign = cfg.backShowSign
        ? `<div style="text-align:right;">
            <div style="display:inline-block;width:16mm;border-top:0.2mm solid currentColor;padding-top:0.2mm;font-size:4.2pt;text-align:center;">${esc(cfg.backSignLabel || 'Principal')}</div>
        </div>`
        : ''

    const body = land
        ? `<div style="flex:1;min-height:0;display:flex;gap:2mm;padding:1mm 3mm;box-sizing:border-box;">
            <div style="flex:1.2;min-width:0;display:flex;flex-direction:column;">${studentInfo}${rulesHtml}</div>
            <div style="flex:1;min-width:0;display:flex;flex-direction:column;">${emergency}<div style="margin-top:auto;">${validity}${backSign}</div></div>
        </div>`
        : `<div style="flex:1;min-height:0;display:flex;flex-direction:column;padding:1.4mm 3mm;box-sizing:border-box;overflow:hidden;">
            ${studentInfo}${rulesHtml}${emergency}
            <div style="margin-top:auto;">${validity}${backSign}</div>
        </div>`

    const footer = `<div style="flex:none;height:4mm;display:flex;align-items:center;justify-content:center;background:${th.footBg};color:${th.footText};font-size:4.2pt;font-weight:700;letter-spacing:0.3mm;box-sizing:border-box;${
        t === 'minimal' ? `border-top:0.2mm solid ${S};` : ''
    }">${esc(schoolName)}</div>`

    const minimalPad = t === 'minimal' ? (land ? 'padding-left:2.4mm;' : 'padding-top:2.4mm;') : ''

    return `<div class="idc" style="position:relative;width:${W}mm;height:${H}mm;overflow:hidden;border-radius:3mm;background:${th.cardBg};font-family:${cfg.font};color:${th.body};box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
        ${layers}
        <div style="position:relative;display:flex;flex-direction:column;width:100%;height:100%;box-sizing:border-box;${minimalPad}">
            ${header}${strip}${body}${footer}
        </div>
    </div>`
}

// ─────────────────────────────────────────────
// Small UI helpers
// ─────────────────────────────────────────────
const INPUT = "w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
const LABEL = "block text-xs font-semibold text-slate-600 mb-1"

function Section({ title, children }) {
    return (
        <div className="border-t border-slate-100 pt-4 mt-4 first:border-0 first:pt-0 first:mt-0">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">{title}</h4>
            {children}
        </div>
    )
}

function ColorField({ label, value, onChange }) {
    return (
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white"
            />
            {label}
        </label>
    )
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────
export default function IdCardSection() {
    const ctx = useProgram() || {}
    const programValue = ctx.program || 'school'
    const hydrated = ctx.hydrated

    const [students, setStudents] = useState([])
    const [loading, setLoading] = useState(true)
    const [school, setSchool] = useState({ name: '', address: '', phone: '', logo: '' })

    const [grade, setGrade] = useState('')
    const [section, setSection] = useState('')
    const [session, setSession] = useState('')
    const [search, setSearch] = useState('')
    const [selected, setSelected] = useState(() => new Set())

    const [cfg, setCfg] = useState(DEFAULT_CFG)
    const [loaded, setLoaded] = useState(false)
    const [scale, setScale] = useState(1.5)
    const [previewSide, setPreviewSide] = useState('front') // 'front' | 'back'

    const sessionInit = useRef(false)
    const warnedStorage = useRef(false)

    const set = (patch) => setCfg((c) => ({ ...c, ...patch }))
    const setField = (key, value) =>
        setCfg((c) => ({ ...c, fields: { ...c.fields, [key]: value } }))

    // ── Load saved design ──
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY)
            if (raw) {
                const saved = JSON.parse(raw)
                setCfg({
                    ...DEFAULT_CFG,
                    ...saved,
                    fields: { ...DEFAULT_CFG.fields, ...(saved.fields || {}) },
                    backRules: Array.isArray(saved.backRules) ? saved.backRules : DEFAULT_RULES,
                })
            }
        } catch {}
        setLoaded(true)
    }, [])

    // ── Save design on every change ──
    useEffect(() => {
        if (!loaded) return
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
        } catch {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...cfg, bgImage: '', fgImage: '' }))
            } catch {}
            if (!warnedStorage.current) {
                warnedStorage.current = true
                toast.warning('Your images are too large to be remembered. The design will reset them next time.')
            }
        }
    }, [cfg, loaded])

    // ── Load school info ──
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

    // ── Load students ──
    useEffect(() => {
        if (hydrated === false) return
        let alive = true
        setLoading(true)
        GlobalApi.GetAllStudents({ program: programValue })
            .then((resp) => {
                if (!alive) return
                const list = Array.isArray(resp.data) ? resp.data : []
                setStudents(
                    list.map((s) => ({
                        ...s,
                        id: s.id ?? s._id ?? null,
                        contact: s.contact || '',
                    }))
                )
            })
            .catch(() => toast.error('Could not load students'))
            .finally(() => { if (alive) setLoading(false) })
        return () => { alive = false }
    }, [programValue, hydrated])

    const newestSession = useMemo(() => {
        const list = students.map((s) => String(s.session || '').trim()).filter(Boolean)
        if (!list.length) return ''
        return list.sort((a, b) => {
            const ay = Number(a.match(/^(\d{4})/)?.[1] || 0)
            const by = Number(b.match(/^(\d{4})/)?.[1] || 0)
            return by - ay
        })[0]
    }, [students])

    useEffect(() => {
        if (!sessionInit.current && newestSession) {
            sessionInit.current = true
            setSession(newestSession)
        }
    }, [newestSession])

    const sessionOptions = useMemo(() => {
        const setS = new Set()
        students.forEach((s) => { if (s.session) setS.add(String(s.session).trim()) })
        return Array.from(setS).sort()
    }, [students])

    // ── Filtered list ──
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        const list = students.filter((s) => {
            if (grade && !sameGrade(s.grade, grade)) return false
            if (section && !sameText(s.section, section)) return false
            if (session && !sameText(s.session, session)) return false
            if (q) {
                const hay = [s.name, s.fatherName, s.rollNo, s.admissionNo, s.contact]
                    .map((v) => String(v ?? '').toLowerCase())
                    .join(' ')
                if (!hay.includes(q)) return false
            }
            return true
        })
        return sortStudents(list)
    }, [students, grade, section, session, search])

    const selectedStudents = useMemo(
        () => sortStudents(students.filter((s) => selected.has(studentKey(s)))),
        [students, selected]
    )

    const allFilteredSelected =
        filtered.length > 0 && filtered.every((s) => selected.has(studentKey(s)))

    const toggleOne = (id) =>
        setSelected((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })

    const toggleAllFiltered = () =>
        setSelected((prev) => {
            const next = new Set(prev)
            if (allFilteredSelected) filtered.forEach((s) => next.delete(studentKey(s)))
            else filtered.forEach((s) => next.add(studentKey(s)))
            return next
        })

    // ── Preview ──
    const { W, H } = sizeOf(cfg)
    const isSample = selectedStudents.length === 0
    const previewList = isSample ? [SAMPLE_STUDENT] : selectedStudents.slice(0, 12)

    const previewHtml = useMemo(
        () => previewList.map((s) => ({
            key: studentKey(s),
            html: previewSide === 'back' ? cardBackHtml(s, cfg, school) : cardHtml(s, cfg, school),
        })),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [previewList, cfg, school, previewSide]
    )

    // ── Upload handlers ──
    const onBgFile = async (e) => {
        const f = e.target.files?.[0]
        e.target.value = ''
        if (!f) return
        if (!f.type.startsWith('image/')) return toast.error('Please choose an image file')
        try {
            set({ bgImage: await loadImage(f, 1920, 'image/jpeg'), bgPreset: 'none' })
        } catch {
            toast.error('Could not read this image')
        }
    }

    const onFgFile = async (e) => {
        const f = e.target.files?.[0]
        e.target.value = ''
        if (!f) return
        if (!f.type.startsWith('image/')) return toast.error('Please choose an image file')
        try {
            set({ fgImage: await loadImage(f, 1600, 'image/png') })
        } catch {
            toast.error('Could not read this image')
        }
    }

    const applyTemplate = (key) => set({ template: key, ...TEMPLATES[key].colors })

    const resetDesign = () => {
        if (window.confirm('Reset the card design to default?')) setCfg(DEFAULT_CFG)
    }

    // ── Print / Save as PDF (front + back interleaved) ──
    const handlePrint = () => {
        if (selectedStudents.length === 0) {
            toast.error('Select at least one student first')
            return
        }
        const land = cfg.orientation === 'landscape'
        const cols = land ? 2 : 3
        const perPage = land ? 10 : 9
        const colGap = land ? 4 : 3
        const rowGap = land ? 2 : 3
        const includeBack = !!cfg.showBack

        const pages = []

        if (includeBack) {
            for (let i = 0; i < selectedStudents.length; i += perPage) {
                const chunk = selectedStudents.slice(i, i + perPage)
                const frontCards = chunk.map((s) => cardHtml(s, cfg, school)).join('')
                const backCards = chunk.map((s) => cardBackHtml(s, cfg, school)).join('')
                pages.push(`<div class="sheet">${frontCards}</div>`)
                pages.push(`<div class="sheet">${backCards}</div>`)
            }
        } else {
            for (let i = 0; i < selectedStudents.length; i += perPage) {
                const chunk = selectedStudents.slice(i, i + perPage)
                pages.push(
                    `<div class="sheet">${chunk.map((s) => cardHtml(s, cfg, school)).join('')}</div>`
                )
            }
        }

        const win = window.open('', '_blank', 'width=1000,height=800')
        if (!win) {
            toast.error('Please allow pop-ups to print')
            return
        }

        const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Student ID Cards</title>
<style>
    @page { size: A4; margin: 0; }
    * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
    }
    html, body { margin: 0; padding: 0; background: #fff; }
    .sheet {
        width: 210mm; height: 297mm; padding: 8mm;
        display: grid;
        grid-template-columns: repeat(${cols}, ${W}mm);
        column-gap: ${colGap}mm; row-gap: ${rowGap}mm;
        justify-content: center; align-content: start;
        page-break-after: always; break-after: page;
    }
    .sheet:last-child { page-break-after: auto; break-after: auto; }
    .idc { outline: 0.15mm solid #c8c8c8; }
    img { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
</style>
</head>
<body>
${pages.join('')}
<script>window.onload = function () { setTimeout(function () { window.print() }, 600) }</script>
</body>
</html>`

        win.document.open()
        win.document.write(html)
        win.document.close()
    }

    // ─────────────────────────────────────────────
    // UI
    // ─────────────────────────────────────────────
    const dark = isDarkTemplate(cfg)

    return (
        <div className="p-7">
            {/* Title */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow">
                        <IdCard size={22} />
                    </div>
                    <div>
                        <h2 className="font-bold text-2xl leading-tight">Student ID Cards</h2>
                        <p className="text-xs text-slate-500">
                            Choose students, design the card, then print or save as PDF
                        </p>
                    </div>
                </div>

                <Button
                    onClick={handlePrint}
                    disabled={selectedStudents.length === 0}
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm"
                >
                    <Printer className="w-4 h-4" />
                    Print / Save PDF ({selectedStudents.length})
                </Button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-6 items-start">
                {/* ───────── LEFT PANEL ───────── */}
                <div className="space-y-6">
                    {/* 1. Students */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <h3 className="font-bold text-slate-800 mb-3">1. Choose students</h3>

                        <div className="grid grid-cols-3 gap-2 mb-3">
                            <div>
                                <label className={LABEL}>Grade</label>
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
                            <Search size={15} className="text-slate-400" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search name, roll no, adm no..."
                                className="flex-1 outline-none text-sm bg-transparent"
                            />
                            {search && (
                                <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600">
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center justify-between mb-2">
                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={allFilteredSelected}
                                    onChange={toggleAllFiltered}
                                    disabled={filtered.length === 0}
                                    className="w-4 h-4 accent-blue-600"
                                />
                                Select all ({filtered.length})
                            </label>
                            {selected.size > 0 && (
                                <button
                                    onClick={() => setSelected(new Set())}
                                    className="text-xs font-semibold text-red-600 hover:text-red-700"
                                >
                                    Clear {selected.size} selected
                                </button>
                            )}
                        </div>

                        <div className="max-h-[340px] overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-100">
                            {loading ? (
                                <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Loading students...
                                </div>
                            ) : filtered.length === 0 ? (
                                <p className="py-10 text-center text-sm text-slate-400">
                                    No students match these filters
                                </p>
                            ) : (
                                filtered.map((s) => {
                                    const id = studentKey(s)
                                    const checked = selected.has(id)
                                    return (
                                        <label
                                            key={id}
                                            className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50 ${checked ? 'bg-blue-50/60' : ''}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => toggleOne(id)}
                                                className="w-4 h-4 accent-blue-600"
                                            />
                                            {s.image ? (
                                                <img src={s.image} alt="" className="w-8 h-8 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-white text-xs font-bold flex items-center justify-center">
                                                    {(s.name || '?').charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-slate-800 truncate">{s.name}</p>
                                                <p className="text-[11px] text-slate-500 truncate">
                                                    {[s.grade, s.section].filter(Boolean).join(' - ')}
                                                    {s.rollNo ? ` • Roll ${s.rollNo}` : ''}
                                                    {s.admissionNo ? ` • Adm ${s.admissionNo}` : ''}
                                                </p>
                                            </div>
                                        </label>
                                    )
                                })
                            )}
                        </div>
                    </div>

                    {/* 2. Design */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-800">2. Design the card</h3>
                            <button
                                onClick={resetDesign}
                                className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700"
                            >
                                <RotateCcw size={12} /> Reset
                            </button>
                        </div>

                        <Section title="Colors">
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <ColorField label="Primary" value={cfg.primary} onChange={(v) => set({ primary: v })} />
                                <ColorField label="Secondary" value={cfg.secondary} onChange={(v) => set({ secondary: v })} />
                                <ColorField label="Text" value={cfg.textColor} onChange={(v) => set({ textColor: v })} />
                                <ColorField label="Card color" value={cfg.surface} onChange={(v) => set({ surface: v })} />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {PALETTES.map((p) => (
                                    <button
                                        key={p.n}
                                        title={p.n}
                                        onClick={() => set({ primary: p.p, secondary: p.s })}
                                        className="w-9 h-9 rounded-lg border border-slate-200 overflow-hidden flex hover:scale-110 transition"
                                    >
                                        <span className="flex-1" style={{ background: p.p }} />
                                        <span className="flex-1" style={{ background: p.s }} />
                                    </button>
                                ))}
                            </div>
                        </Section>

                        <Section title="Background">
                            <label className={LABEL}>Ready-made backgrounds (always print)</label>
                            <div className="grid grid-cols-4 gap-2 mb-4">
                                {BG_PRESETS.map((p) => {
                                    const active = !cfg.bgImage && cfg.bgPreset === p.value
                                    return (
                                        <button
                                            key={p.value}
                                            onClick={() => set({ bgPreset: p.value, bgImage: '' })}
                                            title={p.label}
                                            className={`rounded-lg overflow-hidden border-2 text-[10px] font-bold transition ${
                                                active ? 'border-blue-600 ring-2 ring-blue-200' : 'border-slate-200 hover:border-slate-400'
                                            }`}
                                        >
                                            {p.value === 'none' ? (
                                                <div className="h-10 flex items-center justify-center bg-slate-50 text-slate-500">None</div>
                                            ) : (
                                                <img
                                                    src={presetUri(p.value, cfg.primary, cfg.secondary, cfg.surface, dark, true)}
                                                    alt={p.label}
                                                    className="w-full h-10 object-cover"
                                                />
                                            )}
                                            {p.value !== 'none' && (
                                                <div className="py-0.5 bg-white text-slate-600">{p.label}</div>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>

                            <label className={LABEL}>Pattern on top</label>
                            <select
                                className={INPUT + ' mb-3'}
                                value={cfg.pattern}
                                onChange={(e) => set({ pattern: e.target.value })}
                            >
                                {PATTERNS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>

                            <label className={LABEL}>Your own background image (resized to Full HD)</label>
                            <div className="flex items-center gap-2 mb-3">
                                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                                    <Upload size={13} /> Upload
                                    <input type="file" accept="image/*" className="hidden" onChange={onBgFile} />
                                </label>
                                {cfg.bgImage && (
                                    <>
                                        <img src={cfg.bgImage} alt="" className="w-12 h-8 rounded object-cover border" />
                                        <button
                                            onClick={() => set({ bgImage: '' })}
                                            className="text-xs font-semibold text-red-600"
                                        >
                                            Remove
                                        </button>
                                    </>
                                )}
                            </div>

                            {cfg.bgImage && (
                                <div className="mb-3">
                                    <label className={LABEL}>
                                        Overlay strength: {Math.round(cfg.overlay * 100)}% (helps text stay readable)
                                    </label>
                                    <input
                                        type="range" min="0" max="0.9" step="0.05"
                                        value={cfg.overlay}
                                        onChange={(e) => set({ overlay: Number(e.target.value) })}
                                        className="w-full accent-blue-600"
                                    />
                                </div>
                            )}

                            <label className={LABEL}>Foreground frame (transparent PNG on top)</label>
                            <div className="flex items-center gap-2">
                                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                                    <Upload size={13} /> Upload
                                    <input type="file" accept="image/*" className="hidden" onChange={onFgFile} />
                                </label>
                                {cfg.fgImage && (
                                    <>
                                        <img src={cfg.fgImage} alt="" className="w-12 h-8 rounded object-contain border bg-slate-100" />
                                        <button
                                            onClick={() => set({ fgImage: '' })}
                                            className="text-xs font-semibold text-red-600"
                                        >
                                            Remove
                                        </button>
                                    </>
                                )}
                            </div>
                        </Section>

                        <Section title="Photo & text">
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                    <label className={LABEL}>Photo shape</label>
                                    <select className={INPUT} value={cfg.photoShape} onChange={(e) => set({ photoShape: e.target.value })}>
                                        <option value="circle">Circle</option>
                                        <option value="rounded">Rounded</option>
                                        <option value="square">Square</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={LABEL}>Font</label>
                                    <select className={INPUT} value={cfg.font} onChange={(e) => set({ font: e.target.value })}>
                                        {FONTS.map((f) => <option key={f.label} value={f.value}>{f.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            <label className={LABEL}>Card title (leave empty to hide)</label>
                            <input className={INPUT + ' mb-3'} value={cfg.title} onChange={(e) => set({ title: e.target.value })} />

                            <label className={LABEL}>School name (empty = use Settings)</label>
                            <input
                                className={INPUT + ' mb-3'}
                                value={cfg.schoolName}
                                placeholder={school.name}
                                onChange={(e) => set({ schoolName: e.target.value })}
                            />

                            <label className={LABEL}>School address (empty = use Settings)</label>
                            <input
                                className={INPUT + ' mb-3'}
                                value={cfg.schoolAddress}
                                placeholder={school.address}
                                onChange={(e) => set({ schoolAddress: e.target.value })}
                            />

                            <label className={LABEL}>Signature label</label>
                            <input className={INPUT} value={cfg.signLabel} onChange={(e) => set({ signLabel: e.target.value })} />
                        </Section>

                        <Section title="Show on card (front)">
                            <div className="grid grid-cols-2 gap-y-2 gap-x-3">
                                {FIELD_DEFS.map((f) => (
                                    <label key={f.key} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={!!cfg.fields[f.key]}
                                            onChange={(e) => setField(f.key, e.target.checked)}
                                            className="w-4 h-4 accent-blue-600"
                                        />
                                        {f.label}
                                    </label>
                                ))}
                                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                    <input type="checkbox" checked={cfg.showLogo} onChange={(e) => set({ showLogo: e.target.checked })} className="w-4 h-4 accent-blue-600" />
                                    School logo
                                </label>
                                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                    <input type="checkbox" checked={cfg.showSession} onChange={(e) => set({ showSession: e.target.checked })} className="w-4 h-4 accent-blue-600" />
                                    Session
                                </label>
                                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                    <input type="checkbox" checked={cfg.showSign} onChange={(e) => set({ showSign: e.target.checked })} className="w-4 h-4 accent-blue-600" />
                                    Signature line
                                </label>
                            </div>
                        </Section>

                        {/* ── BACK SIDE SETTINGS ── */}
                        <Section title="Back side">
                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer mb-3">
                                <input
                                    type="checkbox"
                                    checked={!!cfg.showBack}
                                    onChange={(e) => set({ showBack: e.target.checked })}
                                    className="w-4 h-4 accent-blue-600"
                                />
                                Print back side of the card
                            </label>

                            <label className={LABEL}>Back title</label>
                            <input
                                className={INPUT + ' mb-3'}
                                value={cfg.backTitle}
                                onChange={(e) => set({ backTitle: e.target.value })}
                            />

                            <label className={LABEL}>Rules (one per line)</label>
                            <textarea
                                className={INPUT + ' mb-3'}
                                rows={5}
                                value={(cfg.backRules || []).join('\n')}
                                onChange={(e) => set({ backRules: e.target.value.split('\n') })}
                            />

                            <label className={LABEL}>Emergency label</label>
                            <input
                                className={INPUT + ' mb-3'}
                                value={cfg.backEmergencyLabel}
                                onChange={(e) => set({ backEmergencyLabel: e.target.value })}
                            />

                            <label className={LABEL}>Emergency note</label>
                            <textarea
                                className={INPUT + ' mb-3'}
                                rows={2}
                                value={cfg.backEmergencyNote}
                                onChange={(e) => set({ backEmergencyNote: e.target.value })}
                            />

                            <label className={LABEL}>Validity note</label>
                            <input
                                className={INPUT + ' mb-3'}
                                value={cfg.backValidityNote}
                                onChange={(e) => set({ backValidityNote: e.target.value })}
                            />

                            <label className={LABEL}>Back signature label</label>
                            <input
                                className={INPUT + ' mb-3'}
                                value={cfg.backSignLabel}
                                onChange={(e) => set({ backSignLabel: e.target.value })}
                            />

                            <div className="grid grid-cols-2 gap-y-2 gap-x-3 mt-2">
                                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                    <input type="checkbox" checked={!!cfg.backShowStudentInfo} onChange={(e) => set({ backShowStudentInfo: e.target.checked })} className="w-4 h-4 accent-blue-600" />
                                    Student info
                                </label>
                                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                    <input type="checkbox" checked={!!cfg.backShowRules} onChange={(e) => set({ backShowRules: e.target.checked })} className="w-4 h-4 accent-blue-600" />
                                    Rules
                                </label>
                                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                    <input type="checkbox" checked={!!cfg.backShowEmergency} onChange={(e) => set({ backShowEmergency: e.target.checked })} className="w-4 h-4 accent-blue-600" />
                                    Emergency
                                </label>
                                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                    <input type="checkbox" checked={!!cfg.backShowValidity} onChange={(e) => set({ backShowValidity: e.target.checked })} className="w-4 h-4 accent-blue-600" />
                                    Validity
                                </label>
                                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                    <input type="checkbox" checked={!!cfg.backShowSign} onChange={(e) => set({ backShowSign: e.target.checked })} className="w-4 h-4 accent-blue-600" />
                                    Signature
                                </label>
                            </div>
                        </Section>
                    </div>
                </div>

                {/* ───────── RIGHT PANEL ───────── */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden">
                            {['landscape', 'portrait'].map((o) => (
                                <button
                                    key={o}
                                    onClick={() => set({ orientation: o })}
                                    className={`px-4 py-2 text-xs font-bold capitalize transition ${
                                        cfg.orientation === o
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-white text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    {o}
                                </button>
                            ))}
                        </div>

                        <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden">
                            {Object.entries(TEMPLATES).map(([key, tpl]) => (
                                <button
                                    key={key}
                                    onClick={() => applyTemplate(key)}
                                    className={`px-3 py-2 text-xs font-bold transition ${
                                        cfg.template === key
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-white text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    {tpl.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2 ml-auto">
                            <span className="text-xs font-semibold text-slate-500">Zoom</span>
                            <input
                                type="range" min="1" max="2.5" step="0.1"
                                value={scale}
                                onChange={(e) => setScale(Number(e.target.value))}
                                className="w-28 accent-blue-600"
                            />
                        </div>
                    </div>

                    {/* FRONT / BACK PREVIEW BUTTONS */}
                    <div className="flex items-center gap-2 mt-1 mb-4 pt-3 border-t border-slate-200">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
                            Preview side:
                        </span>
                        <button
                            type="button"
                            onClick={() => setPreviewSide('front')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold border-2 transition ${
                                previewSide === 'front'
                                    ? 'bg-blue-600 text-white border-blue-600 shadow'
                                    : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
                            }`}
                        >
                            Front Side
                        </button>
                        <button
                            type="button"
                            onClick={() => setPreviewSide('back')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold border-2 transition ${
                                previewSide === 'back'
                                    ? 'bg-blue-600 text-white border-blue-600 shadow'
                                    : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
                            }`}
                        >
                            Back Side
                        </button>
                        {previewSide === 'back' && !cfg.showBack && (
                            <span className="text-[11px] text-amber-600 font-semibold">
                                (back printing off — enable it under "Back side" settings)
                            </span>
                        )}
                    </div>

                    <p className="text-xs text-slate-500 mb-4">
                        {isSample
                            ? `Sample ${previewSide} card. Select students on the left to see their real cards.`
                            : `Showing ${previewList.length} of ${selectedStudents.length} — ${previewSide} side. Printing includes all ${selectedStudents.length}${cfg.showBack ? ' (front + back)' : ' (front only)'}.`}
                    </p>

                    <div className="rounded-xl bg-slate-100 p-6 overflow-auto">
                        <div className="flex flex-wrap gap-6">
                            {previewHtml.map((c) => (
                                <div
                                    key={c.key}
                                    style={{
                                        width: `${W * scale}mm`,
                                        height: `${H * scale}mm`,
                                        boxShadow: '0 6px 18px rgba(15,23,42,0.18)',
                                        borderRadius: `${3 * scale}mm`,
                                    }}
                                >
                                    <div
                                        style={{
                                            transform: `scale(${scale})`,
                                            transformOrigin: 'top left',
                                            width: `${W}mm`,
                                            height: `${H}mm`,
                                        }}
                                        dangerouslySetInnerHTML={{ __html: c.html }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <p className="text-[11px] text-slate-400 mt-3">
                        Standard card size 85.6 × 54 mm. In the print window, turn on "Background graphics" if backgrounds look missing.
                    </p>
                </div>
            </div>
        </div>
    )
}