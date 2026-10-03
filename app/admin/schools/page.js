"use client"

import React, { useEffect, useState } from "react"
import {
  Loader2, Plus, Power, Trash2, Building2, Users, GraduationCap,
  Bell, RefreshCw, X, Mail, Calendar, Search, School, BookOpen, Layers,
  Wallet, Save
} from "lucide-react"
import AdminNav from "../_component/AdminNav"

const OWNER_EMAIL = "jamshid804a@gmail.com"

function formatDate(d) {
  if (!d) return "—"
  try {
    return new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    })
  } catch { return "—" }
}

const PACKAGE_STYLE = {
  school:  { label: "SCHOOL",  color: "#1d4ed8", bg: "#dbeafe" },
  academy: { label: "ACADEMY", color: "#7c3aed", bg: "#ede9fe" },
  both:    { label: "BOTH",    color: "#0f766e", bg: "#ccfbf1" },
}

export default function AdminSchoolsPage() {
  const [schools, setSchools] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [searchInput, setSearchInput] = useState("")
  const [filterPackage, setFilterPackage] = useState("all")
  const [showAdd, setShowAdd] = useState(false)
  const [toast, setToast] = useState(null)
  const [priceInput, setPriceInput] = useState({})

  const [form, setForm] = useState({
    schoolName: "",
    email: "",
    ownerName: "",
    note: "",
    package: "school",
  })
  const [saving, setSaving] = useState(false)

  const showToast = (msg, kind = "ok") => {
    setToast({ msg, kind })
    setTimeout(() => setToast(null), 3000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/admin/schools?email=${encodeURIComponent(OWNER_EMAIL)}`,
        { cache: "no-store" }
      )
      const data = await res.json()
      if (data.success) {
        setSchools(data.schools || [])
        const seeded = {}
        for (const s of data.schools || []) {
          seeded[s._id] = String(s.academySection?.price ?? 0)
        }
        setPriceInput(seeded)
      } else {
        showToast(data.error || "Failed to load", "err")
      }
    } catch {
      showToast("Failed to load", "err")
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const toggleSection = async (school, section) => {
    const current = school[section]?.active === true
    setBusyId(school._id + section)
    try {
      const res = await fetch(`/api/admin/schools/${school._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: OWNER_EMAIL,
          [section]: { active: !current },
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSchools((prev) =>
          prev.map((s) =>
            s._id === school._id
              ? { ...s, [section]: { ...(s[section] || {}), active: !current } }
              : s
          )
        )
        showToast(`${section === "schoolSection" ? "School" : "Academy"} section ${!current ? "activated" : "suspended"}`)
      } else showToast(data.error || "Failed", "err")
    } catch {
      showToast("Failed", "err")
    }
    setBusyId(null)
  }

  const saveAcademyPrice = async (school) => {
    const raw = priceInput[school._id]
    const price = Number(raw) || 0
    if (price < 0) {
      showToast("Price cannot be negative", "err")
      return
    }
    setBusyId(school._id + "price")
    try {
      const res = await fetch(`/api/admin/schools/${school._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: OWNER_EMAIL,
          academySection: { price },
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSchools((prev) =>
          prev.map((s) =>
            s._id === school._id
              ? {
                  ...s,
                  academySection: { ...(s.academySection || {}), price },
                }
              : s
          )
        )
        showToast(`Academy price set to Rs. ${price}`)
      } else showToast(data.error || "Failed", "err")
    } catch {
      showToast("Failed", "err")
    }
    setBusyId(null)
  }

  const deleteSchool = async (school) => {
    if (!confirm(`Delete "${school.schoolName}" and ALL its data?`)) return
    setBusyId(school._id)
    try {
      const res = await fetch(
        `/api/admin/schools/${school._id}?email=${encodeURIComponent(OWNER_EMAIL)}`,
        { method: "DELETE" }
      )
      const data = await res.json()
      if (data.success) {
        setSchools((prev) => prev.filter((s) => s._id !== school._id))
        showToast(`${school.schoolName} deleted`)
      } else showToast(data.error || "Failed", "err")
    } catch {
      showToast("Failed", "err")
    }
    setBusyId(null)
  }

  const createSchool = async () => {
    if (!form.schoolName.trim() || !form.email.trim()) {
      showToast("Name and email required", "err")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/admin/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ownerEmail: OWNER_EMAIL }),
      })
      const data = await res.json()
      if (data.success) {
        showToast("Organization created")
        setShowAdd(false)
        setForm({ schoolName: "", email: "", ownerName: "", note: "", package: "school" })
        load()
      } else showToast(data.error || "Failed", "err")
    } catch {
      showToast("Failed", "err")
    }
    setSaving(false)
  }

  const filtered = schools.filter((s) => {
    if (filterPackage !== "all" && (s.package || "school") !== filterPackage) return false
    if (!searchInput.trim()) return true
    const q = searchInput.toLowerCase()
    return (
      s.schoolName?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.schoolId?.toLowerCase().includes(q)
    )
  })

  const totalActive = schools.filter((s) => s.schoolSection?.active).length

  return (
    <div>
      <AdminNav />
      <div className="p-7">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center shadow-md">
              <Building2 size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Admin · Organizations</h2>
              <p className="text-sm text-slate-500">
                {schools.length} total · {totalActive} school active
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold disabled:opacity-50">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold shadow-md hover:scale-[1.02] transition">
              <Plus size={16} /> Add Organization
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex gap-1 bg-white border rounded-2xl p-1">
            {[
              { v: "all", label: "All" },
              { v: "school", label: "Schools" },
              { v: "academy", label: "Academies" },
              { v: "both", label: "Both" },
            ].map((t) => (
              <button key={t.v} onClick={() => setFilterPackage(t.v)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  filterPackage === t.v
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="bg-white border rounded-2xl p-2 flex items-center gap-2 flex-1 min-w-[200px]">
            <Search size={16} className="text-slate-400 ml-2" />
            <input
              type="text"
              placeholder="Search by name, email or ID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1 outline-none text-sm bg-transparent py-1.5"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-slate-400">
            <Loader2 className="animate-spin mr-2" /> Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border rounded-2xl p-12 text-center">
            <Building2 size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-slate-700">No organizations</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((s) => {
              const pkg = s.package || "school"
              const pkgStyle = PACKAGE_STYLE[pkg] || PACKAGE_STYLE.school
              const showSchool = pkg === "school" || pkg === "both"
              const showAcademy = pkg === "academy" || pkg === "both"
              const schoolActive = s.schoolSection?.active === true
              const academyActive = s.academySection?.active === true

              return (
                <div key={s._id}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                    schoolActive || academyActive ? "border-emerald-200" : "border-red-200"
                  }`}>
                  <div className={`h-1 ${
                    schoolActive || academyActive
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                      : "bg-gradient-to-r from-red-500 to-rose-500"
                  }`} />

                  <div className="p-5">
                    <div className="flex flex-wrap items-center gap-4 mb-4">
                      <div className="flex items-center gap-3 flex-1 min-w-[240px]">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          schoolActive || academyActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-600"
                        }`}>
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

                      <span
                        className="text-[10px] font-extrabold uppercase px-3 py-1 rounded-full"
                        style={{ backgroundColor: pkgStyle.bg, color: pkgStyle.color }}
                      >
                        {pkgStyle.label}
                      </span>

                      <div className="flex gap-3 flex-wrap">
                        <div className="text-center px-3">
                          <div className="flex items-center gap-1 text-slate-500 text-[10px] uppercase font-bold">
                            <GraduationCap size={11} /> Students
                          </div>
                          <p className="text-lg font-bold text-slate-800">{s.counts?.students ?? 0}</p>
                        </div>
                        <div className="text-center px-3">
                          <div className="flex items-center gap-1 text-slate-500 text-[10px] uppercase font-bold">
                            <Users size={11} /> Teachers
                          </div>
                          <p className="text-lg font-bold text-slate-800">{s.counts?.teachers ?? 0}</p>
                        </div>
                        <div className="text-center px-3">
                          <div className="flex items-center gap-1 text-slate-500 text-[10px] uppercase font-bold">
                            <Bell size={11} /> Alerts
                          </div>
                          <p className="text-lg font-bold text-slate-800">{s.counts?.notifications ?? 0}</p>
                        </div>
                      </div>

                      <button onClick={() => deleteSchool(s)} disabled={busyId === s._id}
                        className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center disabled:opacity-50">
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {showSchool && (
                        <SectionRow
                          icon={School}
                          label="School Section"
                          active={schoolActive}
                          expiresAt={s.schoolSection?.expiresAt || s.expiresAt}
                          busy={busyId === s._id + "schoolSection"}
                          onToggle={() => toggleSection(s, "schoolSection")}
                        />
                      )}
                      {showAcademy && (
                        <SectionRow
                          icon={BookOpen}
                          label="Academy Section"
                          active={academyActive}
                          expiresAt={s.academySection?.expiresAt}
                          price={s.academySection?.price}
                          busy={busyId === s._id + "academySection"}
                          onToggle={() => toggleSection(s, "academySection")}
                          editablePrice
                          priceValue={priceInput[s._id] ?? ""}
                          onPriceChange={(v) =>
                            setPriceInput((p) => ({ ...p, [s._id]: v }))
                          }
                          onSavePrice={() => saveAcademyPrice(s)}
                          priceBusy={busyId === s._id + "price"}
                        />
                      )}
                      {!showSchool && !showAcademy && (
                        <div className="col-span-2 text-xs text-slate-400 italic">
                          No sections configured.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {showAdd && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
              <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">Add New Organization</h3>
                  <p className="text-xs text-indigo-100 mt-0.5">Choose a package</p>
                </div>
                <button onClick={() => setShowAdd(false)}
                  className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center">
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                    Package *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { v: "school", label: "School", icon: School },
                      { v: "academy", label: "Academy", icon: BookOpen },
                      { v: "both", label: "Both", icon: Layers },
                    ].map((p) => {
                      const Icon = p.icon
                      const selected = form.package === p.v
                      return (
                        <button key={p.v} type="button"
                          onClick={() => setForm({ ...form, package: p.v })}
                          className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition ${
                            selected
                              ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                              : "border-slate-200 hover:border-slate-300 text-slate-600"
                          }`}>
                          <Icon size={20} />
                          <span className="text-xs font-bold">{p.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Name *
                  </label>
                  <input value={form.schoolName}
                    onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
                    placeholder="e.g. ABC English Academy"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Owner Gmail *
                  </label>
                  <input type="email" value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="school@gmail.com"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 text-sm" />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Add this Gmail to Kinde Users so they can log in.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Owner Name
                  </label>
                  <input value={form.ownerName}
                    onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Note
                  </label>
                  <input value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 text-sm" />
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t bg-slate-50">
                <button onClick={() => setShowAdd(false)} disabled={saving}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={createSchool} disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : "Create"}
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
    </div>
  )
}

