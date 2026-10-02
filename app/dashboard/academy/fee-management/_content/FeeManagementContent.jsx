"use client"

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs'
import { LoaderIcon, Wallet, Send, Printer, Trash2, BellRing } from 'lucide-react'
import { toast } from 'sonner'
import { printAcademyFeeSlip } from '@/utils/academyPrintSlip'

const PayDialog = dynamic(() => import('../_components/PayDialog'), { ssr: false })
const HistoryDialog = dynamic(() => import('../_components/HistoryDialog'), { ssr: false })

const SECTIONS = ["A", "B", "C"]
const BATCHES = Array.from({ length: 20 }, (_, i) => `Batch ${i + 1}`)
const START_YEAR = 2025
const END_YEAR = new Date().getFullYear() + 30
const YEARS = []
for (let y = START_YEAR; y <= END_YEAR; y++) YEARS.push(String(y))

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
]

const STORAGE_KEY = "academy_fee_filters_v2"

const monthNameToKey = (name) => {
  const map = {
    January: "01", February: "02", March: "03", April: "04",
    May: "05", June: "06", July: "07", August: "08",
    September: "09", October: "10", November: "11", December: "12",
  }
  return `${map[name]}/${new Date().getFullYear()}`
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"]

const FILTER_CLASS = "px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-slate-800 outline-none focus:border-purple-500 transition"

function monthNumToKey(monthNum, year) {
  return `${String(monthNum).padStart(2, "0")}/${year}`
}

function monthKeyToNum(monthKey) {
  const parts = String(monthKey).split("/")
  return Number(parts[0])
}

export default function FeeManagementContent() {
  const { user, isLoading } = useKindeBrowserClient() || {}
  const orgEmail = user?.email

  const [course, setCourse] = useState("")
  const [section, setSection] = useState("")
  const [batchNo, setBatchNo] = useState("")
  const [year, setYear] = useState("")
  const [month, setMonth] = useState("")

  const [courses, setCourses] = useState([])
  const [students, setStudents] = useState([])
  const [payments, setPayments] = useState([])
  const [allPayments, setAllPayments] = useState([])
  const [schoolInfo, setSchoolInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const debounceRef = useRef(null)
  const reqRef = useRef(0)

  const [payDialog, setPayDialog] = useState(null)
  const [historyDialog, setHistoryDialog] = useState(null)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
      if (saved.course) setCourse(saved.course)
      if (saved.section) setSection(saved.section)
      if (saved.batchNo) setBatchNo(saved.batchNo)
      if (saved.year) setYear(saved.year)
      if (saved.month) setMonth(saved.month)
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!orgEmail) return
    fetch(`/api/academy/courses?email=${encodeURIComponent(orgEmail)}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d.success) setCourses(d.courses || []) })
      .catch(() => {})
  }, [orgEmail])

  useEffect(() => {
    fetch('/api/school', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setSchoolInfo(d?.[0] || d || null))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ course, section, batchNo, year, month }))
  }, [course, section, batchNo, year, month, hydrated])

  const fetchAll = useCallback(async () => {
    if (!orgEmail || !course || !month) {
      setStudents([]); setPayments([]); setAllPayments([]); return
    }
    const reqId = ++reqRef.current
    setLoading(true)
    try {
      const monthKey = monthNameToKey(month)

      // Students — all academy students, filtered client-side
      const studentResp = await fetch(
        `/api/academy/student?email=${encodeURIComponent(orgEmail)}`,
        { cache: 'no-store' }
      ).then(r => r.json()).then(d => d.students || [])

      let filtered = studentResp.filter(s => s.subject === course)
      if (section) filtered = filtered.filter(s => s.section === section)
      if (batchNo) filtered = filtered.filter(s => s.batchNo === batchNo)
      if (year) filtered = filtered.filter(s => String(s.year) === String(year))

      // Month fees
      const monthParams = new URLSearchParams({ orgEmail, course, month: monthKey })
      if (section) monthParams.append('section', section)
      if (batchNo) monthParams.append('batchNo', batchNo)
      if (year) monthParams.append('year', year)
      const monthFees = await fetch(
        `/api/academy/fees?${monthParams.toString()}`,
        { cache: 'no-store' }
      ).then(r => r.json())

      // All fees
      const allParams = new URLSearchParams({ orgEmail, course })
      if (section) allParams.append('section', section)
      if (batchNo) allParams.append('batchNo', batchNo)
      if (year) allParams.append('year', year)
      const allFees = await fetch(
        `/api/academy/fees?${allParams.toString()}`,
        { cache: 'no-store' }
      ).then(r => r.json())

      // Ignore stale responses
      if (reqId !== reqRef.current) return

      setStudents(filtered)
      setPayments(Array.isArray(monthFees) ? monthFees : [])
      setAllPayments(Array.isArray(allFees) ? allFees : [])
    } catch (err) {
      console.error(err)
      toast.error("Failed to load")
    } finally {
      if (reqId === reqRef.current) setLoading(false)
    }
  }, [orgEmail, course, section, batchNo, year, month])

  // Faster debounce (150ms) + cancel previous
  useEffect(() => {
    if (!hydrated) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(fetchAll, 150)
    return () => debounceRef.current && clearTimeout(debounceRef.current)
  }, [fetchAll, hydrated])

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
      const fee = Number(s.fee || s.monthlyFee || 0)
      const pending = Math.max(0, fee - paid)
      const status = paid === 0 ? "Unpaid" : pending === 0 ? "Paid" : "Partial"
      return { student: s, fee, paid, pending, status, paymentList: list }
    })
  }, [students, paymentsByStudent])

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
    if (toRemind.length === 0) { toast.info("All students have paid."); return }
    try {
      await fetch('/api/academy/fees/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgEmail, studentIds: toRemind, month: monthKey, course }),
      })
      toast.success(`Reminders sent to ${toRemind.length} parents`)
    } catch (err) { console.error(err); toast.error("Failed to send") }
  }

  const handleSendOne = async (row) => {
    try {
      await fetch('/api/academy/fees/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgEmail, studentIds: [row.student.id], month: monthKey, course }),
      })
      toast.success(`Reminder sent to ${row.student.name}'s parent`)
    } catch (err) { console.error(err); toast.error("Failed to send") }
  }

  const handleNotifyDue = async (row) => {
    if (!month) { toast.error("Please select a month first"); return }
    const message = `Dear Parent, the academy fee for ${month} is due. Please visit the academy by the 5th of ${month} to pay. Thank you.`
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: row.student.id, message,
          blockNumber: 0, weekStart: 0, weekEnd: 0, type: "fee",
        }),
      })
      if (!res.ok) throw new Error("Failed")
      toast.success(`Fee due notice sent to ${row.student.name}'s parent`)
    } catch (err) { console.error(err); toast.error("Failed to send") }
  }

  const computePreviousMonths = (row) => {
    const sid = String(row.student.id)
    const y = Number(row.student.year) || new Date().getFullYear()
    const monthlyFee = Number(row.student.fee || row.student.monthlyFee || 0)
    const currentMonthNum = month ? Number(monthNameToKey(month).split("/")[0]) : 12
    const all = allPaymentsByStudent[sid] || []
    const paidByMonth = {}
    all.forEach((p) => {
      const key = String(p.month || "")
      if (!key) return
      const num = monthKeyToNum(key)
      if (num < 1 || num > 12) return
      if (!paidByMonth[key]) paidByMonth[key] = 0
      paidByMonth[key] += Number(p.amount || 0)
    })
    const list = []
    for (let num = 1; num < currentMonthNum; num++) {
      const key = monthNumToKey(num, y)
      const paid = paidByMonth[key] || 0
      const short = Math.max(0, monthlyFee - paid)
      if (short > 0) list.push({ label: MONTH_NAMES[num - 1], monthKey: key, paid, short })
    }
    return list
  }

  const handlePrintSlip = (row) => {
    const pays = row.paymentList || []
    if (pays.length === 0) {
      toast.info(`No payment recorded for ${row.student.name} this month`)
      return
    }
    const latest = [...pays].sort((a, b) => {
      const ta = new Date(a.paidAt || a.paidDate || 0).getTime()
      const tb = new Date(b.paidAt || b.paidDate || 0).getTime()
      return tb - ta
    })[0]
    const previousMonths = computePreviousMonths(row)
    printAcademyFeeSlip({
      student: row.student,
      month,
      monthTotals: { fee: row.fee, paid: row.paid, pending: row.pending },
      previousMonths,
      latestPayment: latest,
      schoolInfo,
    })
  }

  const handleDeleteAll = async (row) => {
    if (!confirm(`Delete the ${month} fee records for "${row.student.name}"? This cannot be undone.`)) return
    try {
      const res = await fetch('/api/academy/fees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgEmail, studentId: row.student.id, month: monthKey }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Fee records for ${month} deleted`)
        fetchAll()
      } else {
        toast.error(data.error || "Failed to delete")
      }
    } catch (err) { console.error(err); toast.error("Failed to delete") }
  }

  const handlePrintClass = () => {
    const w = window.open("", "_blank", "width=1000,height=800")
    if (!w) return
    const body = rows.map((r) => `
      <tr>
        <td>${r.student.rollNo ?? ""}</td>
        <td style="text-align:left">${r.student.name}</td>
        <td>${r.student.batchNo || ""}</td>
        <td>Rs. ${r.fee}</td>
        <td>Rs. ${r.paid}</td>
        <td>Rs. ${r.pending}</td>
        <td>${r.status}</td>
      </tr>
    `).join("")

    w.document.write(`
      <html><head><title>Academy Fee Report</title>
      <style>
        body { font-family: Arial; padding: 20px; }
        h2 { text-align:center; margin:0 0 4px; }
        p.sub { text-align:center; color:#555; margin:0 0 14px; }
        table { border-collapse:collapse; width:100%; font-size:13px; }
        th, td { border:1px solid #ccc; padding:6px 8px; text-align:center; }
        th { background:#f3f4f6; }
      </style></head><body>
        <h2>Academy Fee Report — ${month}</h2>
        <p class="sub">Course ${course} • Section ${section || "All"} • Batch ${batchNo || "All"} • Year ${year || "All"}</p>
        <p class="sub">Expected: Rs. ${summary.expected} · Collected: Rs. ${summary.collected} • Pending: Rs. ${summary.pending}</p>
        <table>
          <thead><tr>
            <th>Roll No</th><th style="text-align:left">Name</th><th>Batch</th>
            <th>Fee</th><th>Paid</th><th>Pending</th><th>Status</th>
          </tr></thead>
          <tbody>${body}</tbody>
        </table>
        <script>window.onload = () => window.print();</script>
      </body></html>
    `)
    w.document.close()
  }

  // Called after PayDialog saves → small delay ensures DB write visible, then refetch
  const handleAfterPay = () => {
    setPayDialog(null)
    setTimeout(() => fetchAll(), 250)
  }

  if (isLoading || !orgEmail || !hydrated) {
    return (
      <div className="p-7 flex items-center justify-center min-h-[60vh]">
        <LoaderIcon className="animate-spin text-purple-500" size={28} />
      </div>
    )
  }

  return (
    <div className="p-7">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white flex items-center justify-center shadow-md">
            <Wallet size={22} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Academy Fee Management</h2>
            <p className="text-sm text-slate-500">Track monthly fee collection</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrintClass}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold inline-flex items-center gap-1">
            <Printer size={14} /> Print Report
          </button>
          <button onClick={handleSendAll}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold inline-flex items-center gap-1">
            <Send size={14} /> Send All Reminders
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-2xl shadow-sm p-5 mb-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Filters</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <select className={FILTER_CLASS} value={course} onChange={(e) => setCourse(e.target.value)}>
            <option value="">Course</option>
            {courses.map((c) => <option key={c._id} value={c.name}>{c.name}</option>)}
          </select>
          <select className={FILTER_CLASS} value={section} onChange={(e) => setSection(e.target.value)}>
            <option value="">Section</option>
            {SECTIONS.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className={FILTER_CLASS} value={batchNo} onChange={(e) => setBatchNo(e.target.value)}>
            <option value="">Batch</option>
            {BATCHES.map((b) => <option key={b}>{b}</option>)}
          </select>
          <select className={FILTER_CLASS} value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="">Year</option>
            {YEARS.map((y) => <option key={y}>{y}</option>)}
          </select>
          <select className={FILTER_CLASS} value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">Month</option>
            {MONTHS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10 text-slate-400">
          <LoaderIcon className="animate-spin mr-2" /> Loading...
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white border rounded-2xl p-10 text-center text-slate-400">
          Select Course and Month to load students.
        </div>
      ) : (
        <>
          <div className="bg-white border rounded-2xl shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-3 text-left font-semibold text-slate-700">Roll No</th>
                  <th className="p-3 text-left font-semibold text-slate-700">Name</th>
                  <th className="p-3 text-center font-semibold text-slate-700">Batch</th>
                  <th className="p-3 text-right font-semibold text-slate-700">Fee</th>
                  <th className="p-3 text-right font-semibold text-slate-700">Paid</th>
                  <th className="p-3 text-right font-semibold text-slate-700">Pending</th>
                  <th className="p-3 text-center font-semibold text-slate-700">Status</th>
                  <th className="p-3 text-center font-semibold text-slate-700">Action</th>
                  <th className="p-3 text-center font-semibold text-slate-700">Slip</th>
                  <th className="p-3 text-center font-semibold text-slate-700">Notify</th>
                  <th className="p-3 text-center font-semibold text-slate-700">Delete</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.student.id} className="border-b hover:bg-purple-50/40">
                    <td className="p-3">{r.student.rollNo ?? "—"}</td>
                    <td className="p-3 font-medium">{r.student.name}</td>
                    <td className="p-3 text-center text-xs font-semibold text-purple-600">
                      {r.student.batchNo || "—"}
                    </td>
                    <td className="p-3 text-right">Rs. {r.fee}</td>
                    <td className="p-3 text-right text-emerald-600 font-semibold">Rs. {r.paid}</td>
                    <td className="p-3 text-right text-red-600 font-semibold">Rs. {r.pending}</td>
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
                        <button onClick={() => setPayDialog(r)}
                          className="px-2 py-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold">Pay</button>
                        <button onClick={() => setHistoryDialog(r)}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold">History</button>
                        <button onClick={() => handleSendOne(r)}
                          className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold">Remind</button>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => handlePrintSlip(r)}
                        title={`Print receipt for ${month}`}
                        className="w-8 h-8 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
                        <Printer size={14} />
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => handleNotifyDue(r)}
                        title={`Send fee due notice for ${month}`}
                        className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                        <BellRing size={14} />
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => handleDeleteAll(r)}
                        title={`Delete ${month} fee records`}
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
          course={course}
          section={section}
          batchNo={batchNo}
          year={year}
          orgEmail={orgEmail}
          onClose={() => setPayDialog(null)}
          onSaved={handleAfterPay}
        />
      )}

      {historyDialog && (
        <HistoryDialog
          row={historyDialog}
          month={monthKey}
          onClose={() => setHistoryDialog(null)}
        />
      )}
    </div>
  )
}