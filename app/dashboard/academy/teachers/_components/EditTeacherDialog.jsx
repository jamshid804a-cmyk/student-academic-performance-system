"use client"
import React, { useState, useEffect } from "react"
import { X, LoaderIcon, Plus } from "lucide-react"
import GlobalApi from "@/app/_services/GlobalApi"
import { toast } from "sonner"

const SECTIONS = ["A", "B", "C"]

export default function EditTeacherDialog({ teacher, email, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: teacher.name || "",
    email: teacher.email || "",
    phone: teacher.phone || "",
    qualification: teacher.qualification || "",
    subject: teacher.subject || "",
    joiningDate: teacher.joiningDate || "",
    salary: teacher.salary ?? "",
    address: teacher.address || "",
    status: teacher.status || "Active",
  })
  const [classes, setClasses] = useState(
    Array.isArray(teacher.classes) ? [...teacher.classes] : []
  )
  const [courses, setCourses] = useState([])
  const [coursesLoading, setCoursesLoading] = useState(true)

  const [newClassCourse, setNewClassCourse] = useState("")
  const [newClassSection, setNewClassSection] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!email) return
    fetch(`/api/academy/courses?email=${encodeURIComponent(email)}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d.success) setCourses(d.courses || []) })
      .catch(() => {})
      .finally(() => setCoursesLoading(false))
  }, [email])

  const setField = (key, value) => setForm((p) => ({ ...p, [key]: value }))

  const addClass = () => {
    if (!newClassCourse) { toast.error("Select a course first"); return }
    const exists = classes.some(
      (c) => c.course === newClassCourse && c.section === newClassSection
    )
    if (exists) { toast.error("Already added"); return }
    setClasses((p) => [...p, { course: newClassCourse, section: newClassSection }])
    setNewClassCourse("")
    setNewClassSection("")
  }

  const removeClass = (idx) => setClasses((p) => p.filter((_, i) => i !== idx))

  const save = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return }
    if (!form.email.trim()) { toast.error("Email is required"); return }

    setSaving(true)
    try {
      await GlobalApi.UpdateAcademyTeacher({
        orgEmail: email,
        _id: teacher._id,
        ...form,
        salary: Number(form.salary) || 0,
        classes,
      })
      toast.success("Teacher updated")
      onSaved?.()
    } catch (err) {
      console.error(err)
      const msg = err?.response?.data?.error || "Failed to update teacher"
      toast.error(msg)
    }
    setSaving(false)
  }

  const inputCls = "w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 dark:focus:ring-amber-900/40 transition"
  const labelCls = "block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5 uppercase tracking-wide"

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full my-8">
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-amber-500 to-orange-500 rounded-t-2xl">
          <div>
            <h3 className="text-lg font-bold text-white">Edit Teacher</h3>
            <p className="text-xs text-amber-100 mt-0.5">
              {teacher.teacherId} · {teacher.name}
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Teacher Name *</label>
              <input value={form.name} onChange={(e) => setField("name", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Email *</label>
              <input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Phone Number</label>
              <input value={form.phone} onChange={(e) => setField("phone", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Subject</label>
              <input value={form.subject} onChange={(e) => setField("subject", e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Qualification</label>
              <input value={form.qualification} onChange={(e) => setField("qualification", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Joining Date</label>
              <input type="date" value={form.joiningDate} onChange={(e) => setField("joiningDate", e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Salary (Rs.)</label>
              <input type="number" value={form.salary} onChange={(e) => setField("salary", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select value={form.status} onChange={(e) => setField("status", e.target.value)} className={inputCls}>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Address</label>
            <input value={form.address} onChange={(e) => setField("address", e.target.value)} className={inputCls} />
          </div>

          <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
            <label className={labelCls}>Assigned Courses</label>
            <div className="flex flex-wrap gap-2 mb-3">
              <select
                value={newClassCourse}
                onChange={(e) => setNewClassCourse(e.target.value)}
                disabled={coursesLoading}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm outline-none focus:border-amber-500 min-w-[180px]"
              >
                <option value="">{coursesLoading ? "Loading…" : "Select Course"}</option>
                {courses.map((c) => <option key={c._id} value={c.name}>{c.name}</option>)}
              </select>
              <select
                value={newClassSection}
                onChange={(e) => setNewClassSection(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm outline-none focus:border-amber-500"
              >
                <option value="">Section (optional)</option>
                {SECTIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
              <button onClick={addClass}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold">
                <Plus size={14} /> Add
              </button>
            </div>

            {classes.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No courses assigned.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {classes.map((c, i) => (
                  <div key={i}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700">
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                      {c.course}{c.section ? ` - ${c.section}` : ""}
                    </span>
                    <button onClick={() => removeClass(i)}
                      className="w-4 h-4 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-300 flex items-center justify-center hover:bg-red-200 hover:text-red-700 transition">
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 rounded-b-2xl">
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition disabled:opacity-50">
            Cancel
          </button>
          <button onClick={save} disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition flex items-center gap-2 disabled:opacity-60">
            {saving ? <><LoaderIcon size={16} className="animate-spin" /> Saving...</> : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  )
}