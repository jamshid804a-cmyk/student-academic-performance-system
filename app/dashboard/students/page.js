'use client'


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

            const students = Array.isArray(resp.data) ? resp.data : []

            // ⚠️ DO NOT invent a fake id. Keep the real one from MongoDB.
            const processed = students.map((student) => ({
                ...student,
                // Prefer numeric id, then MongoDB _id as string
                id: student.id ?? student._id ?? null,
                contact: student.contact || '',
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
