"use client"

import React, { useEffect, useState, useMemo, useCallback } from "react"
import { Loader2, ClipboardCheck, Calendar, Users } from "lucide-react"
import { toast } from "sonner"
import AttendanceCell from "@/app/dashboard/attendance/_components/AttendanceCell"

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
]

const monthNameToKey = (name) => {
  const map = {
    January: "01", February: "02", March: "03", April: "04",
    May: "05", June: "06", July: "07", August: "08",
    September: "09", October: "10", November: "11", December: "12",
  }
  return `${map[name]}/${new Date().getFullYear()}`
}

const monthNameToNumber = (name) => {
  const map = {
    January: "01", February: "02", March: "03", April: "04",
    May: "05", June: "06", July: "07", August: "08",
    September: "09", October: "10", November: "11", December: "12",
  }
  return map[name] || "01"
}

const getDaysInMonth = (monthName) => {
  const m = Number(monthNameToNumber(monthName))
  return new Date(new Date().getFullYear(), m, 0).getDate()
}

export default function TeacherAcademyAttendanceModule({ teacher, allowedClasses = [], token }) {
  const orgEmail = teacher?.email
  // We need the org email to call academy APIs. It's not in the public teacher payload.
  // We'll pass through a separate lookup: use publicToken-derived org by hitting academy APIs with teacher's schoolId.
  // BUT academy APIs require `email` of the org owner. Public teacher has schoolId, not email.
  // → Use the public token flow: we call a public attendance endpoint that resolves schoolId from the teacher token.

  const [course, setCourse] = useState("")
  const [section, setSection] = useState("")
  const [batchNo, setBatchNo] = useState("")
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()])
  const [loading, setLoading] = useState(false)
  const [students, setStudents] = useState([])
  const [attendance, setAttendance] = useState({})
  const daysInMonth = useMemo(() => month ? getDaysInMonth(month) : 31, [month])

  // Build unique course+section+batch combos from allowedClasses
  const classCombos = useMemo(() => {
    return (allowedClasses || [])
      .filter((c) => c && (c.course || c.grade))
      .map((c, i) => ({
        id: i,
        course: c.course || c.grade,
        section: c.section || "",
        batchNo: c.batchNo || "",
      }))
  }, [allowedClasses])

  // Auto-select first combo
  useEffect(() => {
    if (classCombos.length > 0 && !course) {
      const first = classCombos[0]
      setCourse(first.course)
      setSection(first.section)
      setBatchNo(first.batchNo)
    }
    // eslint-disable-next-line
  }, [classCombos])

  // Fetch students for selected combo — via public token, not email
  const fetchAll = useCallback(async () => {
    if (!token || !course || !month) {
      setStudents([]); setAttendance({}); return
    }
    setLoading(true)
    try {
      const monthKey = monthNameToKey(month)
      const params = new URLSearchParams({ token, course, month: monthKey })
      if (section) params.append('section', section)
      if (batchNo) params.append('batchNo', batchNo)

      const res = await fetch(`/api/teacher-public/academy-attendance?${params.toString()}`, { cache: 'no-store' })
      const data = await res.json()

      const list = Array.isArray(data?.students) ? data.students : []
      setStudents(list)

      const map = {}
      ;(Array.isArray(data?.attendance) ? data.attendance : []).forEach((r) => {
        const sid = String(r.studentId)
        if (!map[sid]) map[sid] = {}
        map[sid][Number(r.day)] = r.status
      })
      setAttendance(map)
    } catch (err) {
      console.error(err)
      toast.error("Failed to load attendance")
    }
    setLoading(false)
  }, [token, course, section, batchNo, month])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleCellChange = async (studentId, day, status) => {
    const sid = String(studentId)
    setAttendance((prev) => {
      const copy = { ...prev, [sid]: { ...(prev[sid] || {}) } }
      if (status === null) delete copy[sid][day]
      else copy[sid][day] = status
      return copy
    })

    const monthKey = monthNameToKey(month)
    try {
      if (status === null) {
        const params = new URLSearchParams({ token, studentId: sid, day, date: monthKey })
        await fetch(`/api/teacher-public/academy-attendance?${params.toString()}`, { method: 'DELETE' })
      } else {
        await fetch('/api/teacher-public/academy-attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token, studentId: sid, day, date: monthKey, status,
          }),
        })
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to save")
    }
  }

  const cycleStatus = (studentId, day) => {
    const current = attendance[String(studentId)]?.[day] || null
    const order = [null, "P", "A", "L"]
    const idx = order.indexOf(current)
    const next = order[(idx + 1) % order.length]
    handleCellChange(studentId, day, next)
  }

  const statusChar = (s) => (s === "P" ? "P" : s === "A" ? "A" : s === "L" ? "L" : "·")
  const statusColor = (s) => {
    if (s === "P") return "bg-emerald-500 text-white"
    if (s === "A") return "bg-red-500 text-white"
    if (s === "L") return "bg-amber-500 text-white"
    return "bg-slate-100 text-slate-400"
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pb-10">
      {/* Filters */}
      <div className="bg-white border rounded-2xl shadow-sm p-4 mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">Course</label>
          <select className="border rounded-lg px-3 py-2 bg-white text-sm outline-none focus:border-purple-500"
            value={`${course}__${section}__${batchNo}`}
            onChange={(e) => {
              const [c, s, b] = e.target.value.split("__")
              setCourse(c); setSection(s); setBatchNo(b)
            }}>
            <option value="">Select Course</option>
            {classCombos.map((c, i) => (
              <option key={i} value={`${c.course}__${c.section}__${c.batchNo}`}>
                {c.course}{c.section ? ` - ${c.section}` : ""}{c.batchNo ? ` · ${c.batchNo}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">Month</label>
          <select className="border rounded-lg px-3 py-2 bg-white text-sm outline-none focus:border-purple-500"
            value={month} onChange={(e) => setMonth(e.target.value)}>
            {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <button onClick={fetchAll}
          className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold">
          Refresh
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white border rounded-2xl p-12 text-center text-slate-400">
          <Users size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-base font-medium">No students found</p>
          <p className="text-sm mt-1">Select a course and month</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg border overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="px-3 py-3 font-bold text-slate-600 uppercase text-[11px] text-left sticky left-0 bg-slate-50 z-10">
                    Student
                  </th>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                    <th key={d} className="px-1 py-3 font-bold text-slate-600 uppercase text-[11px] text-center w-9">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b hover:bg-purple-50/30">
                    <td className="px-3 py-2 sticky left-0 bg-white z-10">
                      <div className="flex items-center gap-2 min-w-[180px]">
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">
                          {String(s.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 text-xs truncate">{s.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {s.rollNo ? `Roll ${s.rollNo}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                      const st = attendance[String(s.id)]?.[d]
                      return (
                        <td key={d} className="p-1 text-center">
                          <button
                            onClick={() => cycleStatus(s.id, d)}
                            className={`w-8 h-8 rounded-md text-xs font-bold transition-all hover:scale-110 ${statusColor(st)}`}
                            title={`Day ${d}${st ? " · " + statusChar(st) : ""}`}
                          >
                            {statusChar(st)}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-slate-50 border-t text-xs text-slate-500">
            Click any cell to cycle: <b>· → P → A → L → ·</b>. Changes save automatically.
          </div>
        </div>
      )}
    </div>
  )
}