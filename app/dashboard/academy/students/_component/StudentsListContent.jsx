"use client"

import React, { useEffect, useState } from "react"
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs"
import {
  Loader2, GraduationCap, Plus, Trash2, Search,
  RefreshCw, Phone, BookOpen, Users2, Layers
} from "lucide-react"
import StudentForm from "./StudentForm"

export default function StudentsListContent() {
  const { user } = useKindeBrowserClient() || {}
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [search, setSearch] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg, kind = "ok") => {
    setToast({ msg, kind })
    setTimeout(() => setToast(null), 3000)
  }

  const load = async () => {
    if (!user?.email) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/academy/student?email=${encodeURIComponent(user.email)}`,
        { cache: "no-store" }
      )
      const data = await res.json()
      if (data.success) setStudents(data.students || [])
      else showToast(data.error || "Failed to load", "err")
    } catch {
      showToast("Failed to load", "err")
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [user?.email])

  const removeStudent = async (student) => {
    if (!confirm(`Delete "${student.name}"?`)) return
    setBusyId(student._id)
    try {
      const res = await fetch(
        `/api/academy/student?id=${student._id}&email=${encodeURIComponent(user.email)}`,
        { method: "DELETE" }
      )
      const data = await res.json()
      if (data.success) {
        setStudents((prev) => prev.filter((s) => s._id !== student._id))
        showToast(`${student.name} deleted`)
      } else showToast(data.error || "Failed", "err")
    } catch {
      showToast("Failed", "err")
    }
    setBusyId(null)
  }

  const filtered = students.filter((s) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      s.name?.toLowerCase().includes(q) ||
      s.subject?.toLowerCase().includes(q) ||
      s.section?.toLowerCase().includes(q) ||
      s.phone?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="p-7">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white flex items-center justify-center shadow-md">
            <GraduationCap size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Academy Students</h2>
            <p className="text-sm text-slate-500">
              {students.length} enrolled
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
            <Plus size={16} /> Add Student
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-2 flex items-center gap-2 mb-4">
        <Search size={16} className="text-slate-400 ml-2" />
        <input
          type="text"
          placeholder="Search by name, course, section, phone…"
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
          <GraduationCap size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="font-semibold text-slate-700">No students</p>
          <p className="text-xs text-slate-400 mt-1">
            {search ? "No matches found." : "Click Add Student to enroll the first one."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <div key={s._id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden group">
              <div className="h-1 bg-gradient-to-r from-purple-500 to-fuchsia-600" />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
                      {s.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{s.name}</p>
                      {s.fatherName && (
                        <p className="text-xs text-slate-500 truncate">
                          s/o {s.fatherName}
                        </p>
                      )}
                    </div>
                  </div>
                  <button onClick={() => removeStudent(s)} disabled={busyId === s._id}
                    className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 flex items-center justify-center disabled:opacity-50 transition">
                    {busyId === s._id
                      ? <Loader2 size={14} className="animate-spin" />
                      : <Trash2 size={14} />}
                  </button>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <Row icon={BookOpen} label="Course" value={s.subject || "—"} />
                  <Row icon={Layers} label="Section" value={s.section || "—"} />
                  {s.year && <Row icon={Users2} label="Year" value={s.year} />}
                  {s.phone && <Row icon={Phone} label="Phone" value={s.phone} />}
                  {s.monthlyFee > 0 && (
                    <Row icon={BookOpen} label="Monthly Fee" value={`Rs. ${s.monthlyFee}`} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <StudentForm
          email={user?.email}
          onClose={() => setShowAdd(false)}
          onCreated={() => { setShowAdd(false); load(); showToast("Student added ✅") }}
        />
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

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon size={13} className="text-slate-400 shrink-0" />
      <span className="text-slate-500 shrink-0">{label}:</span>
      <span className="font-semibold text-slate-800 truncate">{value}</span>
    </div>
  )
}