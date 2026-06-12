"use client"
import React, { useEffect, useState } from 'react'
import moment from 'moment'

function StatusList({ attendanceList, selectedMonth }) {
  const [totalStudent, setTotalStudent] = useState(0)
  const [presentPerc, setPresentPerc] = useState(0)

  useEffect(() => {
    if (Array.isArray(attendanceList) && attendanceList.length > 0) {

      // ✅ Get unique students
      const uniqueStudents = [...new Set(attendanceList.map(a => a.studentId))]
      setTotalStudent(uniqueStudents.length)

      // ✅ Get total days in selected month
      const totalDaysInMonth = selectedMonth
        ? moment(selectedMonth, 'MM/YYYY').daysInMonth()
        : moment().daysInMonth()

      // ✅ Count total present
      const totalPresent = attendanceList.filter(a => a.present === true).length

      // ✅ Calculate percentage based on full month
      const totalPossible = uniqueStudents.length * totalDaysInMonth
      const perc = (totalPresent / totalPossible) * 100
      setPresentPerc(Math.round(perc))

      console.log("Total Students:", uniqueStudents.length)
      console.log("Total Days in Month:", totalDaysInMonth)
      console.log("Total Present:", totalPresent)
      console.log("Present %:", Math.round(perc))
    } else {
      setTotalStudent(0)
      setPresentPerc(0)
    }
  }, [attendanceList, selectedMonth])

  return (
    <div className='grid grid-cols-3 gap-5 my-6'>
      <div className='bg-blue-50 border border-blue-200 rounded-xl p-5'>
        <h2 className='text-blue-600 font-bold text-3xl'>{totalStudent}</h2>
        <p className='text-gray-500 text-sm mt-1'>Total Students</p>
      </div>
      <div className='bg-green-50 border border-green-200 rounded-xl p-5'>
        <h2 className='text-green-600 font-bold text-3xl'>{presentPerc}%</h2>
        <p className='text-gray-500 text-sm mt-1'>Present %</p>
      </div>
      <div className='bg-red-50 border border-red-200 rounded-xl p-5'>
        <h2 className='text-red-600 font-bold text-3xl'>{100 - presentPerc}%</h2>
        <p className='text-gray-500 text-sm mt-1'>Absent %</p>
      </div>
    </div>
  )
}

export default StatusList