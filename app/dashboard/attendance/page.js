'use client'

import GradeSelection from './_components/GradeSelection'
import SectionSelection from './_components/SectionSelection'
import SessionSelection from './_components/SessionSelection'
import MonthSelection from './_components/MonthSelection'
import AttendanceGrid from './_components/AttendanceGrid'
import RiskBox from './_components/RiskBox'
import GlobalApi from '@/app/_services/GlobalApi'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import React, { useState, useEffect, useCallback, useRef } from 'react'

const STORAGE_KEY = 'attendance_filters_v1'

function Attendance() {
  const [selectedGrade, setSelectedGrade] = useState("")
  const [selectedSection, setSelectedSection] = useState("")
  const [selectedSession, setSelectedSession] = useState("")
  const [selectedMonth, setSelectedMonth] = useState("")
  const [attendanceList, setAttendanceList] = useState(null)
  const [weekRange, setWeekRange] = useState(null)
  const [showRiskBox, setShowRiskBox] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const debounceRef = useRef(null)

  // Load saved filters from localStorage ONCE
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
      if (saved.grade) setSelectedGrade(saved.grade)
      if (saved.section) setSelectedSection(saved.section)
      if (saved.session) setSelectedSession(saved.session)
      if (saved.month) setSelectedMonth(saved.month)
    } catch {}
    setHydrated(true)
  }, [])

  // Save filters whenever they change (after hydration)
  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        grade: selectedGrade,
        section: selectedSection,
        session: selectedSession,
        month: selectedMonth,
      })
    )
  }, [selectedGrade, selectedSection, selectedSession, selectedMonth, hydrated])

  const monthNameToKey = (name) => {
    const map = {
      January: "01", February: "02", March: "03", April: "04",
      May: "05", June: "06", July: "07", August: "08",
      September: "09", October: "10", November: "11", December: "12",
    }
    return `${map[name]}/${new Date().getFullYear()}`
  }

  const fetchAttendance = useCallback(
    async (grade, section, session, month) => {
      if (!grade || !month) {
        setAttendanceList(null)
        return
      }
      setLoading(true)
      try {
        const monthKey = monthNameToKey(month)
        const resp = await GlobalApi.GetAttendanceList(
          grade,
          monthKey,
          section,
          session
        )
        setAttendanceList(resp.data || [])
      } catch (err) {
        console.error("Failed to fetch attendance:", err)
        setAttendanceList([])
      }
      setLoading(false)
    },
    []
  )

  // Auto-fetch whenever filters change (debounced 300ms)
  useEffect(() => {
    if (!hydrated) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchAttendance(selectedGrade, selectedSection, selectedSession, selectedMonth)
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [selectedGrade, selectedSection, selectedSession, selectedMonth, hydrated, fetchAttendance])

  const onSearch = () => {
    fetchAttendance(selectedGrade, selectedSection, selectedSession, selectedMonth)
  }

  const onWeekComplete = ({ weekStart, weekEnd }) => {
    setWeekRange({ weekStart, weekEnd })
    setShowRiskBox(true)
  }

  const onAttendanceChange = () => {}

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
      <html><head><title>Attendance Report</title>
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
        <h2>Attendance Report — ${selectedMonth}</h2>
        <p class="sub">Grade ${selectedGrade} • Section ${selectedSection || "All"} • Session ${selectedSession || "All"}</p>
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
    <div className='p-7'>
      <div className="flex items-center justify-between mb-3">
        <h2 className='text-2xl font-bold'>Attendance</h2>
        {attendanceList && attendanceList.length > 0 && (
          <Button onClick={handlePrint} variant="outline" className="flex gap-2">
            <Printer size={16} /> Print
          </Button>
        )}
      </div>

      <div className='flex flex-wrap gap-4 my-5 p-3 border rounded-lg shadow-sm bg-white'>
        <div className='flex gap-2 items-center'>
          <label className="text-sm font-medium">Grade</label>
          <GradeSelection selectedGrade={setSelectedGrade} defaultGrade={selectedGrade} />
        </div>
        <div className='flex gap-2 items-center'>
          <label className="text-sm font-medium">Section</label>
          <SectionSelection selectedSection={setSelectedSection} defaultSection={selectedSection} />
        </div>
        <div className='flex gap-2 items-center'>
          <label className="text-sm font-medium">Session</label>
          <SessionSelection selectedSession={setSelectedSession} defaultSession={selectedSession} />
        </div>
        <div className='flex gap-2 items-center'>
          <label className="text-sm font-medium">Month</label>
          <MonthSelection selectedMonth={setSelectedMonth} defaultMonth={selectedMonth} />
        </div>
        <Button onClick={onSearch}>Search</Button>
      </div>

      {loading && (
        <div className='flex items-center justify-center py-10'>
          <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500'></div>
          <span className='ml-3 text-gray-500'>Loading attendance...</span>
        </div>
      )}

      {!loading && attendanceList !== null && (
        <>
          <RiskBox
            attendanceList={attendanceList}
            selectedMonth={selectedMonth}
            weekRange={weekRange}
            show={showRiskBox}
            onHide={() => setShowRiskBox(false)}
          />

          <AttendanceGrid
            attendanceList={attendanceList}
            selectedMonth={selectedMonth}
            selectedGrade={selectedGrade}
            selectedSection={selectedSection}
            selectedSession={selectedSession}
            onAttendanceChange={onAttendanceChange}
            onWeekComplete={onWeekComplete}
          />
        </>
      )}

      {!loading && attendanceList === null && (
        <div className='flex items-center justify-center py-10 text-gray-400 text-lg'>
          Please select filters and click Search.
        </div>
      )}
    </div>
  )
}

export default Attendance
