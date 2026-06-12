'use client'

export const dynamic = 'force-dynamic'

import React, { useEffect, useState } from 'react'
import AddNewStudent from './_components/AddNewStudent'
import StudentListTable from './_components/StudentListTable'
import RiskStudentsBox from '../../_components/RiskStudentsBox'
import GlobalApi from '@/app/_services/GlobalApi'

function Students() {

    const [studentList, setStudentList] = useState([])

    const GetAllStudents = async () => {
        try {
            const resp = await GlobalApi.GetAllStudents()
            console.log("STUDENTS:", resp.data)
            setStudentList(resp.data || [])
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