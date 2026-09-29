"use client"
import React, { useEffect, useMemo, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  Loader2,
  ArrowLeft,
  ClipboardCheck,
  Calendar,
  Search,
  Users,
} from "lucide-react"
import GlobalApi from "@/app/_services/GlobalApi"
import { toast } from "sonner"

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
]

function monthNameToKey(name) {
  const map = {
    January: "01", February: "02", March: "03", April: "04",
    May: "05", June: "06", July: "07", August: "08",
    September: "09", October: "10", November: "11", December: "12",
  }
  return `${map[name]}/${new Date().getFullYear()}`
}

function daysInMonthKey(monthKey) {
  const [mm, yyyy] = String(monthKey).split("/").map(Number)
  if (!mm || !yyyy) return 31
  return new Date(yyyy, mm, 0).getDate()
}

export default function TeacherAttendancePage() {
  const params = useParams()
  const token = params?.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [teacher, setTeacher] = useState(null)
  const [students, setStudents] = useState([])

  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()])
  const [attendanceMap, setAttendanceMap] = useState({}) // { "studentId__day": "P" }
  const [searchInput, setSearchInput] = useState("")

  // Load teacher + students
  useEffect(() => {
    if (!token) return
    ;(async () => {
      try {
        const resp = await GlobalApi.GetPublicTeacher(token)
        if (resp.data?.teacher) {
          setTeacher(resp.data.teacher)
          setStudents(resp.data.students || [])
        } else {
          setError("Invalid link")
        }
      } catch (err) {
        console.error(err)
        setError(err?.response?.data?.error || "Could not load data")
      } finally {
        setLoading(false)
      }
    })()
  }, [token])

  const monthKey = useMemo(() => monthNameToKey(selectedMonth), [selectedMonth])
  const totalDays = useMemo(() => daysInMonthKey(monthKey), [monthKey])

  // Load attendance for the selected month
  const loadAttendance = useCallback(async () => {
    if (!students.length || !monthKey) return
    try {
      const all = {}
      // Load attendance for all students of this teacher in one go via grade+month
      // The existing attendance API accepts grade + month + section.
      // We'll fetch per unique grade/section combo.
      const groups = new Map()
      students.forEach((s) => {
        const key = `${s.grade || ""}__${s.section || ""}`
        if (!groups.has(key)) groups.set(key, { grade: s.grade, section: s.section })
      })

      await Promise.all(
        Array.from(groups.values()).map(async (g) => {
          try {
            const resp = await GlobalApi.GetAttendanceList(
              g.grade,
              monthKey,
              g.section,
              ""
            )
            const records = resp.data || []
            records.forEach((r) => {
              const key = `${r.studentId}__${r.day}`
              all[key] = r.status || (r.present ? "P" : "")
            })
          } catch (e) {
            console.error("group fetch error", e)
          }
        })
      )

      setAttendanceMap(all)
    } catch (err) {
      console.error(err)
      toast.error("Failed to load attendance")
    }
  }, [students, monthKey])

  useEffect(() => {
    loadAttendance()
  }, [loadAttendance])

  const cycleStatus = async (student, day, current) => {
    const order = ["", "P", "A", "L"]
    const idx = order.indexOf(current || "")
    const next = order[(idx + 1) % order.length]
    const key = `${student.id}__${day}`

    setAttendanceMap((prev) => {
      const copy = { ...prev }
      if (next === "") delete copy[key]
      else copy[key] = next
      return copy
    })

    try {
      if (next === "") {
        await GlobalApi.DeleteAttendance(student.id, day, monthKey)
      } else {
        await GlobalApi.SaveAttendance({
          studentId: student.id,
          grade: student.grade,
          section: student.section,
          session: student.session,
          month: monthKey,
          day,
          status: next,
        })
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to save")
    }
  }

  const filteredStudents = useMemo(() => {
    if (!searchInput.trim()) return students
    const q = searchInput.toLowerCase()
    return students.filter((s) =>
      String(s.name || "").toLowerCase().includes(q)
    )
  }, [students, searchInput])

  const statusColor = (s) => {
    if (s === "P") return "bg-emerald-500 text-white"
    if (s === "A") return "bg-red-500 text-white"
    if (s === "L") return "bg-amber-500 text-white"
    return "bg-slate-100 dark:bg-slate-700 text-slate-400"
  }
  const statusChar = (s) => s || "·"

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    )
  }

  if (error || !teacher) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
          <p className="text-lg font-bold text-slate-800">Link Not Valid</p>
          <p className="text-sm text-slate-500 mt-2">{error}</p>
          <Link
            href={`/teacher/${token}/public`}
            className="inline-block mt-4 text-indigo-600 font-semibold text-sm"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-600 to-cyan-700 text-white">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link
              href={`/teacher/${token}/public`}
              className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition"
            >
              <ArrowLeft size={20} />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
                <ClipboardCheck size={22} />
              </div>
              <div>
                <p className="text-xs text-sky-100 font-semibold uppercase tracking-widest">
                  Attendance
                </p>
                <h1 className="text-xl font-bold">{teacher.name}</h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Calendar size={16} />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white/15 border border-white/30 text-white text-sm outline-none focus:bg-white/25"
            >
              {MONTHS.map((m) => (
                <option key={m} className="text-slate-800">{m}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Filters & legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm bg-white">
            <Search size={16} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search student..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="outline-none text-sm w-48 bg-transparent"
            />
          </div>

          <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm text-xs">
            <span className="font-bold uppercase text-slate-500">Legend</span>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded bg-emerald-500 text-white text-xs font-bold flex items-center justify-center">P</div>
              <span className="text-slate-600">Present</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded bg-red-500 text-white text-xs font-bold flex items-center justify-center">A</div>
              <span className="text-slate-600">Absent</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded bg-amber-500 text-white text-xs font-bold flex items-center justify-center">L</div>
              <span className="text-slate-600">Leave</span>
            </div>
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Users size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-base font-semibold text-slate-700">
              No students found
            </p>
            <p className="text-sm text-slate-500 mt-1">
              You don't have any classes assigned yet, or no students match your search.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-3 py-3 font-bold text-slate-600 uppercase text-[11px] tracking-wider text-left sticky left-0 bg-slate-50 z-10">
                      Student
                    </th>
                    {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => (
                      <th
                        key={d}
                        className="px-1 py-3 font-bold text-slate-600 uppercase text-[11px] text-center w-9"
                      >
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s) => (
                    <tr
                      key={s._id || s.id}
                      className="border-b border-slate-100 hover:bg-sky-50/40 transition-colors"
                    >
                      <td className="px-3 py-2 sticky left-0 bg-white z-10">
                        <div className="flex items-center gap-2 min-w-[180px]">
                          <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-bold">
                            {String(s.name || "?").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 text-xs truncate">
                              {s.name}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {s.grade}
                              {s.section ? `-${s.section}` : ""}{" "}
                              {s.rollNo ? `· R${s.rollNo}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>

                      {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => {
                        const key = `${s.id}__${d}`
                        const status = attendanceMap[key]
                        return (
                          <td key={d} className="p-1 text-center">
                            <button
                              onClick={() => cycleStatus(s, d, status)}
                              className={`w-8 h-8 rounded-md text-xs font-bold transition-all hover:scale-110 ${statusColor(
                                status
                              )}`}
                              title={`Day ${d}${status ? " · " + status : ""}`}
                            >
                              {statusChar(status)}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
              Click any cell to cycle: <b>· → P → A → L → ·</b>. Saves automatically.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}