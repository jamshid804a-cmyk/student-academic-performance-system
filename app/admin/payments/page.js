"use client"

import React, { useEffect, useState } from "react"
import {
  Loader2, RefreshCw, CheckCircle2, XCircle, Wallet,
  School, Library, Mail, Phone, Hash, Clock,
  ArrowLeft, CreditCard
} from "lucide-react"
import AdminNav from "../_component/AdminNav"

const OWNER_EMAIL = "jamshid804a@gmail.com"

function formatDate(d) {
  if (!d) return "—"
  try {
    return new Date(d).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    })
  } catch { return "—" }
}

const STATUS_STYLE = {
  pending:  { label: "PENDING",  color: "#92400e", bg: "#fef3c7" },
  approved: { label: "APPROVED", color: "#065f46", bg: "#d1fae5" },
  rejected: { label: "REJECTED", color: "#991b1b", bg: "#fee2e2" },
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState([])
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("pending")
  const [busyId, setBusyId] = useState(null)
  const [toast, setToast] = useState(null)
  const [noteInput, setNoteInput] = useState({})

  const showToast = (msg, kind = "ok") => {
    setToast({ msg, kind })
    setTimeout(() => setToast(null), 3000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const url = filter === "all"
        ? `/api/admin/payments?email=${encodeURIComponent(OWNER_EMAIL)}`
        : `/api/admin/payments?email=${encodeURIComponent(OWNER_EMAIL)}&status=${filter}`
      const res = await fetch(url, { cache: "no-store" })
      const data = await res.json()
      if (data.success) {
        setPayments(data.payments || [])
        setPendingCount(data.pendingCount || 0)
      } else {
        showToast(data.error || "Failed to load", "err")
      }
    } catch {
      showToast("Failed to load", "err")
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  useEffect(() => {
    const t = setInterval(() => {
      fetch(`/api/admin/payments?email=${encodeURIComponent(OWNER_EMAIL)}&status=pending`, { cache: "no-store" })
        .then(r => r.json())
        .then(d => { if (d.success) setPendingCount(d.pendingCount || 0) })
        .catch(() => {})
    }, 30000)
    return () => clearInterval(t)
  }, [])

  const review = async (payment, action) => {
    if (action === "approve") {
      if (!confirm(`Approve Rs. ${payment.amount} for ${payment.schoolName} (${payment.section})?\n\nThis will activate the section for 30 days.`)) return
    } else {
      if (!confirm(`Reject this payment from ${payment.schoolName}?`)) return
    }

    setBusyId(payment._id)
    try {
      const res = await fetch(`/api/admin/payments/${payment._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: OWNER_EMAIL,
          action,
          adminNote: noteInput[payment._id] || "",
        }),
      })
      const data = await res.json()
      if (data.success) {
        showToast(action === "approve" ? "Payment approved ✅" : "Payment rejected")
        load()
      } else {
        showToast(data.error || "Failed", "err")
      }
    } catch {
      showToast("Failed", "err")
    }
    setBusyId(null)
  }

  return (
    <div>
      <AdminNav />
      <div className="p-7">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link href="/admin/schools"
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600">
              <ArrowLeft size={16} />
            </Link>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md">
              <CreditCard size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Payments</h2>
              <p className="text-sm text-slate-500">
                {pendingCount} pending · {payments.length} shown
              </p>
            </div>
          </div>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold disabled:opacity-50">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        <div className="flex gap-1 bg-white border rounded-2xl p-1 mb-4 w-fit">
          {[
            { v: "pending", label: "Pending", badge: pendingCount },
            { v: "approved", label: "Approved" },
            { v: "rejected", label: "Rejected" },
            { v: "all", label: "All" },
          ].map((t) => (
            <button key={t.v} onClick={() => setFilter(t.v)}
              className={`relative px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                filter === t.v
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}>
              {t.label}
              {t.badge > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-extrabold rounded-full px-1.5 py-0.5">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-slate-400">
            <Loader2 className="animate-spin mr-2" /> Loading…
          </div>
        ) : payments.length === 0 ? (
          <div className="bg-white border rounded-2xl p-12 text-center">
            <Wallet size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-slate-700">No payments</p>
            <p className="text-xs text-slate-400 mt-1">
              {filter === "pending" ? "Nothing to review right now." : "Nothing here yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map((p) => {
              const st = STATUS_STYLE[p.status] || STATUS_STYLE.pending
              const SectionIcon = p.section === "school" ? School : Library
              const accent = p.section === "school"
                ? "from-blue-500 to-indigo-600"
                : "from-purple-500 to-fuchsia-600"

              return (
                <div key={p._id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className={`h-1 bg-gradient-to-r ${accent}`} />

                  <div className="p-5">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${accent} text-white flex items-center justify-center`}>
                        <SectionIcon size={20} />
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <p className="font-bold text-slate-800 truncate">
                          {p.schoolName}
                        </p>
                        <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                          <Mail size={11} /> {p.email}
                        </p>
                      </div>

                      <span className="text-[10px] font-extrabold uppercase px-3 py-1 rounded-full"
                        style={{ backgroundColor: st.bg, color: st.color }}>
                        {st.label}
                      </span>

                      <div className="text-right">
                        <p className="text-xs text-slate-500 font-bold uppercase">Amount</p>
                        <p className="text-xl font-extrabold text-slate-800">
                          Rs. {Number(p.amount).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <Detail icon={Hash} label="TID" value={p.tid} mono />
                      <Detail icon={School} label="Section" value={p.section === "school" ? "School" : "Academy"} />
                      <Detail icon={Phone} label="Sender Phone" value={p.senderPhone || "—"} />
                      <Detail icon={Clock} label="Submitted" value={formatDate(p.submittedAt)} />
                    </div>

                    {p.senderName && (
                      <p className="text-xs text-slate-600 mb-2">
                        <span className="font-bold">Sender:</span> {p.senderName}
                      </p>
                    )}
                    {p.note && (
                      <p className="text-xs text-slate-600 mb-2">
                        <span className="font-bold">User note:</span> {p.note}
                      </p>
                    )}
                    {p.adminNote && (
                      <p className="text-xs text-slate-600 mb-2">
                        <span className="font-bold">Admin note:</span> {p.adminNote}
                      </p>
                    )}

                    {p.status === "pending" && (
                      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
                        <input
                          type="text"
                          placeholder="Admin note (optional)"
                          value={noteInput[p._id] || ""}
                          onChange={(e) =>
                            setNoteInput((s) => ({ ...s, [p._id]: e.target.value }))
                          }
                          className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-emerald-500 text-sm"
                        />
                        <button
                          onClick={() => review(p, "reject")}
                          disabled={busyId === p._id}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-sm font-bold disabled:opacity-50">
                          {busyId === p._id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                          Reject
                        </button>
                        <button
                          onClick={() => review(p, "approve")}
                          disabled={busyId === p._id}
                          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50">
                          {busyId === p._id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                          Approve +30 days
                        </button>
                      </div>
                    )}

                    {p.status !== "pending" && p.reviewedAt && (
                      <p className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                        Reviewed {formatDate(p.reviewedAt)} by {p.reviewedBy}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
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

function Detail({ icon: Icon, label, value, mono }) {
  return (
    <div className="bg-slate-50 rounded-lg px-3 py-2">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
        <Icon size={10} /> {label}
      </p>
      <p className={`text-sm font-semibold text-slate-800 truncate ${mono ? "font-mono" : ""}`}>
        {value}
      </p>
    </div>
  )
}