"use client"
import React, { useEffect, useState, useMemo } from "react"
import { LoaderIcon, Users, CheckCircle, XCircle, Clock } from "lucide-react"
import GlobalApi from "@/app/_services/GlobalApi"
import { toast } from "sonner"

// Get number of days in the given month key ("MM/YYYY")
function daysInMonth(monthKey) {
  const [mm, yyyy] = String(monthKey).split("/").map(Number)
  if (!mm || !yyyy) return 31
  return new Date(yyyy, mm, 0).getDate()
}

export default function TeacherAttendanceGrid({
  teachers,
  month,          // "MM/YYYY"
  monthLabel,     // "September"
  attendance,     // array of records from parent
  onSaved,
}) {
  const [rows, setRows] = useState([])
  const [saving, setSaving] = useState(false)
  const totalDays = useMemo(() => daysInMonth(month), [month])

  // Build a map: { teacherId: { day: status } }
  const initialMap = useMemo(() => {
    const m = {}
    attendance.forEach((r) => {
      const tid = String(r.teacherId)
      if (!m[tid]) m[tid] = {}
      m[tid][Number(r.day)] = r.status
    })
    return m
  }, [attendance])

  // Build row data (one row per teacher)
  useEffect(() => {
    const data = teachers.map((t) => {
      const dayMap = initialMap[String(t.teacherId)] || {}
      const row = { teacher: t, days: dayMap }
      return row
    })
    setRows(data)
  }, [teachers, initialMap])

  // Cycle P -> A -> L -> clear
  const cycleStatus = async (teacherId, day, current) => {
    const order = ["", "P", "A", "L"]
    const idx = order.indexOf(current || "")
    const next = order[(idx + 1) % order.length]

    // Update local state
    setRows((prev) =>
      prev.map((r) => {
        if (String(r.teacher.teacherId) !== String(teacherId)) return r
        const newDays = { ...r.days }
        if (next === "") delete newDays[day]
        else newDays[day] = next
        return { ...r, days: newDays }
      })
    )

    // Save to server
    try {
      if (next === "") {
        await GlobalApi.DeleteTeacherAttendance(teacherId, month, day)
      } else {
        await GlobalApi.SaveTeacherAttendance({
          teacherId,
          month,
          day,
          status: next,
        })
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to save")
    }
  }

  const statusColor = (s) => {
    if (s === "P") return "bg-emerald-500 text-white"
    if (s === "A") return "bg-red-500 text-white"
    if (s === "L") return "bg-amber-500 text-white"
    return "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500"
  }

  const statusChar = (s) => {
    if (s === "P") return "P"
    if (s === "A") return "A"
    if (s === "L") return "L"
    return "·"
  }

  if (teachers.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 mx-auto flex items-center justify-center mb-4">
          <Users size={28} />
        </div>
        <p className="text-base font-semibold text-slate-700 dark:text-slate-200">
          No teachers yet
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Add teachers first to mark their attendance.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Legend + Header */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow">
            <Users size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Teacher Attendance
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {monthLabel} {month.split("/")[1]} · {teachers.length} teacher
              {teachers.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-700">
          <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
            Legend
          </span>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded bg-emerald-500 text-white text-xs font-bold flex items-center justify-center">
              P
            </div>
            <span className="text-xs text-slate-600 dark:text-slate-300">Present</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded bg-red-500 text-white text-xs font-bold flex items-center justify-center">
              A
            </div>
            <span className="text-xs text-slate-600 dark:text-slate-300">Absent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
              L
            </div>
            <span className="text-xs text-slate-600 dark:text-slate-300">Leave</span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
                <th className="px-3 py-3 font-bold text-slate-600 dark:text-slate-300 uppercase text-[11px] tracking-wider text-left sticky left-0 bg-slate-50 dark:bg-slate-900/60 z-10">
                  Teacher
                </th>
                {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => (
                  <th
                    key={d}
                    className="px-1 py-3 font-bold text-slate-600 dark:text-slate-300 uppercase text-[11px] text-center w-9"
                  >
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.teacher._id}
                  className="border-b border-slate-100 dark:border-slate-700 hover:bg-emerald-50/30 dark:hover:bg-slate-700/30 transition-colors"
                >
                  <td className="px-3 py-2 sticky left-0 bg-white dark:bg-slate-800 z-10">
                    <div className="flex items-center gap-2 min-w-[180px]">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-bold">
                        {String(row.teacher.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-100 text-xs truncate">
                          {row.teacher.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {row.teacher.teacherId || ""}
                        </p>
                      </div>
                    </div>
                  </td>

                  {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => {
                    const s = row.days[d]
                    return (
                      <td key={d} className="p-1 text-center">
                        <button
                          onClick={() => cycleStatus(row.teacher.teacherId, d, s)}
                          className={`w-8 h-8 rounded-md text-xs font-bold transition-all hover:scale-110 ${statusColor(
                            s
                          )}`}
                          title={`Day ${d}${s ? " · " + statusChar(s) : ""}`}
                        >
                          {statusChar(s)}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
          Click any cell to cycle: <b>· → P → A → L → ·</b>. Changes save
          automatically.
        </div>
      </div>
    </div>
  )
}