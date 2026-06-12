'use client'

export const dynamic = 'force-dynamic'

import GradeSelection from '@/app/_components/GradeSelection'
import MonthSelection from '@/app/_components/MonthSelection'
import GlobalApi from '@/app/_services/GlobalApi'
import { Button } from '@/components/ui/button'
import moment from 'moment'
import React, { useState, useEffect } from 'react'
import AttendanceGrid from './_components/AttendanceGrid'
import RiskBox from './_components/RiskBox'

function Attendance() {
    const [selectedMonth, setSelectedMonth] = useState()
    const [selectedGrade, setSelectedGrade] = useState()
    const [attendanceList, setAttendanceList] = useState(null)
    const [searchMonth, setSearchMonth] = useState()
    const [showRiskBox, setShowRiskBox] = useState(false)
    const [weekRange, setWeekRange] = useState(null)
    const [loading, setLoading] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!mounted) return
        const savedMonth = localStorage.getItem('selectedMonth')
        const savedGrade = localStorage.getItem('selectedGrade')
        if (savedMonth && savedGrade) {
            setSelectedMonth(savedMonth)
            setSelectedGrade(savedGrade)
            setSearchMonth(savedMonth)
            fetchAttendance(savedGrade, savedMonth)
        }
    }, [mounted])

    const fetchAttendance = (grade, month) => {
        if (!grade || !month) return
        GlobalApi.GetAttendanceList(grade, month)
            .then(resp => {
                setAttendanceList(resp.data || [])
            })
            .catch(err => {
                console.error("Failed to fetch attendance:", err)
                setAttendanceList([])
            })
    }

    const onSearchHandler = () => {
        if (!selectedMonth || !selectedGrade) {
            alert("Please select both Month and Grade.")
            return
        }

        let month
        if (typeof selectedMonth === 'string') {
            month = selectedMonth
        } else {
            month = moment(selectedMonth).format('MM/YYYY')
        }

        if (!month || month === 'Invalid date') {
            alert("Please select a valid month.")
            return
        }

        setSearchMonth(month)
        setShowRiskBox(false)
        setWeekRange(null)
        localStorage.setItem('selectedMonth', month)
        localStorage.setItem('selectedGrade', selectedGrade)
        setLoading(true)
        GlobalApi.GetAttendanceList(selectedGrade, month)
            .then(resp => {
                setAttendanceList(resp.data || [])
            })
            .catch(err => {
                console.error("Failed to fetch attendance:", err)
                setAttendanceList([])
            })
            .finally(() => setLoading(false))
    }

    const onWeekComplete = ({ weekStart, weekEnd }) => {
        setWeekRange({ weekStart, weekEnd })
        setShowRiskBox(true)
        fetchAttendance(selectedGrade, searchMonth)
    }

    const onAttendanceChange = () => {
        fetchAttendance(selectedGrade, searchMonth)
    }

    if (!mounted) return null

    return (
        <div className='p-7'>
            <h2 className='text-2xl font-bold'>Attendance</h2>

            <div className='flex gap-5 my-5 p-2 border rounded-lg shadow-sm'>
                <div className='flex gap-2 items-center'>
                    <label>Select Month</label>
                    <MonthSelection
                        selectedMonth={(value) => setSelectedMonth(value)}
                        defaultMonth={selectedMonth}
                    />
                </div>
                <div className='flex gap-2 items-center'>
                    <label>Select Grade</label>
                    <GradeSelection
                        selectedGrade={(v) => setSelectedGrade(v)}
                        defaultGrade={selectedGrade}
                    />
                </div>
                <Button onClick={onSearchHandler}>Search</Button>
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
                        selectedMonth={searchMonth}
                        weekRange={weekRange}
                        show={showRiskBox}
                        onHide={() => setShowRiskBox(false)}
                    />

                    <AttendanceGrid
                        attendanceList={attendanceList}
                        selectedMonth={searchMonth}
                        onWeekComplete={onWeekComplete}
                        onAttendanceChange={onAttendanceChange}
                    />
                </>
            )}

            {!loading && attendanceList === null && !searchMonth && (
                <div className='flex items-center justify-center py-10 text-gray-400 text-lg'>
                    Please select a Month and Grade, then click Search.
                </div>
            )}
        </div>
    )
}

export default Attendance