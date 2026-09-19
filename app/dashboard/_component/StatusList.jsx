"use client"
import React, { useEffect, useState } from 'react'
import moment from 'moment'
import { Users, CheckCircle2, XCircle, Clock, TrendingUp, GraduationCap } from 'lucide-react'

export default function StatusList({
  allStudents = [],
  classStudents = [],
  attendanceList = [],
  selectedMonth,
  selectedGrade,
}) {
  const [stats, setStats] = useState({
    totalSchool: 0,
    classSize: 0,
    present: 0,
    absent: 0,
    leave: 0,
    presentPct: 0,
    absentPct: 0,
    leavePct: 0,
    attendancePct: 0,
  })

  useEffect(() => {
    const totalSchool = Array.isArray(allStudents) ? allStudents.length : 0
    const classSize = Array.isArray(classStudents) ? classStudents.length : 0

    // Count P / A / L from attendanceList for the selected month
    let present = 0, absent = 0, leave = 0
    ;(Array.isArray(attendanceList) ? attendanceList : []).forEach((a) => {
      const s = a.status || (a.present ? "P" : null)
      if (s === "P") present++
      else if (s === "A") absent++
      else if (s === "L") leave++
    })

    const totalDays = selectedMonth
      ? moment(selectedMonth, "MM/YYYY").daysInMonth()
      : moment().daysInMonth()

    const totalPossible = classSize * totalDays

    const presentPct = totalPossible > 0 ? Math.round((present / totalPossible) * 100) : 0
    const absentPct  = totalPossible > 0 ? Math.round((absent  / totalPossible) * 100) : 0
    const leavePct   = totalPossible > 0 ? Math.round((leave   / totalPossible) * 100) : 0

    // "Attendance %" = present / (present + absent + leave)
    const marked = present + absent + leave
    const attendancePct = marked > 0 ? Math.round((present / marked) * 100) : 0

    setStats({
      totalSchool,
      classSize,
      present, absent, leave,
      presentPct, absentPct, leavePct,
      attendancePct,
    })
  }, [allStudents, classStudents, attendanceList, selectedMonth])

  return (
    <div className="space-y-4">

      {/* Row 1 — Total students across the whole school */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

        <div className="group relative overflow-hidden rounded-2xl p-5 shadow-md hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10 group-hover:scale-125 transition-transform duration-500" />
          <div className="absolute -right-2 -bottom-6 w-20 h-20 rounded-full bg-white/5 group-hover:scale-125 transition-transform duration-500" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <GraduationCap size={18} />
              <span className="text-xs font-semibold uppercase tracking-wide opacity-90">Total Students</span>
            </div>
            <p className="text-4xl font-bold">{stats.totalSchool}</p>
            <p className="text-xs opacity-80 mt-1">All grades · Whole school</p>
          </div>
        </div>

        {/* Class size */}
        <div className="group relative overflow-hidden rounded-2xl p-5 shadow-md hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-violet-500 to-purple-600 text-white">
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10 group-hover:scale-125 transition-transform duration-500" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Users size={18} />
              <span className="text-xs font-semibold uppercase tracking-wide opacity-90">Class Size</span>
            </div>
            <p className="text-4xl font-bold">{stats.classSize}</p>
            <p className="text-xs opacity-80 mt-1">{selectedGrade || "— no grade —"}</p>
          </div>
        </div>

        {/* Attendance % */}
        <div className="group relative overflow-hidden rounded-2xl p-5 shadow-md hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10 group-hover:scale-125 transition-transform duration-500" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={18} />
              <span className="text-xs font-semibold uppercase tracking-wide opacity-90">Attendance</span>
            </div>
            <p className="text-4xl font-bold">{stats.attendancePct}%</p>
            <p className="text-xs opacity-80 mt-1">Present of marked</p>
          </div>
        </div>

        {/* Placeholder / Grade info */}
        <div className="group relative overflow-hidden rounded-2xl p-5 shadow-md hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-slate-600 to-slate-800 text-white">
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10 group-hover:scale-125 transition-transform duration-500" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={18} />
              <span className="text-xs font-semibold uppercase tracking-wide opacity-90">Month</span>
            </div>
            <p className="text-2xl font-bold">{selectedMonth || "—"}</p>
            <p className="text-xs opacity-80 mt-1">Selected period</p>
          </div>
        </div>
      </div>

      {/* Row 2 — Present / Absent / Leave (only when a grade is picked) */}
      {selectedGrade && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <div className="group rounded-2xl p-5 shadow-md hover:shadow-xl transition-all duration-300 bg-white border border-emerald-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CheckCircle2 size={20} />
                </div>
                <span className="text-sm font-semibold text-slate-600">Present</span>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                {stats.presentPct}%
              </span>
            </div>
            <p className="text-4xl font-bold text-emerald-600">{stats.present}</p>
            <div className="mt-3 h-1.5 w-full rounded-full bg-emerald-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                style={{ width: `${stats.presentPct}%` }}
              />
            </div>
          </div>

          <div className="group rounded-2xl p-5 shadow-md hover:shadow-xl transition-all duration-300 bg-white border border-red-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <XCircle size={20} />
                </div>
                <span className="text-sm font-semibold text-slate-600">Absent</span>
              </div>
              <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full">
                {stats.absentPct}%
              </span>
            </div>
            <p className="text-4xl font-bold text-red-600">{stats.absent}</p>
            <div className="mt-3 h-1.5 w-full rounded-full bg-red-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-red-500 transition-all duration-700"
                style={{ width: `${stats.absentPct}%` }}
              />
            </div>
          </div>

          <div className="group rounded-2xl p-5 shadow-md hover:shadow-xl transition-all duration-300 bg-white border border-amber-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Clock size={20} />
                </div>
                <span className="text-sm font-semibold text-slate-600">Leave</span>
              </div>
              <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                {stats.leavePct}%
              </span>
            </div>
            <p className="text-4xl font-bold text-amber-600">{stats.leave}</p>
            <div className="mt-3 h-1.5 w-full rounded-full bg-amber-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-700"
                style={{ width: `${stats.leavePct}%` }}
              />
            </div>
          </div>

        </div>
      )}
    </div>
  )
}