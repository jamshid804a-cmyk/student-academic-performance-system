"use client"

import React, { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Building2, Mail, Phone, MapPin, User as UserIcon, Upload, Loader2, Save, X, ImagePlus,
  Sun, Moon, Download, UploadCloud, Database,
  AlertTriangle, CheckCircle2, RefreshCw, HardDrive
} from 'lucide-react'
import GlobalApi from '@/app/_services/GlobalApi'
import { toast } from 'sonner'

// ─────────────────────────────────────────────
// Shared styles
// ─────────────────────────────────────────────
const inputClass =
  'w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40'
const labelClass =
  'flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2'
const cardClass =
  'bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 p-6 md:p-8'

// ─────────────────────────────────────────────
// Theme hook
// ─────────────────────────────────────────────
function useTheme() {
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initial = stored || (prefersDark ? 'dark' : 'light')
    setTheme(initial)
    document.documentElement.classList.toggle('dark', initial === 'dark')
  }, [])

  const setThemeMode = (mode) => {
    setTheme(mode)
    localStorage.setItem('theme', mode)
    document.documentElement.classList.toggle('dark', mode === 'dark')
    toast.success(`${mode === 'dark' ? 'Dark' : 'Light'} mode enabled`)
  }

  const toggleTheme = () => setThemeMode(theme === 'dark' ? 'light' : 'dark')

  return { theme, setThemeMode, toggleTheme }
}

