"use client"

import React, { useEffect, useState } from "react"
import {
  Loader2, Plus, Power, Trash2, Building2, Users, GraduationCap,
  Bell, RefreshCw, X, Mail, Calendar, Search,
} from "lucide-react"

function formatDate(d) {
  if (!d) return "—"
  try {
    return new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return "—"
  }
}

export default function AdminSchoolsPage() {
  const [schools, setSchools] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [searchInput, setSearchInput] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [toast, setToast] = useState(null)

  const [form, setForm] = useState({
    schoolName: "",
    email: "",
    ownerName: "",
    note: "",
  })
  const [saving, setSaving] = useState(false)

  const showToast = (msg, kind = "ok") => {
    setToast({ msg, kind })
    setTimeout(() => setToast(null), 3000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/schools", { cache: "no-store" })
      const data = await res.json()
      if (data.success) setSchools(data.schools || [])
      else showToast(data.error || "Failed to load", "err")
    } catch (e) {
      console.error(e)
      showToast("Failed to load", "err")
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const toggleSchool = async (school) => {
    setBusyId(school._id)
    try {
      const res = await fetch(`/api/admin/schools/${school._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !school.active }),
      })
      const data = await res.json()
      if (data.success) {
        setSchools((prev) =>
          prev.map((s) =>
            s._id === school._id ? { ...s, active: !school.active } : s
          )
        )
        showToast(
          `${school.schoolName} ${!school.active ? "activated" : "suspended"}`
        )
      } else {
        showToast(data.error || "Failed", "err")
      }
    } catch {
      showToast("Failed", "err")
    }
    setBusyId(null)
  }

  const deleteSchool = async (school) => {
    const ok = confirm(
      `Delete "${school.schoolName}" and ALL its data (students, attendance, marks, fees)?\n\nThis cannot be undone.`
    )
    if (!ok) return
    setBusyId(school._id)
    try {
      const res = await fetch(`/api/admin/schools/${school._id}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (data.success) {
        setSchools((prev) => prev.filter((s) => s._id !== school._id))
        showToast(`${school.schoolName} deleted`)
      } else {
        showToast(data.error || "Failed", "err")
      }
    } catch {
      showToast("Failed", "err")
    }
    setBusyId(null)
  }

  const createSchool = async () => {
    if (!form.schoolName.trim()) { showToast("School name required", "err"); return }
    if (!form.email.trim()) { showToast("Email required", "err"); return }

    setSaving(true)
    try {
      const res = await fetch("/api/admin/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        showToast("School added")
        setShowAdd(false)
        setForm({ schoolName: "", email: "", ownerName: "", note: "" })
        load()
      } else {
        showToast(data.error || "Failed", "err")
      }
    } catch {
      showToast("Failed", "err")
    }
    setSaving(false)
  }

  const filtered = schools.filter((s) => {
    if (!searchInput.trim()) return true
    const q = searchInput.toLowerCase()
    return (
      s.schoolName?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.schoolId?.toLowerCase().includes(q)
    )
  })

  const totalActive = schools.filter((s) => s.active).length
  const totalSuspended = schools.length - totalActive

  return (
    <div className="p-7">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center shadow-md">
            <Building2 size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Admin · Schools</h2>
            <p className="text-sm text-slate-500">
              {schools.length} total · {totalActive} active · {totalSuspended} suspended
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-bold shadow-md hover:scale-[1.02] transition"
          >
            <Plus size={16} />
            Add School
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white border rounded-2xl shadow-sm p-4 mb-5 flex items-center gap-2">
        <Search size={16} className="text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, email or ID..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="flex-1 outline-none text-sm text-slate-800 placeholder:text-slate-400"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16 text-slate-400">
          <Loader2 className="animate-spin mr-2" /> Loading schools...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border rounded-2xl p-12 text-center">
          <Building2 size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-base font-semibold text-slate-700">
            {schools.length === 0 ? "No schools yet" : "No matches"}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {schools.length === 0
              ? 'Click "Add School" to add your first school.'
              : "Try a different search."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => {
            const busy = busyId === s._id
            return (
              <div
                key={s._id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                  s.active ? "border-emerald-200" : "border-red-200"
                }`}
              >
                <div
                  className={`h-1 ${
                    s.active
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                      : "bg-gradient-to-r from-red-500 to-rose-500"
                  }`}
                />
                <div className="p-5 flex flex-wrap items-center gap-4">
                  {/* Icon + name */}
                  <div className="flex items-center gap-3 flex-1 min-w-[220px]">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        s.active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      <Building2 size={22} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-base truncate">
                        {s.schoolName}
                      </p>
                      <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                        <Mail size={11} /> {s.email}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {s.schoolId}
                      </p>
                    </div>
                  </div>

                  {/* Counts */}
                  <div className="flex gap-3 flex-wrap">
                    <div className="text-center px-3">
                      <div className="flex items-center gap-1 text-slate-500 text-[10px] uppercase font-bold">
                        <GraduationCap size={11} /> Students
                      </div>
                      <p className="text-lg font-bold text-slate-800">
                        {s.counts?.students ?? 0}
                      </p>
                    </div>
                    <div className="text-center px-3">
                      <div className="flex items-center gap-1 text-slate-500 text-[10px] uppercase font-bold">
                        <Users size={11} /> Teachers
                      </div>
                      <p className="text-lg font-bold text-slate-800">
                        {s.counts?.teachers ?? 0}
                      </p>
                    </div>
                    <div className="text-center px-3">
                      <div className="flex items-center gap-1 text-slate-500 text-[10px] uppercase font-bold">
                        <Bell size={11} /> Alerts
                      </div>
                      <p className="text-lg font-bold text-slate-800">
                        {s.counts?.notifications ?? 0}
                      </p>
                    </div>
                  </div>

                  {/* Expiry */}
                  <div className="text-right min-w-[110px]">
                    <p className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1 justify-end">
                      <Calendar size={11} /> Expires
                    </p>
                    <p className="text-sm font-semibold text-slate-700">
                      {formatDate(s.expiresAt)}
                    </p>
                    <span
                      className={`inline-block mt-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        s.active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {s.active ? "Active" : "Suspended"}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleSchool(s)}
                      disabled={busy}
                      title={s.active ? "Suspend this school" : "Activate this school"}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-50 ${
                        s.active
                          ? "bg-red-50 hover:bg-red-100 text-red-700"
                          : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {busy ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Power size={14} />
                      )}
                      {s.active ? "Suspend" : "Activate"}
                    </button>
                    <button
                      onClick={() => deleteSchool(s)}
                      disabled={busy}
                      title="Delete this school"
                      className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Add New School</h3>
                <p className="text-xs text-indigo-100 mt-0.5">
                  Only the school email can log in
                </p>
              </div>
              <button
                onClick={() => setShowAdd(false)}
                className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  School Name *
                </label>
                <input
                  value={form.schoolName}
                  onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
                  placeholder="e.g. Dawar Education System"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Owner Gmail *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="e.g. school@gmail.com"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 text-sm"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Add this Gmail to Kinde Users so they can log in.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Owner Name
                </label>
                <input
                  value={form.ownerName}
                  onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                  placeholder="e.g. Principal Ahmed"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Note
                </label>
                <input
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Optional note"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-slate-50">
              <button
                onClick={() => setShowAdd(false)}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={createSchool}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Saving...
                  </>
                ) : (
                  "Create School"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[20000] px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-bold ${
            toast.kind === "err" ? "bg-red-600" : "bg-emerald-600"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  )
}