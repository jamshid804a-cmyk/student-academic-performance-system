"use client"
export const dynamic = 'force-dynamic'

import React, { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Building2, Mail, Phone, MapPin, User as UserIcon, Upload, Loader2, Save, X, ImagePlus } from 'lucide-react'
import GlobalApi from '@/app/_services/GlobalApi'
import { toast } from 'sonner'

export default function SettingsPage() {
  const [form, setForm] = useState({
    name: '', address: '', principal: '', email: '', contact: '', logo: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    GlobalApi.GetSchoolInfo()
      .then(resp => {
        if (resp.data) setForm(resp.data)
      })
      .catch(() => toast.error("Failed to load school info"))
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file")
      return
    }
    if (file.size > 500 * 1024) {
      toast.error("Logo too large. Please use an image under 500 KB")
      return
    }

    setUploading(true)
    const reader = new FileReader()
    reader.onload = () => {
      setForm(prev => ({ ...prev, logo: reader.result }))
      setUploading(false)
      toast.success("Logo ready — click Save to store it")
    }
    reader.onerror = () => {
      setUploading(false)
      toast.error("Failed to read file")
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await GlobalApi.SaveSchoolInfo(form)
      toast.success("Settings saved")
    } catch (err) {
      console.error(err)
      toast.error("Failed to save")
    }
    setSaving(false)
  }

  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40"
  const labelClass = "flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"

  if (loading) {
    return (
      <div className="p-10 flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    )
  }

  return (
    <div className="p-7 animate-fade-in">

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform duration-300">
          <Building2 size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">School Settings</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage school information & branding</p>
        </div>
      </div>

      {/* Main card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 p-8">

        {/* Logo upload */}
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
                  onClick={() => setForm(prev => ({ ...prev, logo: '' }))}
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
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">School Logo</h3>
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
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" /> Choose File</>
              )}
            </Button>
          </div>
        </div>

        {/* Form fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          <div>
            <label className={labelClass}><Building2 size={15} /> School Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g. SAPSYSYSTEM"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}><UserIcon size={15} /> Principal Name</label>
            <input
              type="text"
              value={form.principal}
              onChange={(e) => handleChange('principal', e.target.value)}
              placeholder="e.g. Mr. Ahmed Khan"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}><Mail size={15} /> Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="e.g. info@school.com"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}><Phone size={15} /> Contact No</label>
            <input
              type="text"
              value={form.contact}
              onChange={(e) => handleChange('contact', e.target.value)}
              placeholder="e.g. 0300-1234567"
              className={inputClass}
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}><MapPin size={15} /> Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="e.g. Gahri Chandan Payan"
              className={inputClass}
            />
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end pt-5 border-t border-slate-100 dark:border-slate-700">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-2.5 rounded-xl shadow-md hover:scale-105 transition-transform disabled:opacity-60"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Save Settings</>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}