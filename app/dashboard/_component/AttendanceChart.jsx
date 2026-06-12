"use client"
import React, { useEffect, useState } from 'react'
import moment from 'moment'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts'

function AttendanceChart({ attendanceList, selectedMonth }) {
    const [dailyData, setDailyData] = useState([])
    const [monthlyData, setMonthlyData] = useState([])

    useEffect(() => {
        if (Array.isArray(attendanceList) && attendanceList.length > 0 && selectedMonth) {
            processDailyData()
            processMonthlyData()
        }
    }, [attendanceList, selectedMonth])

    const processDailyData = () => {
        const totalDays = moment(selectedMonth, 'MM/YYYY').daysInMonth()
        const uniqueStudents = [...new Set(attendanceList.map(a => a.studentId))]
        const totalStudents = uniqueStudents.length

        const data = []
        for (let day = 1; day <= totalDays; day++) {
            const presentOnDay = attendanceList.filter(
                a => Number(a.day) === day && a.present === true
            ).length
            const absentOnDay = totalStudents - presentOnDay
            data.push({
                day: `${day}`,
                Present: presentOnDay,
                Absent: absentOnDay,
            })
        }
        setDailyData(data)
    }

    const processMonthlyData = () => {
        const totalDays = moment(selectedMonth, 'MM/YYYY').daysInMonth()
        const uniqueStudents = [...new Set(attendanceList.map(a => a.studentId))]
        const totalPossible = uniqueStudents.length * totalDays
        const totalPresent = attendanceList.filter(a => a.present === true).length
        const totalAbsent = totalPossible - totalPresent

        setMonthlyData([
            { name: 'Present', value: totalPresent },
            { name: 'Absent', value: totalAbsent },
        ])
    }

    const COLORS = ['#6366f1', '#f43f5e']

    const CustomBarTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: 'linear-gradient(135deg, #a59ffd, #312e81)',
                    border: 'none',
                    borderRadius: 12,
                    padding: '12px 16px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                }}>
                    <p style={{ color: '#a5b4fc', fontWeight: 700, marginBottom: 6, fontSize: 13 }}>
                        📅 Day {label}
                    </p>
                    {payload.map((entry, index) => (
                        <p key={index} style={{ color: entry.color, fontSize: 13, margin: '2px 0' }}>
                            {entry.name === 'Present' ? '✅' : '❌'} {entry.name}: {entry.value} students
                        </p>
                    ))}
                </div>
            )
        }
        return null
    }

    const CustomPieTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
                    border: 'none',
                    borderRadius: 12,
                    padding: '12px 16px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                }}>
                    <p style={{ color: '#a5b4fc', fontWeight: 700, fontSize: 13 }}>
                        {payload[0].name === 'Present' ? '✅' : '❌'} {payload[0].name}
                    </p>
                    <p style={{ color: '#fff', fontSize: 13 }}>
                        {payload[0].value} days
                    </p>
                </div>
            )
        }
        return null
    }

    const CustomLegend = ({ payload }) => (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 8 }}>
            {payload.map((entry, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                        width: 12, height: 12, borderRadius: 3,
                        backgroundColor: entry.color
                    }} />
                    <span style={{ color: '#6b7280', fontSize: 13, fontWeight: 500 }}>
                        {entry.value}
                    </span>
                </div>
            ))}
        </div>
    )

    if (!attendanceList || attendanceList.length === 0) return null

    return (
        <div className='grid grid-cols-2 gap-5 my-6'>

            {/* BAR CHART */}
            <div style={{
                background: 'white',
                borderRadius: 16,
                padding: '20px 16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                border: '1px solid #f1f5f9'
            }}>
                <div style={{ marginBottom: 16 }}>
                    <h2 style={{ fontWeight: 700, fontSize: 16, color: '#1e1b4b' }}>
                        📊 Daily Attendance
                    </h2>
                    <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
                        {selectedMonth} — Present vs Absent per day
                    </p>
                </div>
                <ResponsiveContainer width='100%' height={260}>
                    <BarChart data={dailyData} barGap={2}>
                        <defs>
                            <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                                <stop offset="100%" stopColor="#818cf8" stopOpacity={0.8} />
                            </linearGradient>
                            <linearGradient id="absentGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
                                <stop offset="100%" stopColor="#fb7185" stopOpacity={0.8} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray='3 3' stroke='#f1f5f9' vertical={false} />
                        <XAxis
                            dataKey='day'
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#f8fafc' }} />
                        <Legend content={<CustomLegend />} />
                        <Bar dataKey='Present' fill='url(#presentGrad)' radius={[6, 6, 0, 0]} maxBarSize={18} />
                        <Bar dataKey='Absent' fill='url(#absentGrad)' radius={[6, 6, 0, 0]} maxBarSize={18} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* PIE CHART */}
            <div style={{
                background: 'white',
                borderRadius: 16,
                padding: '20px 16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                border: '1px solid #f1f5f9'
            }}>
                <div style={{ marginBottom: 16 }}>
                    <h2 style={{ fontWeight: 700, fontSize: 16, color: '#1e1b4b' }}>
                        🗓️ Monthly Attendance
                    </h2>
                    <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
                        {selectedMonth} — Overall attendance breakdown
                    </p>
                </div>
                <ResponsiveContainer width='100%' height={260}>
                    <PieChart>
                        <defs>
                            <linearGradient id="piePresent" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#6366f1" />
                                <stop offset="100%" stopColor="#818cf8" />
                            </linearGradient>
                            <linearGradient id="pieAbsent" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#f43f5e" />
                                <stop offset="100%" stopColor="#fb7185" />
                            </linearGradient>
                        </defs>
                        <Pie
                            data={monthlyData}
                            cx='50%'
                            cy='50%'
                            innerRadius={70}
                            outerRadius={110}
                            dataKey='value'
                            paddingAngle={3}
                            label={({ name, percent }) =>
                                `${name} ${(percent * 100).toFixed(1)}%`
                            }
                            labelLine={{ stroke: '#94a3b8' }}
                        >
                            <Cell fill='url(#piePresent)' />
                            <Cell fill='url(#pieAbsent)' />
                        </Pie>
                        <Tooltip content={<CustomPieTooltip />} />
                        <Legend content={<CustomLegend />} />
                    </PieChart>
                </ResponsiveContainer>
            </div>

        </div>
    )
}

export default AttendanceChart