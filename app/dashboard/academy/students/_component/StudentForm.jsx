"use client"

import React, { useEffect, useState } from "react"
import { Loader2, X, User, Phone, BookOpen, Wallet, UserCircle2, Layers } from "lucide-react"

const SECTIONS = ["A", "B", "C"]

export default function StudentForm({ email, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: "",
    fatherName: "",
    phone: "",
    subject: "",
    section: "",
    year: String(new Date().getFullYear()),
    monthlyFee: "",
    admissionDate: new Date().toISOString().slice(0, 10),
  })

  const [courses, setCourses] = useState([])
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!email) return
    fetch(`/api/academy/courses?email=${encodeURIComponent(email)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (d.success) setCourses(d.courses || []) })
      .catch(() => {})
      .finally(() => setCoursesLoading(false))
  }, [email])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setError("")

    if (!form.name.trim()) { setError("Student name is required"); return }
    if (!form.subject) { setError("Please select a course"); return }
    if (!form.section) { setError("Please select a section"); return }

    setSaving(true)
    try {
      const res = await fetch("/api/academy/student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: form.name.trim(),
          fatherName: form.fatherName.trim(),
          phone: form.phone.trim(),
          subject: form.subject,
          section: form.section,
          year: form.year,
          monthlyFee: Number(form.monthlyFee) || 0,
          admissionDate: form.admissionDate || null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        onCreated?.()
      } else {
        setError(data.error || "Failed to create student")
      }
    } catch {
      setError("Failed to create student")
    }
    setSaving(false)
  }

  const coursesByCategory = courses.reduce((acc, c) => {
    const cat = c.category || "Other"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(c)
    return acc
  }, {})

  const years = []
  const start = 2025
  const end = Math.max(new Date().getFullYear() + 10, 2035)
  for (let y = start; y <= end; y++) years.push(String(y))

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-6 py-5 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-bold">Add Academy Student</h3>
            <p className="text-xs text-purple-100 mt-0.5">Enroll a student in a course</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-xs">
              {error}
            </div>
          )}

          <Field icon={User} label="Student Name *" value={form.name}
            onChange={(v) => set("name", v)} placeholder="e.g. Ahmed Khan" />

          <Field icon={UserCircle2} label="Father's Name" value={form.fatherName}
            onChange={(v) => set("fatherName", v)} placeholder="Optional" />

          <Field icon={Phone} label="Phone" value={form.phone}
            onChange={(v) => set("phone", v)} placeholder="03xx-xxxxxxx" />

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1">
              <BookOpen size={12} /> Course *
            </label>
            <select
              value={form.subject}
              onChange={(e) => set("subject", e.target.value)}
              disabled={coursesLoading}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-purple-500 text-sm bg-white disabled:opacity-50"
            >
              <option value="">{coursesLoading ? "Loading courses…" : "-- Select a course --"}</option>
              {Object.keys(coursesByCategory).sort().map((cat) => (
                <optgroup key={cat} label={cat}>
                  {coursesByCategory[cat].map((c) => (
                    <option key={c._id} value={c.name}>{c.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1">
              <Layers size={12} /> Section *
            </label>
            <select
              value={form.section}
              onChange={(e) => set("section", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-purple-500 text-sm bg-white"
            >
              <option value="">-- Select a section --</option>
              {SECTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Year</label>
            <select
              value={form.year}
              onChange={(e) => set("year", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-purple-500 text-sm bg-white"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <Field icon={Wallet} label="Monthly Fee (Rs.)" type="number"
            value={form.monthlyFee} onChange={(v) => set("monthlyFee", v)} placeholder="Optional" />

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Admission Date</label>
            <input type="date" value={form.admissionDate}
              onChange={(e) => set("admissionDate", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-purple-500 text-sm" />
          </div>
        </form>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-slate-50 shrink-0">
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={submit} disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : "Add Student"}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ icon: Icon, label, value, onChange, placeholder, type = "text" }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1">
        {Icon && <Icon size={12} />} {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-purple-500 text-sm"
      />
    </div>
  )
}