// ─────────────────────────────────────────────
// Tabs
// ─────────────────────────────────────────────
const TABS = [
  { id: 'general', label: 'General', icon: Building2 },
  { id: 'appearance', label: 'Appearance', icon: Sun },
  { id: 'backup', label: 'Backup & Restore', icon: Database },
]

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general')
  const { theme, setThemeMode, toggleTheme } = useTheme()

  // ── School info ──
  const [form, setForm] = useState({
    name: '', address: '', principal: '', email: '', contact: '', logo: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  // ── Backup / restore ──
  const [backingUp, setBackingUp] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [lastBackup, setLastBackup] = useState(null)
  const [currentSchoolId, setCurrentSchoolId] = useState(null)
  const restoreInputRef = useRef(null)
  const [confirmRestore, setConfirmRestore] = useState(false)

  // ─────────────────────────────────────────────
  // Load initial data
  // ─────────────────────────────────────────────
  useEffect(() => {
    GlobalApi.GetSchoolInfo()
      .then((resp) => {
        if (resp.data) setForm(resp.data)
        if (resp.data?.schoolId) setCurrentSchoolId(resp.data.schoolId)
        else if (resp.data?.id) setCurrentSchoolId(resp.data.id)
      })
      .catch(() => toast.error('Failed to load school info'))
      .finally(() => setLoading(false))

    const saved = localStorage.getItem('lastBackupTime')
    if (saved) setLastBackup(saved)
  }, [])

  // ─────────────────────────────────────────────
  // Handlers — general
  // ─────────────────────────────────────────────
  const handleChange = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (file.size > 500 * 1024) {
      toast.error('Logo too large. Please use an image under 500 KB')
      return
    }
    setUploading(true)
    const reader = new FileReader()
    reader.onload = () => {
      setForm((prev) => ({ ...prev, logo: reader.result }))
      setUploading(false)
      toast.success('Logo ready — click Save to store it')
    }
    reader.onerror = () => {
      setUploading(false)
      toast.error('Failed to read file')
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await GlobalApi.SaveSchoolInfo(form)
      toast.success('Settings saved')
    } catch (err) {
      console.error(err)
      toast.error('Failed to save')
    }
    setSaving(false)
  }

  // ─────────────────────────────────────────────
  // Handlers — backup
  // ─────────────────────────────────────────────
  const handleBackup = async () => {
    setBackingUp(true)
    try {
      const resp = await GlobalApi.ExportDatabase()
      const payload = resp.data

      const counts = payload?.counts || {}
      const totalDocs =
        payload?.totalRecords ??
        Object.values(counts).reduce((a, b) => a + b, 0)
      const studentCount = counts.students || 0
      const sid = payload?.schoolId || currentSchoolId || 'school'

      if (totalDocs === 0) {
        toast.warning('Backup is empty — your school has no records')
      } else {
        toast.success(
          `Backed up ${totalDocs} records (${studentCount} students) for ${sid}`
        )
      }

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      const safeSid = String(sid).replace(/[^a-z0-9_-]/gi, '_')
      a.href = url
      a.download = `backup-${safeSid}-${stamp}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      const time = new Date().toLocaleString()
      setLastBackup(time)
      localStorage.setItem('lastBackupTime', time)
    } catch (err) {
      console.error(err)
      toast.error(
        'Backup failed: ' +
          (err?.response?.data?.error || err.message || 'Unknown error')
      )
    }
    setBackingUp(false)
  }

  // ─────────────────────────────────────────────
  // Handlers — restore
  // ─────────────────────────────────────────────
  const handleRestoreFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.json')) {
      toast.error('Please select a valid .json backup file')
      e.target.value = ''
      return
    }

    setRestoring(true)
    try {
      const text = await file.text()
      const data = JSON.parse(text)

      const counts = data?.counts || {}
      const totalDocs =
        data?.totalRecords ??
        Object.values(counts).reduce((a, b) => a + b, 0)
      const studentCount = counts.students || 0
      const backupSchoolId = data?.schoolId

      if (totalDocs === 0) {
        throw new Error('Backup file has no records to restore')
      }

      if (currentSchoolId && backupSchoolId && backupSchoolId !== currentSchoolId) {
        throw new Error(
          `This backup is for "${backupSchoolId}" but you are logged in as "${currentSchoolId}".`
        )
      }

      const ok = confirm(
        `⚠️ RESTORE WARNING ⚠️\n\n` +
          `This will REPLACE all data for your school (${backupSchoolId || currentSchoolId || 'your school'}):\n\n` +
          `• ${studentCount} students\n` +
          `• ${counts.teachers || 0} teachers\n` +
          `• ${counts.fees || 0} fee records\n` +
          `• ${counts.attendance || 0} attendance records\n` +
          `• Total: ${totalDocs} records across ${Object.keys(counts).length} collections\n\n` +
          `Other schools' data will NOT be affected.\n\n` +
          `Continue?`
      )

      if (!ok) {
        setRestoring(false)
        e.target.value = ''
        setConfirmRestore(false)
        return
      }

      const resp = await GlobalApi.ImportDatabase({
        data,
        schoolId: backupSchoolId,
      })
      const result = resp?.data

      // Count what was REALLY written (ignore the global "counters" collection)
      const restoredTotal = Object.entries(result?.counts || {})
        .filter(([name]) => name !== 'counters')
        .reduce((a, [, n]) => a + (n > 0 ? n : 0), 0)

      if (restoredTotal === 0) {
        console.error('Restore details:', result)
        throw new Error(
          'Nothing was restored. ' + (result?.details?.slice(0, 3).join(' | ') || '')
        )
      }

      if (result?.errors?.length) {
        console.error('Restore errors:', result.errors)
        toast.warning(
          `Restored ${restoredTotal} records (${result.finalStudentCount} students) with ` +
            `${result.errors.length} problem(s). First: ${result.errors[0]}`,
          { duration: 8000 }
        )
        setTimeout(() => window.location.reload(), 4000)
      } else {
        toast.success(
          `Restored ${restoredTotal} records — ${result.finalStudentCount} students in ${result.schoolId}. Reloading...`
        )
        setTimeout(() => window.location.reload(), 1200)
      }
    } catch (err) {
      console.error(err)
      toast.error(
        'Restore failed: ' +
          (err?.response?.data?.error || err.message || 'Unknown error')
      )
    }
    setRestoring(false)
    e.target.value = ''
    setConfirmRestore(false)
  }

  // ─────────────────────────────────────────────
  // Loading state
  // ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-10 flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div className="p-5 md:p-7 animate-fade-in min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform duration-300">
            <Building2 size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Settings</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manage your school, security & data
            </p>
          </div>
        </div>

        <button
          onClick={toggleTheme}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-blue-400 dark:hover:border-blue-500 shadow-sm hover:shadow-md transition-all"
          title="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun size={18} className="text-yellow-400" />
          ) : (
            <Moon size={18} className="text-indigo-600" />
          )}
          <span className="text-sm font-semibold">
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 p-1.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                active
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Icon size={16} /> {tab.label}
            </button>
          )
        })}
      </div>

      {/* ════════════ GENERAL TAB ════════════ */}
      {activeTab === 'general' && (
        <div className={cardClass}>
          <div className="flex flex-col md:flex-row items-center gap-6 mb-8 p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-800 border border-blue-100 dark:border-slate-700">
            <div className="relative group">
              {form.logo ? (
                <div className="relative">
                  <img
                    src={form.logo}
                    alt="School Logo"
                    className="w-32 h-32 object-contain rounded-2xl border-4 border-white dark:border-slate-600 shadow-md group-hover:scale-105 transition-transform duration-300"
                  />
                  <button
                    onClick={() => setForm((prev) => ({ ...prev, logo: '' }))}
                    className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md transition"
                    title="Remove logo"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="w-32 h-32 rounded-2xl bg-white dark:bg-slate-700 border-2 border-dashed border-blue-300 dark:border-slate-500 flex items-center justify-center text-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-slate-600 transition-all duration-300">
                  <ImagePlus size={40} />
                </div>
              )}
            </div>

            <div className="flex-1 text-center md:text-left">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
                School Logo
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Upload a square image (PNG or JPG). Max 500 KB.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow-sm hover:scale-105 transition-transform"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" /> Choose File
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
            <div>
              <label className={labelClass}>
                <Building2 size={15} /> School Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. SAPSYSYSTEM"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                <UserIcon size={15} /> Principal Name
              </label>
              <input
                type="text"
                value={form.principal}
                onChange={(e) => handleChange('principal', e.target.value)}
                placeholder="e.g. Mr. Ahmed Khan"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                <Mail size={15} /> Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="e.g. info@school.com"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                <Phone size={15} /> Contact No
              </label>
              <input
                type="text"
                value={form.contact}
                onChange={(e) => handleChange('contact', e.target.value)}
                placeholder="e.g. 0300-1234567"
                className={inputClass}
              />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>
                <MapPin size={15} /> Address
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="e.g. Gahri Chandan Payan"
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex justify-end pt-5 border-t border-slate-100 dark:border-slate-700">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-2.5 rounded-xl shadow-md hover:scale-105 transition-transform disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" /> Save Settings
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ════════════ APPEARANCE TAB ════════════ */}
      {activeTab === 'appearance' && (
        <div className={cardClass}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow">
              <Sun size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Appearance</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Customize how the app looks
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setThemeMode('light')}
              className={`relative p-5 rounded-2xl border-2 text-left transition-all ${
                theme === 'light'
                  ? 'border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900/40 bg-blue-50/50 dark:bg-slate-700'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                  <Sun size={20} className="text-amber-500" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-100">Light Mode</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Bright & clean</p>
                </div>
              </div>
              <div className="h-14 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 flex items-center px-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
                <div className="h-2 w-16 rounded bg-slate-300" />
              </div>
              {theme === 'light' && (
                <CheckCircle2 size={18} className="absolute top-3 right-3 text-blue-600" />
              )}
            </button>

            <button
              onClick={() => setThemeMode('dark')}
              className={`relative p-5 rounded-2xl border-2 text-left transition-all ${
                theme === 'dark'
                  ? 'border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900/40 bg-slate-700'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <Moon size={20} className="text-indigo-300" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-100">Dark Mode</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Easy on the eyes</p>
                </div>
              </div>
              <div className="h-14 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center px-3">
                <div className="w-2 h-2 rounded-full bg-indigo-400 mr-2" />
                <div className="h-2 w-16 rounded bg-slate-600" />
              </div>
              {theme === 'dark' && (
                <CheckCircle2 size={18} className="absolute top-3 right-3 text-blue-500" />
              )}
            </button>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Your preference is saved locally and will persist across sessions on this device.
            </p>
          </div>
        </div>
      )}

      {/* ════════════ BACKUP & RESTORE TAB ════════════ */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 flex items-start gap-3">
            <Database size={20} className="text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
            <div className="text-sm text-indigo-800 dark:text-indigo-200">
              <p className="font-semibold mb-1">School-scoped backup</p>
              <p className="text-indigo-700 dark:text-indigo-300">
                Your backup includes <strong>only your school's data</strong>
                {currentSchoolId && (
                  <>
                    {' '}
                    (<code className="px-1 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40">
                      {currentSchoolId}
                    </code>
                    )
                  </>
                )}
                . Other schools' data is never included, and restore never touches other schools.
              </p>
            </div>
          </div>

          {/* Backup */}
          <div className={cardClass}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow">
                <Download size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  Backup Your School
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Export only your school's data as a JSON file
                </p>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 mb-5 flex items-start gap-3">
              <HardDrive size={20} className="text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <div className="text-sm text-emerald-800 dark:text-emerald-200">
                <p className="font-semibold mb-1">What's included?</p>
                <p className="text-emerald-700 dark:text-emerald-300">
                  Students, teachers, classes, attendance, fees, exams, tests, subjects, parents,
                  notifications, academy data — all limited to your school.
                </p>
                {lastBackup && (
                  <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <RefreshCw size={12} /> Last backup: {lastBackup}
                  </p>
                )}
              </div>
            </div>

            <Button
              onClick={handleBackup}
              disabled={backingUp}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-6 py-2.5 rounded-xl shadow-md hover:scale-105 transition-transform disabled:opacity-60"
            >
              {backingUp ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating backup...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" /> Download Backup
                </>
              )}
            </Button>
          </div>

          {/* Restore */}
          <div className={cardClass}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow">
                <UploadCloud size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  Restore Your School
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Import a school-scoped backup file
                </p>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 mb-5 flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-semibold mb-1">Warning — Destructive Action</p>
                <p className="text-amber-700 dark:text-amber-300">
                  Restoring will <strong>replace your school's current data</strong> with the
                  backup file's contents. Other schools are not affected.
                </p>
              </div>
            </div>

            <input
              ref={restoreInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleRestoreFile}
              className="hidden"
            />

            {!confirmRestore ? (
              <Button
                onClick={() => setConfirmRestore(true)}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white px-6 py-2.5 rounded-xl shadow-md hover:scale-105 transition-transform"
              >
                <UploadCloud className="w-4 h-4 mr-2" /> Choose Backup File
              </Button>
            ) : (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                <p className="text-sm font-semibold text-rose-800 dark:text-rose-200 mb-3 flex items-center gap-2">
                  <AlertTriangle size={16} /> Are you sure? This will overwrite your school's data.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => restoreInputRef.current?.click()}
                    disabled={restoring}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 rounded-xl shadow-sm"
                  >
                    {restoring ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Restoring...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4 mr-2" /> Yes, Continue
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setConfirmRestore(false)}
                    disabled={restoring}
                    className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 px-5 py-2 rounded-xl"
                  >
                    <X className="w-4 h-4 mr-2" /> Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Best practices */}
          <div className="p-5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="flex items-start gap-3">
              <Database size={18} className="text-slate-500 dark:text-slate-400 mt-0.5 shrink-0" />
              <div className="text-sm text-slate-600 dark:text-slate-400">
                <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Best Practices
                </p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Create backups regularly (weekly or before major changes)</li>
                  <li>Store backups in a safe place — cloud or external drive</li>
                  <li>Test restores on a staging environment if possible</li>
                  <li>
                    Each school's backup is isolated — you can only restore your own school's backup
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>s
  )
}