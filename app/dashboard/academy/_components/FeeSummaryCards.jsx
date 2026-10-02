"use client"

import React from "react"
import { Wallet, CheckCircle2, XCircle, TrendingUp } from "lucide-react"

export default function FeeSummaryCards({ students, fees, monthLabel }) {
  // Compute per student: fee expected, paid, pending
  const perStudent = students.map((s) => {
    const sid = String(s.id)
    const studentPayments = fees.filter((f) => String(f.studentId) === sid)
    const paid = studentPayments.reduce((sum, f) => sum + Number(f.amount || 0), 0)
    const expected = Number(s.fee || s.monthlyFee || 0)
    const pending = Math.max(0, expected - paid)
    return { paid, expected, pending, status: paid === 0 ? "Unpaid" : pending === 0 ? "Paid" : "Partial" }
  })

  const totalStudents = perStudent.length
  const paidCount = perStudent.filter((p) => p.status === "Paid").length
  const unpaidCount = perStudent.filter((p) => p.status === "Unpaid").length
  const partialCount = perStudent.filter((p) => p.status === "Partial").length
  const expectedTotal = perStudent.reduce((sum, p) => sum + p.expected, 0)
  const collectedTotal = perStudent.reduce((sum, p) => sum + p.paid, 0)
  const pendingTotal = perStudent.reduce((sum, p) => sum + p.pending, 0)
  const collectedPct = expectedTotal > 0 ? Math.round((collectedTotal / expectedTotal) * 100) : 0

  return (
    <div className="my-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Fee Collection</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Paid */}
        <div className="group relative overflow-hidden rounded-2xl p-5 shadow-md hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10 group-hover:scale-125 transition-transform duration-500" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 size={18} />
              <span className="text-xs font-semibold uppercase tracking-wide opacity-90">Paid</span>
            </div>
            <p className="text-4xl font-bold">{paidCount}</p>
            <p className="text-xs opacity-80 mt-1">
              {totalStudents > 0 ? Math.round((paidCount / totalStudents) * 100) : 0}% of students
            </p>
          </div>
        </div>

        {/* Partial */}
        <div className="group relative overflow-hidden rounded-2xl p-5 shadow-md hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10 group-hover:scale-125 transition-transform duration-500" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={18} />
              <span className="text-xs font-semibold uppercase tracking-wide opacity-90">Partial</span>
            </div>
            <p className="text-4xl font-bold">{partialCount}</p>
            <p className="text-xs opacity-80 mt-1">Incomplete payments</p>
          </div>
        </div>

        {/* Unpaid */}
        <div className="group relative overflow-hidden rounded-2xl p-5 shadow-md hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-red-500 to-rose-600 text-white">
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10 group-hover:scale-125 transition-transform duration-500" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <XCircle size={18} />
              <span className="text-xs font-semibold uppercase tracking-wide opacity-90">Unpaid</span>
            </div>
            <p className="text-4xl font-bold">{unpaidCount}</p>
            <p className="text-xs opacity-80 mt-1">Not paid yet</p>
          </div>
        </div>

        {/* Collected Amount */}
        <div className="group relative overflow-hidden rounded-2xl p-5 shadow-md hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10 group-hover:scale-125 transition-transform duration-500" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Wallet size={18} />
              <span className="text-xs font-semibold uppercase tracking-wide opacity-90">Collected</span>
            </div>
            <p className="text-3xl font-bold">Rs. {collectedTotal.toLocaleString()}</p>
            <p className="text-xs opacity-80 mt-1">
              of Rs. {expectedTotal.toLocaleString()} ({collectedPct}%)
            </p>
          </div>
        </div>
      </div>

      {monthLabel && (
        <p className="text-xs text-slate-500 mt-3 text-center">
          {monthLabel} — Rs. {pendingTotal.toLocaleString()} still pending
        </p>
      )}
    </div>
  )
}