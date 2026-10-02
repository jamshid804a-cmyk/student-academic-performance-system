"use client"

import { useEffect, useState } from 'react'
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs'
import MonthSelection from '@/app/dashboard/attendance/_components/MonthSelection'
import CourseSelection from '../_components/CourseSelection'
import SectionSelection from '../_components/SectionSelection'
import BatchSelection from '../_components/BatchSelection'
import YearSelection from '../_components/YearSelection'
import StatusList from '../_components/StatusList'
import AttendanceChart from '../_components/AttendanceChart'
import FeeSummaryCards from '../_components/FeeSummaryCards'

const STORAGE_KEY = 'academy_dashboard_filters_v3'

const monthNameToKey = (name) => {
  const map = {
    January: "01", February: "02", March: "03", April: "04",
    May: "05", June: "06", July: "07", August: "08",
    September: "09", October: "10", November: "11", December: "12",
  }
  return map[name] || null
}

export default function DashboardContent() {
  const { user } = useKindeBrowserClient() || {}
  const email = user?.email

  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [selectedBatch, setSelectedBatch] = useState('')
  const [selectedYear, setSelectedYear] = useState('')

  const [allStudents, setAllStudents] = useState([])
  const [classStudents, setClassStudents] = useState([])
  const [attendanceList, setAttendanceList] = useState([])
  const [fees, setFees] = useState([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      if (saved.month) setSelectedMonth(saved.month)
      if (saved.course) setSelectedCourse(saved.course)
      if (saved.section) setSelectedSection(saved.section)
      if (saved.batch) setSelectedBatch(saved.batch)
      if (saved.year) setSelectedYear(saved.year)
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      month: selectedMonth,
      course: selectedCourse,
      section: selectedSection,
      batch: selectedBatch,
      year: selectedYear,
    }))
  }, [selectedMonth, selectedCourse, selectedSection, selectedBatch, selectedYear, hydrated])

  // All academy students (for total count)
  useEffect(() => {
    if (!email) return
    fetch(`/api/academy/student?email=${encodeURIComponent(email)}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d.success) setAllStudents(d.students || []) })
      .catch(() => {})
  }, [email])

  // Class students (course + section + batch + year)
  useEffect(() => {
    if (!email) return
    if (!selectedCourse) { setClassStudents([]); return }
    fetch(`/api/academy/student?email=${encodeURIComponent(email)}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          let list = d.students || []
          list = list.filter(s => s.subject === selectedCourse)
          if (selectedSection) list = list.filter(s => s.section === selectedSection)
          if (selectedBatch) list = list.filter(s => s.batchNo === selectedBatch)
          if (selectedYear) list = list.filter(s => String(s.year) === String(selectedYear))
          setClassStudents(list)
        }
      })
      .catch(() => {})
  }, [email, selectedCourse, selectedSection, selectedBatch, selectedYear])

  // Attendance (flat list)
  useEffect(() => {
    if (!email) return
    if (!selectedMonth || !selectedCourse) { setAttendanceList([]); return }

    const monthNum = monthNameToKey(selectedMonth)
    const monthKey = monthNum
      ? `${monthNum}/${new Date().getFullYear()}`
      : selectedMonth

    const params = new URLSearchParams({
      email,
      course: selectedCourse,
      month: monthKey,
    })
    if (selectedSection) params.append('section', selectedSection)
    if (selectedBatch) params.append('batch', selectedBatch)
    if (selectedYear) params.append('year', selectedYear)

    fetch(`/api/academy/attendance/flat?${params.toString()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => setAttendanceList(Array.isArray(data) ? data : []))
      .catch(() => setAttendanceList([]))
  }, [email, selectedMonth, selectedCourse, selectedSection, selectedBatch, selectedYear])

  // Fees (for the selected month + filters)
  useEffect(() => {
    if (!email) return
    if (!selectedMonth || !selectedCourse) { setFees([]); return }

    const monthNum = monthNameToKey(selectedMonth)
    const monthKey = monthNum
      ? `${monthNum}/${new Date().getFullYear()}`
      : selectedMonth

    const params = new URLSearchParams({
      orgEmail: email,
      course: selectedCourse,
      month: monthKey,
    })
    if (selectedSection) params.append('section', selectedSection)
    if (selectedYear) params.append('year', selectedYear)

    fetch(`/api/academy/fees?${params.toString()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => setFees(Array.isArray(data) ? data : []))
      .catch(() => setFees([]))
  }, [email, selectedMonth, selectedCourse, selectedSection, selectedYear])

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-bold text-3xl text-slate-800">Academy Dashboard</h2>
          <p className="text-sm text-slate-500 mt-1">Attendance & Fee overview</p>
        </div>
      </div>

      <div className="bg-white border rounded-2xl shadow-sm p-4 mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">Month</label>
          <MonthSelection selectedMonth={setSelectedMonth} defaultMonth={selectedMonth} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">Course</label>
          <CourseSelection
            email={email}
            selectedCourse={setSelectedCourse}
            defaultCourse={selectedCourse}
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
          <label className="text-sm font-medium text-slate-600">Batch</label>
          <BatchSelection
            selectedBatch={setSelectedBatch}
            defaultBatch={selectedBatch}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">Year</label>
          <YearSelection
            selectedYear={setSelectedYear}
            defaultYear={selectedYear}
          />
        </div>
      </div>

      <StatusList
        allStudents={allStudents}
        classStudents={classStudents}
        attendanceList={attendanceList}
        selectedMonth={selectedMonth}
        selectedCourse={selectedCourse}
      />

      <FeeSummaryCards
        students={classStudents}
        fees={fees}
        monthLabel={selectedMonth}
      />

      <AttendanceChart
        attendanceList={attendanceList}
        selectedMonth={selectedMonth}
      />
    </div>
  )
}