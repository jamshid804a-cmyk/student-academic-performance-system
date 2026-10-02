"use client"

import React, { useEffect, useState } from "react"
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs"
import {
  Loader2, BookOpen, Plus, Trash2, Search, RefreshCw, X, Tag
} from "lucide-react"

export default function CoursesContent() {
  const { user } = useKindeBrowserClient() || {}
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [search, setSearch] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [toast, setToast] = useState(null)

  const [form, setForm] = useState({ name: "", category: "Custom" })
  const [saving, setSaving] = useState(false)

  const showToast = (msg, kind = "ok") => {
    setToast({ msg, kind })
    setTimeout(() => setToast(null), 3000)
  }

  const load = async () => {
    if (!user?.email) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/academy/courses?email=${encodeURIComponent(user.email)}`,
        { cache: "no-store" }
      )
      const data = await res.json()
      if (data.success) setCourses(data.courses || [])
      else showToast(data.error || "Failed to load", "err")
    } catch {
      showToast("Failed to load", "err")
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [user?.email])

  const addCourse = async () => {
    if (!form.name.trim()) {
      showToast("Course name is required", "err")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/academy/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user?.email,
          name: form.name.trim(),
          category: form.category.trim() || "Custom",
        }),
      })
      const data = await res.json()
      if (data.success) {
        showToast("Course added ✅")
        setShowAdd(false)
        setForm({ name: "", category: "Custom" })
        load()
      } else showToast(data.error || "Failed", "err")
    } catch {
      showToast("Failed", "err")
    }
    setSaving(false)
  }

  const deleteCourse = async (course) => {
    if (course.isDefault) {
      if (!confirm(`"${course.name}" is a default course. Delete it anyway?`)) return
    } else {
      if (!confirm(`Delete "${course.name}"?`)) return
    }
    setBusyId(course._id)
    try {
      const res = await fetch(
        `/api/academy/courses?id=${course._id}&email=${encodeURIComponent(user.email)}`,
        { method: "DELETE" }
      )
      const data = await res.json()
      if (data.success) {
        setCourses((prev) => prev.filter((c) => c._id !== course._id))
        showToast(`${course.name} deleted`)
      } else showToast(data.error || "Failed", "err")
    } catch {
      showToast("Failed", "err")
    }
    setBusyId(null)
  }

  const filtered = courses.filter((c) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      c.name?.toLowerCase().includes(q) ||
      c.category?.toLowerCase().includes(q)
    )
  })

  // Group by category
  const grouped = filtered.reduce((acc, c) => {
    const cat = c.category || "Other"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(c)
    return acc
  }, {})

  return (
    <div className="p-7">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white flex items-center justify-center shadow-md">
            <BookOpen size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Courses</h2>
            <p className="text-sm text-slate-500">
              {courses.length} total · {Object.keys(grouped).length} categories
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold disabled:opacity-50">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-sm font-bold shadow-md hover:scale-[1.02] transition">
            <Plus size={16} /> Add Course
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-2 flex items-center gap-2 mb-4">
        <Search size={16} className="text-slate-400 ml-2" />
        <input
          type="text"
          placeholder="Search courses…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 outline-none text-sm bg-transparent py-1.5"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-slate-400">
          <Loader2 className="animate-spin mr-2" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border rounded-2xl p-12 text-center">
          <BookOpen size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="font-semibold text-slate-700">No courses</p>
          <p className="text-xs text-slate-400 mt-1">
            {search ? "No matches." : "Click Add Course to create the first one."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.keys(grouped).sort().map((cat) => (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-3">
                <Tag size={14} className="text-purple-600" />
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                  {cat}
                </h3>
                <span className="text-xs text-slate-400">
                  ({grouped[cat].length})
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {grouped[cat].map((c) => (
                  <div key={c._id}
                    className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-3 hover:shadow-sm transition group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                        {c.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">
                          {c.name}
                        </p>
                        {c.isDefault && (
                          <p className="text-[10px] text-slate-400 uppercase font-bold">
                            Default
                          </p>
                        )}
                      </div>
                    </div>
                    <button onClick={() => deleteCourse(c)} disabled={busyId === c._id}
                      className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 flex items-center justify-center disabled:opacity-50 transition shrink-0">
                      {busyId === c._id
                        ? <Loader2 size={14} className="animate-spin" />
                        : <Trash2 size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-5 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Add Course</h3>
                <p className="text-xs text-purple-100 mt-0.5">
                  Add a custom course for your academy
                </p>
              </div>
              <button onClick={() => setShowAdd(false)}
                className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Course Name *
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. IELTS Preparation"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 outline-none focus:border-purple-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Category
                </label>
                <input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Custom"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 outline-none focus:border-purple-500 text-sm"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  e.g. Language, Computer, Test Prep, Other
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-slate-50">
              <button onClick={() => setShowAdd(false)} disabled={saving}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50">
                Cancel
              </button>
              <button onClick={addCourse} disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
                {saving ? <><Loader2 size={14} className="animate-spin" /> Adding…</> : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[20000] px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-bold ${
          toast.kind === "err" ? "bg-red-600" : "bg-emerald-600"
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}