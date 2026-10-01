"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { QRCodeSVG } from "qrcode.react"
import {
  Loader2, School, Library, Wallet, Phone, User, Hash,
  AlertCircle, CheckCircle2, ArrowLeft, Copy, Check
} from "lucide-react"
import GlobalApi from "@/app/_services/GlobalApi"

// ─────────────────────────────────────────────
// Payment receiver details
// ─────────────────────────────────────────────
const PAYMENT_INFO = {
  easypaisa: {
    label: "EasyPaisa",
    number: "03279712048",
    name: "Jamshid Khan Afridi",
  },
  jazzcash: {
    label: "JazzCash",
    number: "03279712048",
    name: "Jamshid Khan Afridi",
  },
}

export default function PaySectionPage() {
  const params = useParams()
  const router = useRouter()
  const sectionParam = String(params?.section || "").toLowerCase()

  const section = ["school", "academy"].includes(sectionParam) ? sectionParam : null

  const [org, setOrg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    tid: "",
    amount: "",
    senderName: "",
    senderPhone: "",
    note: "",
  })

  const [copiedKey, setCopiedKey] = useState(null)

  // Load org info
  useEffect(() => {
    GlobalApi.GetOrgSections()
      .then((resp) => {
        if (resp?.data?.success) {
          const d = resp.data
          const sectionData =
            section === "school" ? d.schoolSection : d.academySection

          // If already active → send back to dashboard
          if (sectionData?.active) {
            router.replace("/dashboard")
            return
          }

          setOrg({
            ...d,
            currentSection: sectionData,
          })

          // Prefill amount from section price
          if (sectionData?.price) {
            setForm((f) => ({ ...f, amount: String(sectionData.price) }))
          }
        } else {
          setError(resp?.data?.error || "Could not load organization")
        }
      })
      .catch(() => setError("Could not load organization"))
      .finally(() => setLoading(false))
  }, [router, section])

  const copy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 1500)
    } catch {}
  }

  const submit = async (e) => {
    e.preventDefault()
    setError("")

    if (!form.tid.trim() || form.tid.trim().length < 4) {
      setError("Please enter a valid Transaction ID (TID)")
      return
    }
    const amount = Number(form.amount)
    if (!amount || amount <= 0) {
      setError("Please enter a valid amount")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section,
          amount,
          tid: form.tid.trim(),
          note: form.note.trim(),
          senderName: form.senderName.trim(),
          senderPhone: form.senderPhone.trim(),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(true)
      } else {
        setError(data.error || "Submission failed")
      }
    } catch {
      setError("Submission failed. Please try again.")
    }
    setSubmitting(false)
  }

  if (!section) {
    return (
      <div className="p-8 text-center text-slate-500">
        Invalid section.
        <Link href="/dashboard/no-section" className="text-blue-600 ml-2 underline">
          Go back
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-400">
        <Loader2 className="animate-spin mr-2" /> Loading…
      </div>
    )
  }

  if (!org) {
    return (
      <div className="p-8 text-center text-red-600">
        {error || "Could not load organization."}
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-emerald-200 dark:border-emerald-800 overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 text-center text-white">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur mx-auto flex items-center justify-center mb-4">
              <CheckCircle2 size={36} />
            </div>
            <h1 className="text-2xl font-bold">Payment Submitted</h1>
            <p className="text-sm text-emerald-100 mt-2">
              Admin will verify and activate your section shortly.
            </p>
          </div>
          <div className="p-6 space-y-3">
            <InfoRow label="Transaction ID" value={form.tid} />
            <InfoRow label="Amount" value={`Rs. ${Number(form.amount).toLocaleString()}`} />
            <InfoRow label="Section" value={section === "school" ? "School" : "Academy"} />
            <Link
              href="/dashboard/no-section"
              className="block text-center mt-4 text-sm text-blue-600 hover:underline"
            >
              Back to renewals
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const price = Number(org.currentSection?.price) || 0
  const priceNote = org.currentSection?.priceNote || ""
  const label = section === "school" ? "School" : "Academy"
  const Icon = section === "school" ? School : Library
  const accent = section === "school" ? "blue" : "purple"

  const accentMap = {
    blue: {
      bgSoft: "bg-blue-50 dark:bg-blue-900/20",
      text: "text-blue-700 dark:text-blue-300",
      btn: "bg-blue-600 hover:bg-blue-700",
      ring: "ring-blue-200 dark:ring-blue-800",
    },
    purple: {
      bgSoft: "bg-purple-50 dark:bg-purple-900/20",
      text: "text-purple-700 dark:text-purple-300",
      btn: "bg-purple-600 hover:bg-purple-700",
      ring: "ring-purple-200 dark:ring-purple-800",
    },
  }
  const a = accentMap[accent]

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Back link */}
      <Link
        href="/dashboard/no-section"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-4"
      >
        <ArrowLeft size={14} /> Back
      </Link>

      {/* Header */}
      <div className={`rounded-2xl ${a.bgSoft} border border-slate-200 dark:border-slate-700 p-5 md:p-6 mb-6 flex items-center gap-4`}>
        <div className={`w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center ${a.text} shadow-sm`}>
          <Icon size={26} />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100">
            Renew {label} Section
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {org.schoolName}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Payment info + QR */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Amount to send
            </p>
            <p className={`text-3xl font-extrabold ${a.text}`}>
              {price > 0 ? `Rs. ${price.toLocaleString()}` : "Contact Admin"}
            </p>
            {priceNote && (
              <p className="text-xs text-slate-400 italic mt-1">{priceNote}</p>
            )}
          </div>

          <div className="h-px bg-slate-200 dark:bg-slate-700 my-4" />

          {/* EasyPaisa */}
          <PayChannel
            channel={PAYMENT_INFO.easypaisa}
            amount={price}
            accentText={a.text}
            onCopy={copy}
            copiedKey={copiedKey}
            channelKey="easypaisa"
          />

          <div className="h-px bg-slate-200 dark:bg-slate-700 my-4" />

          {/* JazzCash */}
          <PayChannel
            channel={PAYMENT_INFO.jazzcash}
            amount={price}
            accentText={a.text}
            onCopy={copy}
            copiedKey={copiedKey}
            channelKey="jazzcash"
          />

          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              After sending money, copy the <b>Transaction ID (TID)</b> from your
              EasyPaisa/JazzCash SMS and fill the form on the right.
            </p>
          </div>
        </div>

        {/* Right: Form */}
        <form
          onSubmit={submit}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm"
        >
          <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-4">
            Submit payment proof
          </h2>

          {error && (
            <div className="mb-4 flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg p-3 text-xs">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Field
            label="Transaction ID (TID)"
            icon={Hash}
            required
            value={form.tid}
            onChange={(v) => setForm({ ...form, tid: v })}
            placeholder="e.g. 1234567890"
          />

          <Field
            label="Amount Paid (Rs.)"
            icon={Wallet}
            required
            type="number"
            value={form.amount}
            onChange={(v) => setForm({ ...form, amount: v })}
            placeholder={price > 0 ? String(price) : "0"}
          />

          <Field
            label="Sender Name"
            icon={User}
            value={form.senderName}
            onChange={(v) => setForm({ ...form, senderName: v })}
            placeholder="Your name"
          />

          <Field
            label="Sender Phone"
            icon={Phone}
            value={form.senderPhone}
            onChange={(v) => setForm({ ...form, senderPhone: v })}
            placeholder="03xx-xxxxxxx"
          />

          <div className="mb-5">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
              Note (optional)
            </label>
            <textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 outline-none focus:border-blue-500 text-sm resize-none"
              placeholder="Any notes for admin"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={`w-full ${a.btn} text-white font-bold text-sm py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 transition shadow-md`}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Submitting…
              </>
            ) : (
              <>
                <CheckCircle2 size={16} /> Submit payment
              </>
            )}
          </button>

          <p className="text-[11px] text-slate-400 mt-3 text-center">
            Your submission will be reviewed manually by admin.
          </p>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────
function Field({ label, icon: Icon, value, onChange, placeholder, required, type = "text" }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full ${Icon ? "pl-9" : "pl-3"} pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 outline-none focus:border-blue-500 text-sm`}
        />
      </div>
    </div>
  )
}

function PayChannel({ channel, amount, accentText, onCopy, copiedKey, channelKey }) {
  return (
    <div className="flex items-start gap-4">
      <div className="shrink-0 rounded-xl p-2 bg-white border border-slate-200 dark:border-slate-700">
        <QRCodeSVG
          value={`${channel.label}:${channel.number}:${channel.name}${amount > 0 ? `:Rs.${amount}` : ""}`}
          size={110}
          level="M"
          includeMargin={false}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          {channel.label}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100 tracking-wide">
            {channel.number}
          </p>
          <button
            type="button"
            onClick={() => onCopy(channel.number, `${channelKey}-num`)}
            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 flex items-center justify-center transition"
            title="Copy number"
          >
            {copiedKey === `${channelKey}-num` ? (
              <Check size={13} className="text-emerald-600" />
            ) : (
              <Copy size={13} />
            )}
          </button>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
          {channel.name}
        </p>
        {amount > 0 && (
          <p className={`text-xs ${accentText} font-semibold mt-1`}>
            Send Rs. {amount.toLocaleString()}
          </p>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm py-2 border-b border-slate-100 dark:border-slate-700 last:border-none">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-semibold text-slate-800 dark:text-slate-100 truncate ml-2">
        {value}
      </span>
    </div>
  )
}