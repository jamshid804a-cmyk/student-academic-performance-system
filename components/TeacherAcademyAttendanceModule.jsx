"use client"

import React, { useEffect, useState, useMemo, useCallback } from "react"
import { Loader2, Users, Send, X } from "lucide-react"
import { toast } from "sonner"

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
]
const SECTIONS = ["A", "B", "C"]
const START_YEAR = 2025
const END_YEAR = new Date().getFullYear() + 30
const YEARS = []
for (let y = START_YEAR; y <= END_YEAR; y++) YEARS.push(String(y))

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

const RISK_THRESHOLD = 75

export default function TeacherAcademyAttendanceModule({ teacher, token }) {
  const [course, setCourse] = useState("")
  const [section, setSection] = useState("")
  const [year, setYear] = useState("")
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()])

  const [courses, setCourses] = useState([])
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [students, setStudents] = useState([])
  const [attendance, setAttendance] = useState({})

  const [showRiskBox, setShowRiskBox] = useState(false)
  const [weekRange, setWeekRange] = useState(null)
  const [sentNotifications, setSentNotifications] = useState({})
  const [sending, setSending] = useState(false)

  const daysInMonth = useMemo(() => month ? getDaysInMonth(month) : 31, [month])

  // Load all courses via public endpoint
  useEffect(() => {
    if (!token) return
    setCoursesLoading(true)
    fetch(`/api/teacher-public/courses?token=${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d.success) setCourses(d.courses || []) })
      .catch(() => {})
      .finally(() => setCoursesLoading(false))
  }, [token])

  // Auto-select first course from teacher's assigned classes
  useEffect(() => {
    if (courses.length === 0 || course) return
    const assigned = Array.isArray(teacher?.classes) ? teacher.classes : []
    if (assigned.length > 0) {
      const first = assigned[0]
      const courseName = first.course || first.grade
      if (courseName) {
        setCourse(courseName)
        if (first.section) setSection(first.section)
      }
    }
  }, [courses, teacher, course])

  const fetchAll = useCallback(async () => {
    if (!token || !course || !month) {
      setStudents([]); setAttendance({}); return
    }
    setLoading(true)
    try {
      const monthKey = monthNameToKey(month)
      const params = new URLSearchParams({ token, course, month: monthKey })
      if (section) params.append('section', section)
      if (year) params.append('year', year)

      const res = await fetch(`/api/teacher-public/academy-attendance?${params.toString()}`, { cache: 'no-store' })
      const data = await res.json()

      setStudents(Array.isArray(data?.students) ? data.students : [])

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
  }, [token, course, section, year, month])

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
          body: JSON.stringify({ token, studentId: sid, day, date: monthKey, status }),
        })
      }

      const lastDayOfWeek = Math.min(Math.ceil(day / 7) * 7, daysInMonth)
      const firstDayOfWeek = Math.floor((day - 1) / 7) * 7 + 1
      if (Number(day) === lastDayOfWeek) {
        setWeekRange({ weekStart: firstDayOfWeek, weekEnd: lastDayOfWeek })
        setShowRiskBox(true)
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

  const atRiskStudents = useMemo(() => {
    if (!weekRange || students.length === 0) return []
    const { weekStart, weekEnd } = weekRange
    const totalDays = weekEnd - weekStart + 1
    const list = []
    students.forEach((s) => {
      const sid = String(s.id)
      const daysMap = attendance[sid] || {}
      let present = 0
      const presentDays = []
      for (let d = weekStart; d <= weekEnd; d++) {
        if (daysMap[d] === "P") { present++; presentDays.push(d) }
      }
      const pct = Math.round((present / totalDays) * 100)
      if (pct < RISK_THRESHOLD) {
        list.push({
          studentId: sid, name: s.name, course: s.subject || course,
          percentage: pct, presentDays: present, totalDays,
          weekStart, weekEnd, presentDaysList: presentDays,
        })
      }
    })
    return list.sort((a, b) => a.percentage - b.percentage)
  }, [students, attendance, weekRange, course])

  const handleSendNotification = async (student) => {
    setSending(true)
    try {
      const message = `Dear Parent, your child ${student.name} has ${student.percentage}% attendance (${student.presentDays}/${student.totalDays} days present) in days ${weekRange.weekStart}-${weekRange.weekEnd} of ${month}. This is below the required 75% threshold. Please ensure regular attendance.`

      const res = await fetch("/api/teacher-public/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, studentId: student.studentId, message, type: "attendance" }),
      })
      const data = await res.json()
      if (data.success) {
        setSentNotifications((prev) => ({ ...prev, [student.studentId]: true }))
        toast.success(`Notification sent to ${student.name}'s parent`)
      } else {
        toast.error(data.error || "Failed to send")
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to send")
    }
    setSending(false)
  }

  const handleSendAll = async () => {
    for (const st of atRiskStudents) {
      if (!sentNotifications[st.studentId]) {
        await handleSendNotification(st)
      }
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pb-10">
      {/* Filters */}
      <div className="bg-white border rounded-2xl shadow-sm p-4 mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">Course</label>
          <select
            className="border rounded-lg px-3 py-2 bg-white text-sm outline-none focus:border-purple-500 min-w-[180px]"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            disabled={coursesLoading}
          >
            <option value="">{coursesLoading ? "Loading…" : "Select Course"}</option>
            {courses.map((c) => (
              <option key={c._id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">Section</label>
          <select className="border rounded-lg px-3 py-2 bg-white text-sm outline-none focus:border-purple-500"
            value={section} onChange={(e) => setSection(e.target.value)}>
            <option value="">All Sections</option>
            {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">Year</label>
          <select className="border rounded-lg px-3 py-2 bg-white text-sm outline-none focus:border-purple-500"
            value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="">All Years</option>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">Month</label>
          <select className="border rounded-lg px-3 py-2 bg-white text-sm outline-none focus:border-purple-500"
            value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">Select Month</option>
            {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <button onClick={fetchAll}
          className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold">
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white border rounded-2xl p-12 text-center text-slate-400">
          <Users size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-base font-medium">No students found</p>
          <p className="text-sm mt-1">Select a Course and Month to load attendance</p>
        </div>
      ) : (
        <>
          {/* RiskBox */}
          {showRiskBox && atRiskStudents.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4 p-4 bg-red-50 border border-red-300 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">⚠️</span>
                  <div>
                    <h2 className="text-lg font-bold text-red-700">
                      At-Risk Students ({atRiskStudents.length})
                    </h2>
                    <p className="text-sm text-red-500">
                      Days {weekRange?.weekStart}–{weekRange?.weekEnd} · Below {RISK_THRESHOLD}% attendance
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {atRiskStudents.filter((s) => !sentNotifications[s.studentId]).length > 0 && (
                    <button onClick={handleSendAll} disabled={sending}
                      className="bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2 px-4 rounded-lg disabled:opacity-50">
                      {sending ? "Sending..." : "📱 Send All"}
                    </button>
                  )}
                  <button onClick={() => setShowRiskBox(false)}
                    className="w-8 h-8 rounded-lg bg-white hover:bg-red-100 flex items-center justify-center text-red-600">
                    <X size={16} />
                  </button>
                </div>
              </div>

              {atRiskStudents.map((st) => (
                <div key={st.studentId} className="bg-white rounded-xl p-4 border border-red-200 shadow-sm mb-3">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                        <span className="text-red-600 font-bold text-lg">
                          {st.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{st.name}</p>
                        <p className="text-xs text-slate-400">{st.course}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-red-600">{st.percentage}%</span>
                      <p className="text-xs text-slate-400">
                        {st.presentDays}/{st.totalDays} days present
                      </p>
                    </div>
                  </div>

                  <div className="relative h-3 bg-slate-200 rounded-full overflow-hidden mb-1">
                    <div className="h-full rounded-full bg-red-500" style={{ width: `${st.percentage}%` }} />
                    <div className="absolute top-0 h-full w-0.5 bg-orange-400" style={{ left: `${RISK_THRESHOLD}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mb-2">
                    <span>0%</span>
                    <span className="text-orange-500 font-semibold">{RISK_THRESHOLD}% required</span>
                    <span>100%</span>
                  </div>

                  {sentNotifications[st.studentId] ? (
                    <div className="mt-3 flex items-center gap-2 bg-green-50 rounded-lg p-2">
                      <span>✅</span>
                      <p className="text-xs text-green-600 font-medium">Notification sent to parent</p>
                    </div>
                  ) : (
                    <button onClick={() => handleSendNotification(st)} disabled={sending}
                      className="mt-3 w-full bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2 px-4 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
                      {sending ? "Sending..." : <><Send size={14} /> Send Notification to Parent</>}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Grid */}
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
        </>
      )}
    </div>
  )
}