"use client"
import React, { useState } from 'react'
import { X, LoaderIcon } from 'lucide-react'
import GlobalApi from '@/app/_services/GlobalApi'
import { toast } from 'sonner'

export default function PayDialog({ row, month, grade, section, session, onClose, onSaved }) {
  const [amount, setAmount] = useState(String(row.pending || row.fee || ""))
  const today = new Date()
  const [d, setD] = useState(today.getDate())
  const [m, setM] = useState(today.getMonth() + 1)
  const [y, setY] = useState(today.getFullYear())
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error("Enter a valid amount")
      return
    }
    setSaving(true)
    try {
      const paidDate = `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`
      await GlobalApi.SaveFeePayment({
        studentId: row.student.id,
        grade, section, session, month,
        amount: Number(amount),
        paidDate,
        note,
      })
      toast.success("Payment recorded")
      onSaved()
    } catch (err) {
      console.error(err)
      toast.error("Failed to save")
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Record Payment</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>

        <p className="text-sm text-slate-600 mb-4">
          <span className="font-semibold">{row.student.name}</span> — {month}
          <br />
          Fee: <b>Rs. {row.fee}</b> · Paid: <b>Rs. {row.paid}</b> · Pending: <b className="text-red-600">Rs. {row.pending}</b>
        </p>

        <label className="block text-sm font-semibold text-slate-700 mb-1">Amount (Rs.)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 mb-4 outline-none focus:border-blue-500"
        />

        <label className="block text-sm font-semibold text-slate-700 mb-1">Payment Date</label>
        <div className="flex gap-2 mb-4">
          <input type="number" min="1" max="31" value={d} onChange={(e) => setD(e.target.value)}
            className="w-16 px-2 py-2 rounded-lg border border-gray-300 text-center outline-none" placeholder="DD" />
          <span className="self-center text-slate-500">/</span>
          <input type="number" min="1" max="12" value={m} onChange={(e) => setM(e.target.value)}
            className="w-16 px-2 py-2 rounded-lg border border-gray-300 text-center outline-none" placeholder="MM" />
          <span className="self-center text-slate-500">/</span>
          <input type="number" value={y} onChange={(e) => setY(e.target.value)}
            className="w-24 px-2 py-2 rounded-lg border border-gray-300 text-center outline-none" placeholder="YYYY" />
        </div>

        <label className="block text-sm font-semibold text-slate-700 mb-1">Note (optional)</label>
        <input value={note} onChange={(e) => setNote(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 mb-4 outline-none focus:border-blue-500" />

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-sm">Cancel</button>
          <button onClick={save} disabled={saving}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50">
            {saving ? <LoaderIcon className="animate-spin w-4 h-4" /> : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}