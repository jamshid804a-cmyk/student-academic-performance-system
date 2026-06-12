'use client'
import { useEffect, useState } from 'react'
import MonthSelection from '../_components/MonthSelection';
import GradeSelection from '../_components/GradeSelection';
import GlobalApi from '../_services/GlobalApi';
import moment from 'moment';
import StatusList from './_component/StatusList';
import AttendanceChart from './_component/AttendanceChart';
// import RiskStudentsBox from '../_components/RiskStudentsBox'  // ✅ Add this

function Dashboard() {
  const [selectedMonth, setSelectedMonth] = useState()
  const [selectedGrade, setSelectedGrade] = useState()
  const [attendanceList, setAttendanceList] = useState([])
  const [studentList, setStudentList] = useState([])  // ✅ Add this

  // ✅ Fetch students for academic risk box
  useEffect(() => {
    GlobalApi.GetAllStudents()
      .then(resp => {
        console.log("Students for risk box:", resp.data);
        setStudentList(resp.data || []);
      })
      .catch(err => console.error("Error fetching students:", err));
  }, []);

  // Restore from localStorage on page load
  useEffect(() => {
    if (typeof window === 'undefined') return
    const savedMonth = localStorage.getItem('dashboard_month')
    const savedGrade = localStorage.getItem('dashboard_grade')
    if (savedMonth) {
      const parsed = moment(savedMonth, 'MM/YYYY').toDate()
      setSelectedMonth(parsed)
    }
    if (savedGrade) setSelectedGrade(savedGrade)
  }, [])

  // Fetch when month or grade changes
  useEffect(() => {
    if (selectedMonth && selectedGrade) {
      getStudentAttendance()
    }
  }, [selectedMonth, selectedGrade])

  const getStudentAttendance = () => {
    const month = moment(selectedMonth).format('MM/YYYY')
    GlobalApi.GetAttendanceList(selectedGrade, month)
      .then(resp => {
        setAttendanceList(resp.data)
      })
      .catch(err => {
        console.error("❌ Error:", err)
        setAttendanceList([])
      })
  }

  const handleMonthChange = (value) => {
    setSelectedMonth(value)
    localStorage.setItem('dashboard_month', moment(value).format('MM/YYYY'))
  }

  const handleGradeChange = (value) => {
    setSelectedGrade(value)
    localStorage.setItem('dashboard_grade', value)
  }

  const formattedMonth = selectedMonth
    ? moment(selectedMonth).format('MM/YYYY')
    : ''

  return (
    <div className='p-10'>
      {/* ✅ ACADEMIC RISK BOX - Shows at top of dashboard */}
      <RiskStudentsBox students={studentList} />

      <div className='flex items-center justify-between mt-5'>
        <h2 className='font-bold text-2xl'>Attendance Dashboard</h2>
        <div className='flex items-center gap-4'>
          <MonthSelection
            selectedMonth={handleMonthChange}
            defaultMonth={formattedMonth}
          />
          <GradeSelection
            selectedGrade={handleGradeChange}
            defaultGrade={selectedGrade}
          />
        </div>
      </div>

      <StatusList
        attendanceList={attendanceList}
        selectedMonth={formattedMonth}
      />

      <AttendanceChart
        attendanceList={attendanceList}
        selectedMonth={formattedMonth}
      />
    </div>
  )
}

export default Dashboard