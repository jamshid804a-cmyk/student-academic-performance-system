'use client'

import React, { useEffect, useState } from 'react'
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs'
import AddNewStudent from './_components/AddNewStudent'
import StudentListTable from './_components/StudentListTable'

function AcademyStudents() {
  const { user } = useKindeBrowserClient() || {}
  const [studentList, setStudentList] = useState([])

  const GetAllStudents = async () => {
    if (!user?.email) return
    try {
      const res = await fetch(
        `/api/academy/student?email=${encodeURIComponent(user.email)}`,
        { cache: 'no-store' }
      )
      const data = await res.json()
      const students = Array.isArray(data?.students) ? data.students : []

      const processed = students.map((student) => ({
        ...student,
        id: student.id ?? student._id ?? null,
        contact: student.contact || '',
      }))

      setStudentList(processed)
    } catch (error) {
      console.error('GetAllStudents error:', error)
    }
  }

  useEffect(() => {
    GetAllStudents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email])

  return (
    <div className='p-7'>
      <div className='flex justify-between items-center mb-5'>
        <h2 className='font-bold text-2xl'>Academy Students</h2>
        <AddNewStudent
          refreshData={GetAllStudents}
          email={user?.email}
          students={studentList}
        />
      </div>

      <StudentListTable
        StudentList={studentList}
        refreshData={GetAllStudents}
        students={studentList}
        email={user?.email}
      />
    </div>
  )
}

export default AcademyStudents