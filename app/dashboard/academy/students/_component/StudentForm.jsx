"use client"

import React, { useEffect, useState } from "react"
import { Loader2, X, User, Phone, BookOpen, Users2, Wallet, UserCircle2 } from "lucide-react"

const BATCH_OPTIONS = [
  "Batch 1",
  "Batch 2",
  "Batch 3",
  "Batch 4",
  "Morning",
  "Evening",
  "Weekend",
]

export default function StudentForm({ email, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: "",
    fatherName: "",
    phone: "",
    subject: "",
    batch: "",
    monthlyFee: "",
    admissionDate: new Date().toISOString().slice(0, 10),
  })

  const [courses, setCourses] = useState([])
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // Load courses for the subject dropdown
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
    if (!form.subject) { setError("Please select a subject"); return }
    if (!form.batch) { setError("Please select a batch"); return }

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
          batch: form.batch,
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

  // Group courses by category for nicer dropdown
  const coursesByCategory = courses.reduce((acc, c) => {
    const cat = c.category || "Other"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(c)
    return acc
  }, {})

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-bold">Add Academy Student</h3>
            <p className="text-xs text-purple-100 mt-0.5">
              Enroll a student in a course
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={submit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-xs">
              {error}
            </div>
          )}

          <Field
            icon={User}
            label="Student Name *"
            value={form.name}
            onChange={(v) => set("name", v)}
            placeholder="e.g. Ahmed Khan"
          />

          <Field
            icon={UserCircle2}
            label="Father's Name"
            value={form.fatherName}
            onChange={(v) => set("fatherName", v)}
            placeholder="Optional"
          />

          <Field
            icon={Phone}
            label="Phone"
            value={form.phone}
            onChange={(v) => set("phone", v)}
            placeholder="03xx-xxxxxxx"
          />

          {/* Subject dropdown (grouped by category) */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1">
              <BookOpen size={12} /> Subject *
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
                    <option key={c._id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Don't see the course? Add it in Manage Courses.
            </p>
          </div>

          {/* Batch dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1">
              <Users2 size={12} /> Batch *
            </label>
            <select
              value={form.batch}
              onChange={(e) => set("batch", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-purple-500 text-sm bg-white"
            >
              <option value="">-- Select a batch --</option>
              {BATCH_OPTIONS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <Field
            icon={Wallet}
            label="Monthly Fee (Rs.)"
            type="number"
            value={form.monthlyFee}
            onChange={(v) => set("monthlyFee", v)}
            placeholder="Optional"
          />

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              Admission Date
            </label>
            <input
              type="date"
              value={form.admissionDate}
              onChange={(e) => set("admissionDate", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-purple-500 text-sm"
            />
          </div>
        </form>

        {/* Footer */}
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