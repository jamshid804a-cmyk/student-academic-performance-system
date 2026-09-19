"use client"
export const dynamic = 'force-dynamic'

import React, { useEffect, useState, useMemo, useRef } from 'react'
import { LoaderIcon, Wallet, Send, Printer, Trash2 } from 'lucide-react'
import GlobalApi from '@/app/_services/GlobalApi'
import { toast } from 'sonner'
import PayDialog from './_components/PayDialog'
import HistoryDialog from './_components/HistoryDialog'

const GRADES = ["1st","2nd","3rd","4th","5th","6th","7th","8th","9th","10th"]
const SECTIONS = ["A", "B", "C"]
const SESSIONS = Array.from({ length: 100 }, (_, i) => `${2025 + i}-${2026 + i}`)
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
]

const STORAGE_KEY = "fee_filters_v1"

const monthNameToKey = (name) => {
  const map = {
    January: "01", February: "02", March: "03", April: "04",
    May: "05", June: "06", July: "07", August: "08",
    September: "09", October: "10", November: "11", December: "12",
  }
  return `${map[name]}/${new Date().getFullYear()}`
}

const MONTH_KEYS = ["01","02","03","04","05","06","07","08","09","10","11","12"]

export default function FeeManagementPage() {
  const [grade, setGrade] = useState("")
  const [section, setSection] = useState("")
  const [session, setSession] = useState("")
  const [month, setMonth] = useState("")

  const [students, setStudents] = useState([])
  const [payments, setPayments] = useState([])          // payments for the SELECTED month
  const [allPayments, setAllPayments] = useState([])    // payments for ALL months in that session
  const [loading, setLoading] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const debounceRef = useRef(null)

  const [payDialog, setPayDialog] = useState(null)
  const [historyDialog, setHistoryDialog] = useState(null)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
      if (saved.grade) setGrade(saved.grade)
      if (saved.section) setSection(saved.section)
      if (saved.session) setSession(saved.session)
      if (saved.month) setMonth(saved.month)
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ grade, section, session, month }))
  }, [grade, section, session, month, hydrated])

  const fetchAll = async () => {
    if (!grade || !month) {
      setStudents([]); setPayments([]); setAllPayments([]); return
    }
    setLoading(true)
    try {
      const monthKey = monthNameToKey(month)
      const params = { grade }
      if (section) params.section = section
      if (session) params.session = session

      const [studentResp, monthFeeResp, allFeeResp] = await Promise.all([
        GlobalApi.GetAllStudents(params),
        GlobalApi.GetFees({ grade, section, session, month: monthKey }),
        GlobalApi.GetFees({ grade, section, session }),   // all months
      ])
      setStudents(studentResp.data || [])
      setPayments(monthFeeResp.data || [])
      setAllPayments(allFeeResp.data || [])
    } catch (err) {
      console.error(err)
      toast.error("Failed to load")
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!hydrated) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(fetchAll, 250)
    return () => debounceRef.current && clearTimeout(debounceRef.current)
    // eslint-disable-next-line
  }, [grade, section, session, month, hydrated])

  const monthKey = month ? monthNameToKey(month) : ""

  const paymentsByStudent = useMemo(() => {
    const map = {}
    payments.forEach((p) => {
      const sid = String(p.studentId)
      if (!map[sid]) map[sid] = []
      map[sid].push(p)
    })
    return map
  }, [payments])

  const allPaymentsByStudent = useMemo(() => {
    const map = {}
    allPayments.forEach((p) => {
      const sid = String(p.studentId)
      if (!map[sid]) map[sid] = []
      map[sid].push(p)
    })
    return map
  }, [allPayments])

  const rows = useMemo(() => {
    return students.map((s) => {
      const sid = String(s.id)
      const list = paymentsByStudent[sid] || []
      const paid = list.reduce((sum, p) => sum + Number(p.amount || 0), 0)
      const fee = Number(s.fee || 0)
      const pending = Math.max(0, fee - paid)
      const status = paid === 0 ? "Unpaid" : pending === 0 ? "Paid" : "Partial"

      // Count months paid (out of 12)
      const all = allPaymentsByStudent[sid] || []
      const monthsPaid = new Set()
      all.forEach((p) => {
        const monthNum = String(p.month || "").split("/")[0]
        if (MONTH_KEYS.includes(monthNum)) monthsPaid.add(Number(monthNum))
      })

      return {
        student: s,
        fee, paid, pending, status,
        paymentList: list,
        monthsPaid: monthsPaid.size,
        monthsTotal: 12,
      }
    })
  }, [students, paymentsByStudent, allPaymentsByStudent])

  const summary = useMemo(() => {
    const totalStudents = rows.length
    const paidCount = rows.filter((r) => r.status === "Paid").length
    const partialCount = rows.filter((r) => r.status === "Partial").length
    const unpaidCount = rows.filter((r) => r.status === "Unpaid").length
    const expected = rows.reduce((sum, r) => sum + r.fee, 0)
    const collected = rows.reduce((sum, r) => sum + r.paid, 0)
    const pending = rows.reduce((sum, r) => sum + r.pending, 0)
    return { totalStudents, paidCount, partialCount, unpaidCount, expected, collected, pending }
  }, [rows])

  const handleSendAll = async () => {
    const toRemind = rows.filter((r) => r.status !== "Paid").map((r) => r.student.id)
    if (toRemind.length === 0) {
      toast.info("All students have paid.")
      return
    }
    try {
      await GlobalApi.SendFeeReminder({ studentIds: toRemind, month: monthKey, grade })
      toast.success(`Reminders sent to ${toRemind.length} parents`)
    } catch (err) {
      console.error(err)
      toast.error("Failed to send")
    }
  }

  const handleSendOne = async (row) => {
    try {
      await GlobalApi.SendFeeReminder({
        studentIds: [row.student.id],
        month: monthKey,
        grade,
      })
      toast.success(`Reminder sent to ${row.student.name}'s parent`)
    } catch (err) {
      console.error(err)
      toast.error("Failed to send")
    }
  }

  // ✅ Delete ONLY this month's fee records for the student
  const handleDeleteAll = async (row) => {
    if (!confirm(`Delete the ${month} fee records for "${row.student.name}"? This cannot be undone.`)) return
    try {
      await GlobalApi.DeleteStudentFees(row.student.id, session, monthKey)
      toast.success(`Fee records for ${month} deleted for ${row.student.name}`)
      fetchAll()
    } catch (err) {
      console.error(err)
      toast.error("Failed to delete")
    }
  }

  const handlePrintClass = () => {
    const w = window.open("", "_blank", "width=1000,height=800")
    if (!w) return
    const body = rows.map((r) => `
      <tr>
        <td>${r.student.rollNo ?? ""}</td>
        <td style="text-align:left">${r.student.name}</td>
        <td>Rs. ${r.fee}</td>
        <td>Rs. ${r.paid}</td>
        <td>Rs. ${r.pending}</td>
        <td>${r.monthsPaid}/${r.monthsTotal}</td>
        <td>${r.status}</td>
      </tr>
    `).join("")

    w.document.write(`
      <html><head><title>Fee Report</title>
      <style>
        body { font-family: Arial; padding: 20px; }
        h2 { text-align:center; margin:0 0 4px; }
        p.sub { text-align:center; color:#555; margin:0 0 14px; }
        table { border-collapse:collapse; width:100%; font-size:13px; }
        th, td { border:1px solid #ccc; padding:6px 8px; text-align:center; }
        th { background:#f3f4f6; }
      </style></head><body>
        <h2>Fee Report — ${month}</h2>
        <p class="sub">Grade ${grade} • Section ${section || "All"} • Session ${session || "All"}</p>
        <p class="sub">Expected: Rs. ${summary.expected} · Collected: Rs. ${summary.collected} · Pending: Rs. ${summary.pending}</p>
        <table>
          <thead><tr>
            <th>Roll No</th><th style="text-align:left">Name</th>
            <th>Fee</th><th>Paid</th><th>Pending</th><th>Months Paid</th><th>Status</th>
          </tr></thead>
          <tbody>${body}</tbody>
        </table>
        <script>window.onload = () => window.print();</script>
      </body></html>
    `)
    w.document.close()
  }

  return (
    <div className="p-7">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md">
            <Wallet size={22} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Fee Management</h2>
            <p className="text-sm text-slate-500">Track monthly fee collection</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrintClass}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold inline-flex items-center gap-1">
            <Printer size={14} /> Print
          </button>
          <button onClick={handleSendAll}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-1">
            <Send size={14} /> Send All Reminders
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-2xl shadow-sm p-5 mb-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Filters</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <select className="fi" value={grade} onChange={(e) => setGrade(e.target.value)}>
            <option value="">Grade</option>
            {GRADES.map(g => <option key={g}>{g}</option>)}
          </select>
          <select className="fi" value={section} onChange={(e) => setSection(e.target.value)}>
            <option value="">Section</option>
            {SECTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="fi" value={session} onChange={(e) => setSession(e.target.value)}>
            <option value="">Session</option>
            {SESSIONS.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="fi" value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">Month</option>
            {MONTHS.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10 text-slate-400">
          <LoaderIcon className="animate-spin mr-2" /> Loading...
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white border rounded-2xl p-10 text-center text-slate-400">
          Select Grade and Month to load students.
        </div>
      ) : (
        <>
          <div className="bg-white border rounded-2xl shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-3 text-left font-semibold text-slate-700">Roll No</th>
                  <th className="p-3 text-left font-semibold text-slate-700">Name</th>
                  <th className="p-3 text-right font-semibold text-slate-700">Fee</th>
                  <th className="p-3 text-right font-semibold text-slate-700">Paid</th>
                  <th className="p-3 text-right font-semibold text-slate-700">Pending</th>
                  <th className="p-3 text-center font-semibold text-slate-700">Months Paid</th>
                  <th className="p-3 text-center font-semibold text-slate-700">Status</th>
                  <th className="p-3 text-center font-semibold text-slate-700">Action</th>
                  <th className="p-3 text-center font-semibold text-slate-700">Delete</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.student.id} className="border-b hover:bg-slate-50">
                    <td className="p-3">{r.student.rollNo ?? "—"}</td>
                    <td className="p-3 font-medium">{r.student.name}</td>
                    <td className="p-3 text-right">Rs. {r.fee}</td>
                    <td className="p-3 text-right text-emerald-600 font-semibold">Rs. {r.paid}</td>
                    <td className="p-3 text-right text-red-600 font-semibold">Rs. {r.pending}</td>
                    <td className="p-3 text-center font-semibold text-blue-600">
                      {r.monthsPaid}/{r.monthsTotal}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold
                        ${r.status === "Paid" ? "bg-emerald-100 text-emerald-700"
                          : r.status === "Partial" ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setPayDialog(r)}
                          className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold">
                          Pay
                        </button>
                        <button
                          onClick={() => setHistoryDialog(r)}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold">
                          History
                        </button>
                        <button
                          onClick={() => handleSendOne(r)}
                          disabled={r.status === "Paid"}
                          className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold disabled:opacity-40">
                          Remind
                        </button>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleDeleteAll(r)}
                        title={`Delete ${month} fee records for this student`}
                        className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-white border rounded-2xl p-4">
              <p className="text-xs text-slate-500">Total Students</p>
              <p className="text-2xl font-bold text-slate-800">{summary.totalStudents}</p>
            </div>
            <div className="bg-white border rounded-2xl p-4">
              <p className="text-xs text-slate-500">Paid / Partial / Unpaid</p>
              <p className="text-2xl font-bold text-slate-800">
                {summary.paidCount} / {summary.partialCount} / {summary.unpaidCount}
              </p>
            </div>
            <div className="bg-white border rounded-2xl p-4">
              <p className="text-xs text-slate-500">Collected</p>
              <p className="text-2xl font-bold text-emerald-600">Rs. {summary.collected}</p>
            </div>
            <div className="bg-white border rounded-2xl p-4">
              <p className="text-xs text-slate-500">Pending</p>
              <p className="text-2xl font-bold text-red-600">Rs. {summary.pending}</p>
            </div>
          </div>
        </>
      )}

      {payDialog && (
        <PayDialog
          row={payDialog}
          month={monthKey}
          grade={grade}
          section={section}
          session={session}
          onClose={() => setPayDialog(null)}
          onSaved={() => { setPayDialog(null); fetchAll() }}
        />
      )}
      {historyDialog && (
        <HistoryDialog
          row={historyDialog}
          month={monthKey}
          onClose={() => setHistoryDialog(null)}
        />
      )}

      <style jsx>{`
        .fi { padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 8px; background: white; font-size: 14px; outline: none; }
        .fi:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.1); }
      `}</style>
    </div>
  )
}