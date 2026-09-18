'use client'

export const dynamic = 'force-dynamic'

import React, { useEffect, useState } from 'react'
import AddNewStudent from './_components/AddNewStudent'
import StudentListTable from './_components/StudentListTable'
import GlobalApi from '@/app/_services/GlobalApi'

function Students() {

    const [studentList, setStudentList] = useState([])

    const GetAllStudents = async () => {
        try {
            const resp = await GlobalApi.GetAllStudents()
            console.log("RAW DATA:", resp.data)

            // API already returns a flat array of students with id, name, etc.
            const students = Array.isArray(resp.data) ? resp.data : []

            const processed = students.map((student, index) => ({
                ...student,
                id: student.id || student._id || `student_${index}`,
                contact: student.contact || 'N/A',
            }))

            console.log("FINAL:", processed)
            setStudentList(processed)
        } catch (error) {
            console.error("GetAllStudents error:", error)
        }
    }

    useEffect(() => {
        GetAllStudents()
    }, [])

    return (
        <div className='p-7'>
            <div className='flex justify-between items-center mb-5'>
                <h2 className='font-bold text-2xl'>Students</h2>
                <AddNewStudent refreshData={GetAllStudents} />
            </div>

            <StudentListTable
                StudentList={studentList}
                refreshData={GetAllStudents}
            />
        </div>
    )
}

export default Students