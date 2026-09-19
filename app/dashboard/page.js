'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import MonthSelection from '@/app/dashboard/attendance/_components/MonthSelection'
import GradeSelection from '@/app/dashboard/attendance/_components/GradeSelection'
import SectionSelection from '@/app/dashboard/attendance/_components/SectionSelection'
import SessionSelection from '@/app/dashboard/attendance/_components/SessionSelection'
import GlobalApi from '@/app/_services/GlobalApi'
import StatusList from './_component/StatusList'
import AttendanceChart from './_component/AttendanceChart'

const STORAGE_KEY = 'dashboard_filters_v3'

export default function Dashboard() {
  const [selectedMonth, setSelectedMonth] = useState('')       // "MM/YYYY"
  const [selectedGrade, setSelectedGrade] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [selectedSession, setSelectedSession] = useState('')

  const [attendanceList, setAttendanceList] = useState([])
  const [allStudents, setAllStudents] = useState([])
  const [classStudents, setClassStudents] = useState([])
  const [hydrated, setHydrated] = useState(false)

  // Load saved filters
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      if (saved.month) setSelectedMonth(saved.month)
      if (saved.grade) setSelectedGrade(saved.grade)
      if (saved.section) setSelectedSection(saved.section)
      if (saved.session) setSelectedSession(saved.session)
    } catch {}
    setHydrated(true)
  }, [])

  // Save filters
  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      month: selectedMonth,
      grade: selectedGrade,
      section: selectedSection,
      session: selectedSession,
    }))
  }, [selectedMonth, selectedGrade, selectedSection, selectedSession, hydrated])

  // Total students
  useEffect(() => {
    GlobalApi.GetAllStudents()
      .then(resp => setAllStudents(resp.data || []))
      .catch(err => console.error("Students error:", err))
  }, [])

  // Class students
  useEffect(() => {
    if (!hydrated) return
    if (!selectedGrade) { setClassStudents([]); return }

    const params = { grade: selectedGrade }
    if (selectedSection) params.section = selectedSection
    if (selectedSession) params.session = selectedSession

    GlobalApi.GetAllStudents(params)
      .then(resp => setClassStudents(resp.data || []))
      .catch(err => console.error("Class students error:", err))
  }, [selectedGrade, selectedSection, selectedSession, hydrated])

  // Attendance
  useEffect(() => {
    if (!hydrated) return
    if (!selectedMonth || !selectedGrade) { setAttendanceList([]); return }

    GlobalApi.GetAttendanceList(selectedGrade, selectedMonth, selectedSection, selectedSession)
      .then(resp => setAttendanceList(resp.data || []))
      .catch(err => {
        console.error("Attendance error:", err)
        setAttendanceList([])
      })
  }, [selectedMonth, selectedGrade, selectedSection, selectedSession, hydrated])

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-bold text-3xl text-slate-800">Dashboard</h2>
          <p className="text-sm text-slate-500 mt-1">Attendance overview</p>
        </div>
      </div>

      <div className="bg-white border rounded-2xl shadow-sm p-4 mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">Month</label>
          <MonthSelection
            selectedMonth={setSelectedMonth}
            defaultMonth={selectedMonth}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">Grade</label>
          <GradeSelection
            selectedGrade={setSelectedGrade}
            defaultGrade={selectedGrade}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">Section</label>
          <SectionSelection
            selectedSection={setSelectedSection}
            defaultSection={selectedSection}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">Session</label>
          <SessionSelection
            selectedSession={setSelectedSession}
            defaultSession={selectedSession}
          />
        </div>
      </div>

      <StatusList
        allStudents={allStudents}
        classStudents={classStudents}
        attendanceList={attendanceList}
        selectedMonth={selectedMonth}
        selectedGrade={selectedGrade}
      />

      <AttendanceChart
        attendanceList={attendanceList}
        selectedMonth={selectedMonth}
      />
    </div>
  )
}