function SectionRow({
  icon: Icon, label, active, expiresAt, price, busy, onToggle,
  editablePrice, priceValue, onPriceChange, onSavePrice, priceBusy,
}) {
  const original = Number(price) || 0
  const current = Number(priceValue) || 0
  const dirty = editablePrice && String(original) !== String(current)

  return (
    <div className={`rounded-xl border p-4 ${
      active ? "border-emerald-200 bg-emerald-50/40" : "border-red-200 bg-red-50/40"
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
        }`}>
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-slate-800">{label}</p>
            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
              active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
            }`}>
              {active ? "Active" : "Suspended"}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
            <Calendar size={10} />
            Expires: {expiresAt ? new Date(expiresAt).toLocaleDateString("en-GB") : "—"}
            {!editablePrice && original > 0 ? ` · Rs. ${original}/mo` : ""}
          </p>
        </div>
        <button onClick={onToggle} disabled={busy}
          className={`px-3 py-2 rounded-lg text-xs font-bold transition disabled:opacity-50 flex items-center gap-1 ${
            active
              ? "bg-red-50 hover:bg-red-100 text-red-700"
              : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
          }`}>
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Power size={12} />}
          {active ? "Suspend" : "Activate"}
        </button>
      </div>

      {editablePrice && (
        <div className="mt-3 pt-3 border-t border-slate-200/70 flex items-center gap-2">
          <Wallet size={14} className="text-slate-400 shrink-0" />
          <span className="text-xs font-bold text-slate-600 shrink-0">Rs.</span>
          <input
            type="number"
            value={priceValue}
            onChange={(e) => onPriceChange(e.target.value)}
            placeholder="2000"
            className="w-24 px-2 py-1.5 rounded-lg border border-slate-300 outline-none focus:border-indigo-500 text-sm"
          />
          <span className="text-[11px] text-slate-400 shrink-0">/ month</span>
          <button
            onClick={onSavePrice}
            disabled={!dirty || priceBusy}
            className={`ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              dirty && !priceBusy
                ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}>
            {priceBusy ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Save
          </button>
        </div>
      )}
    </div>
  )
}