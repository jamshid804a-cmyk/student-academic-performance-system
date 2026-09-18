"use client"
import React from 'react'
import { X, Printer } from 'lucide-react'

export default function HistoryDialog({ row, month, onClose }) {
  const list = row.paymentList || []
  const totalPaid = list.reduce((sum, p) => sum + Number(p.amount || 0), 0)

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=600,height=700")
    if (!w) return
    w.document.write(`
      <html><head><title>Fee Receipt</title>
      <style>
        body { font-family: Arial; padding: 30px; }
        h2 { text-align:center; margin: 0 0 4px; }
        p.sub { text-align:center; color:#555; margin:0 0 20px; font-size:12px; }
        table { border-collapse:collapse; width:100%; font-size:13px; }
        th, td { border:1px solid #ccc; padding:6px 10px; text-align:left; }
        th { background:#f3f4f6; }
        .tot { margin-top:14px; font-size:14px; }
      </style></head><body>
        <h2>Fee Receipt</h2>
        <p class="sub">Student Academic Performance System</p>
        <p><b>Student:</b> ${row.student.name} (Roll ${row.student.rollNo ?? "—"})</p>
        <p><b>Month:</b> ${month}</p>
        <p><b>Total Fee:</b> Rs. ${row.fee}</p>
        <table>
          <thead><tr><th>Date</th><th>Amount</th><th>Note</th></tr></thead>
          <tbody>
            ${list.map(p => `<tr><td>${p.paidDate}</td><td>Rs. ${p.amount}</td><td>${p.note || ""}</td></tr>`).join("")}
          </tbody>
        </table>
        <p class="tot"><b>Total Paid:</b> Rs. ${totalPaid} / Rs. ${row.fee}</p>
        <p class="tot"><b>Pending:</b> Rs. ${row.pending}</p>
        <script>window.onload = () => window.print();</script>
      </body></html>
    `)
    w.document.close()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Payment History</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>

        <p className="text-sm text-slate-600 mb-3">
          <b>{row.student.name}</b> — {month} · Fee Rs. {row.fee}
        </p>

        <table className="w-full text-sm mb-4">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-right">Amount</th>
              <th className="p-2 text-left">Note</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan="3" className="p-4 text-center text-slate-400">No payments yet</td></tr>
            ) : list.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="p-2">{p.paidDate}</td>
                <td className="p-2 text-right font-semibold text-emerald-600">Rs. {p.amount}</td>
                <td className="p-2 text-slate-500">{p.note || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="text-sm text-slate-600 mb-4">
          <p>Total Paid: <b className="text-emerald-600">Rs. {totalPaid}</b></p>
          <p>Pending: <b className="text-red-600">Rs. {row.pending}</b></p>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-sm">Close</button>
          <button onClick={handlePrint} disabled={list.length === 0}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-1 disabled:opacity-40">
            <Printer size={14} /> Print Receipt
          </button>
        </div>
      </div>
    </div>
  )
}