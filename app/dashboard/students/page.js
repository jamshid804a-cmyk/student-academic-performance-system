'use client'

export const dynamic = 'force-dynamic'

import React, { useEffect, useState } from 'react'
import AddNewStudent from './_components/AddNewStudent'
import StudentListTable from './_components/StudentListTable'
import GlobalApi from '@/app/_services/GlobalApi'

function Students() {

    const [studentList, setStudentList] = useState([])

    // 🔥 THIS FUNCTION FLATTENS GROUPED DATA
    const flattenStudentData = (data) => {
        if (!data) return []
        
        if (Array.isArray(data)) {
            // Check if data is grouped by phone number
            if (data.length > 0 && data[0]?.phone && data[0]?.students) {
                const flattened = []
                data.forEach(group => {
                    if (group.students && Array.isArray(group.students)) {
                        group.students.forEach(student => {
                            flattened.push({
                                ...student,
                                id: student.id || `student_${Date.now()}_${Math.random()}`,
                                contact: group.phone || student.contact || student.phone || 'N/A'
                            })
                        })
                    }
                })
                return flattened
            }
            return data
        }
        return []
    }

    const GetAllStudents = async () => {
        try {
            const resp = await GlobalApi.GetAllStudents()
            console.log("RAW DATA:", resp.data)
            
            // Flatten the data
            const flattened = flattenStudentData(resp.data)
            console.log("FLATTENED:", flattened)
            
            // Add unique IDs
            const processed = flattened.map((student, index) => ({
                ...student,
                id: student.id || `student_${Date.now()}_${index}`,
                contact: student.contact || student.phone || student.mobile || 'N/A'
            }))
            
            console.log("FINAL:", processed)
            setStudentList(processed || [])
        } catch (error) {
            console.log(error)
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
            <RiskStudentsBox students={studentList} />
            <StudentListTable
                StudentList={studentList}
                refreshData={GetAllStudents}
            />
        </div>
    )
}

export default Students