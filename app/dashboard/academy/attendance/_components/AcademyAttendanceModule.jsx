"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs"
import { Printer, Calendar } from "lucide-react"
import CourseSelection from "./CourseSelection"
import SectionSelection from "./SectionSelection"
import YearSelection from "./YearSelection"
import MonthSelection from "./MonthSelection"
import AcademyAttendanceGrid from "./AcademyAttendanceGrid"
import RiskBox from "@/app/dashboard/attendance/_components/RiskBox"
import GlobalApi from "@/app/_services/GlobalApi"

const monthNameToKey = (name) => {
  const map = {
    January: "01", February: "02", March: "03", April: "04",
    May: "05", June: "06", July: "07", August: "08",
    September: "09", October: "10", November: "11", December: "12",
  }
  return `${map[name]}/${new Date().getFullYear()}`
}

const STORAGE_KEY = "academy_attendance_filters_v1"

export default function AcademyAttendanceModule() {
  const { user } = useKindeBrowserClient() || {}
  const email = user?.email

  const [selectedCourse, setSelectedCourse] = useState("")
  const [selectedSection, setSelectedSection] = useState("")
  const [selectedYear, setSelectedYear] = useState("")
  const [selectedMonth, setSelectedMonth] = useState("")
  const [attendanceList, setAttendanceList] = useState(null)
  const [weekRange, setWeekRange] = useState(null)
  const [showRiskBox, setShowRiskBox] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const debounceRef = useRef(null)

  // Load saved filters
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
      if (saved.course) setSelectedCourse(saved.course)
      if (saved.section) setSelectedSection(saved.section)
      if (saved.year) setSelectedYear(saved.year)
      if (saved.month) setSelectedMonth(saved.month)
    } catch {}
    setHydrated(true)
  }, [])

  // Save filters
  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        course: selectedCourse,
        section: selectedSection,
        year: selectedYear,
        month: selectedMonth,
      }))
    } catch {}
  }, [selectedCourse, selectedSection, selectedYear, selectedMonth, hydrated])

  const fetchAttendance = useCallback(
    async (course, section, year, month) => {
      if (!email || !course || !month) {
        setAttendanceList(null)
        return
      }
      setLoading(true)
      try {
        const monthKey = monthNameToKey(month)
        const resp = await GlobalApi.GetAcademyAttendanceList(
          email, course, monthKey, section, year
        )
        setAttendanceList(resp.data || [])
      } catch (err) {
        console.error("Failed to fetch academy attendance:", err)
        setAttendanceList([])
      }
      setLoading(false)
    },
    [email]
  )

  useEffect(() => {
    if (!hydrated) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchAttendance(selectedCourse, selectedSection, selectedYear, selectedMonth)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [selectedCourse, selectedSection, selectedYear, selectedMonth, hydrated, fetchAttendance])

  const onSearch = () => {
    fetchAttendance(selectedCourse, selectedSection, selectedYear, selectedMonth)
  }

  const onWeekComplete = ({ weekStart, weekEnd }) => {
    setWeekRange({ weekStart, weekEnd })
    setShowRiskBox(true)
  }

  const handlePrint = () => {
    if (!attendanceList || attendanceList.length === 0) {
      alert("Nothing to print yet.")
      return
    }
    const w = window.open("", "_blank", "width=1200,height=800")
    if (!w) return

    const monthNum = Number(monthNameToKey(selectedMonth).split("/")[0])
    const daysInMonth = new Date(new Date().getFullYear(), monthNum, 0).getDate()
    const cols = Array.from({ length: daysInMonth }, (_, i) => i + 1)

    const rows = attendanceList
      .map(
        (s) => `
        <tr>
          <td>${s.rollNo ?? ""}</td>
          <td style="text-align:left">${s.name ?? ""}</td>
          ${cols
            .map((d) => {
              const v = s.attendance?.[String(d)] || ""
              const color =
                v === "P" ? "#16a34a" : v === "A" ? "#dc2626" : v === "L" ? "#d97706" : "#bbb"
              return `<td style="color:${color};font-weight:bold">${v || "-"}</td>`
            })
            .join("")}
        </tr>`
      )
      .join("")

    w.document.write(`
      <html><head><title>Academy Attendance Report</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; font-size: 11px; }
        h2 { text-align: center; margin: 0 0 4px; }
        p.sub { text-align: center; color: #555; margin: 0 0 14px; font-size: 12px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: center; }
        th { background: #f3f4f6; font-weight: bold; }
        @media print { @page { size: landscape; } }
      </style>
      </head><body>
        <h2>Academy Attendance Report — ${selectedMonth}</h2>
        <p class="sub">Course ${selectedCourse} • Section ${selectedSection || "All"} • Year ${selectedYear || "All"}</p>
        <table>
          <thead><tr>
            <th>Roll No</th><th style="text-align:left">Name</th>
            ${cols.map((d) => `<th>${d}</th>`).join("")}
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <script>window.onload = () => window.print();</script>
      </body></html>
    `)
    w.document.close()
  }

  return (
    <div className="p-7">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-2xl font-bold">Academy Attendance</h2>
        {attendanceList && attendanceList.length > 0 && (
          <button
            onClick={handlePrint}
            className="flex gap-2 items-center px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold hover:bg-slate-100"
          >
            <Printer size={16} /> Print
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 my-5 p-4 border rounded-xl shadow-sm bg-white">
        <div className="flex gap-2 items-center">
          <label className="text-sm font-medium">Course</label>
          <CourseSelection
            email={email}
            selectedCourse={setSelectedCourse}
            defaultCourse={selectedCourse}
          />
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-sm font-medium">Section</label>
          <SectionSelection
            selectedSection={setSelectedSection}
            defaultSection={selectedSection}
          />
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-sm font-medium">Year</label>
          <YearSelection
            selectedYear={setSelectedYear}
            defaultYear={selectedYear}
          />
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-sm font-medium">Month</label>
          <MonthSelection
            selectedMonth={setSelectedMonth}
            defaultMonth={selectedMonth}
          />
        </div>
        <button
          onClick={onSearch}
          className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold"
        >
          Search
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
          <span className="ml-3 text-gray-500">Loading attendance...</span>
        </div>
      )}

      {/* Data */}
      {!loading && attendanceList !== null && (
        <>
          <RiskBox
            attendanceList={attendanceList}
            selectedMonth={selectedMonth}
            weekRange={weekRange}
            show={showRiskBox}
            onHide={() => setShowRiskBox(false)}
          />

          <AcademyAttendanceGrid
            attendanceList={attendanceList}
            selectedMonth={selectedMonth}
            email={email}
            onWeekComplete={onWeekComplete}
            onAttendanceChange={() => {}}
          />
        </>
      )}

      {/* Empty state */}
      {!loading && attendanceList === null && (
        <div className="flex items-center justify-center py-16 text-center">
          <div>
            <div className="w-16 h-16 rounded-full bg-purple-50 mx-auto flex items-center justify-center mb-4">
              <Calendar size={28} className="text-purple-400" />
            </div>
            <p className="text-base font-semibold text-slate-600">
              Select Course and Month
            </p>
            <p className="text-sm text-slate-400 mt-1">
              Then click Search to load attendance.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}