"use client"
import React, { useEffect, useState } from 'react'
import moment from 'moment'
import dynamic from 'next/dynamic'

const BarChart = dynamic(() => import('recharts').then(m => m.BarChart), { ssr: false })
const Bar = dynamic(() => import('recharts').then(m => m.Bar), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false })
const Legend = dynamic(() => import('recharts').then(m => m.Legend), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false })
const PieChart = dynamic(() => import('recharts').then(m => m.PieChart), { ssr: false })
const Pie = dynamic(() => import('recharts').then(m => m.Pie), { ssr: false })
const Cell = dynamic(() => import('recharts').then(m => m.Cell), { ssr: false })

const monthNameToKey = (name) => {
  const map = {
    January: "01", February: "02", March: "03", April: "04",
    May: "05", June: "06", July: "07", August: "08",
    September: "09", October: "10", November: "11", December: "12",
  }
  return map[name] || null
}

const getMonthKey = (selectedMonth) => {
  if (!selectedMonth) return ""
  if (selectedMonth.includes("/")) return selectedMonth
  const num = monthNameToKey(selectedMonth)
  return num ? `${num}/${new Date().getFullYear()}` : ""
}

function AttendanceChart({ attendanceList, selectedMonth }) {
  const [dailyData, setDailyData] = useState([])
  const [monthlyData, setMonthlyData] = useState([])

  useEffect(() => {
    if (Array.isArray(attendanceList) && attendanceList.length > 0 && selectedMonth) {
      processDailyData()
      processMonthlyData()
    } else {
      setDailyData([])
      setMonthlyData([])
    }
  }, [attendanceList, selectedMonth])

  const processDailyData = () => {
    const monthKey = getMonthKey(selectedMonth)
    const totalDays = moment(monthKey, 'MM/YYYY').daysInMonth()
    const uniqueStudents = [...new Set(attendanceList.map(a => a.studentId))]
    const totalStudents = uniqueStudents.length
    const data = []
    for (let day = 1; day <= totalDays; day++) {
      const records = attendanceList.filter(a => Number(a.day) === day)
      const present = records.filter(r => r.status === "P").length
      const absent = records.filter(r => r.status === "A").length
      const leave = records.filter(r => r.status === "L").length
      const unmarked = totalStudents - (present + absent + leave)
      const totalAbsent = absent + (unmarked > 0 ? unmarked : 0)
      data.push({
        day: `${day}`,
        Present: present,
        Absent: totalAbsent,
        Leave: leave,
      })
    }
    setDailyData(data)
  }

  const processMonthlyData = () => {
    let present = 0, absent = 0, leave = 0
    attendanceList.forEach((a) => {
      const s = a.status || (a.present ? "P" : null)
      if (s === "P") present++
      else if (s === "A") absent++
      else if (s === "L") leave++
    })
    const total = present + absent + leave
    const pct = (n) => total > 0 ? Math.round((n / total) * 100) : 0
    setMonthlyData([
      { name: 'Present', value: present, percentage: pct(present), color: '#a855f7' },
      { name: 'Absent', value: absent, percentage: pct(absent), color: '#f43f5e' },
      { name: 'Leave', value: leave, percentage: pct(leave), color: '#f59e0b' },
    ])
  }

  const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const present = payload.find(p => p.name === 'Present')?.value || 0
      const absent = payload.find(p => p.name === 'Absent')?.value || 0
      const leave = payload.find(p => p.name === 'Leave')?.value || 0
      const total = present + absent + leave || 1
      return (
        <div style={{
          background: 'linear-gradient(135deg, #c084fc, #6b21a8)',
          border: 'none', borderRadius: 12, padding: '12px 16px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)', color: 'white',
          fontSize: 13, minWidth: 160,
        }}>
          <p style={{ color: '#e9d5ff', fontWeight: 700, marginBottom: 8, fontSize: 13 }}>
            📅 Day {label}
          </p>
          <p style={{ margin: '3px 0' }}>✅ Present: <b>{present}</b> ({Math.round((present / total) * 100)}%)</p>
          <p style={{ margin: '3px 0' }}>❌ Absent: <b>{absent}</b> ({Math.round((absent / total) * 100)}%)</p>
          <p style={{ margin: '3px 0' }}>🕐 Leave: <b>{leave}</b> ({Math.round((leave / total) * 100)}%)</p>
        </div>
      )
    }
    return null
  }

  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload
      return (
        <div style={{
          background: 'linear-gradient(135deg, #c084fc, #6b21a8)',
          border: 'none', borderRadius: 12, padding: '10px 14px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)', color: 'white', fontSize: 12,
        }}>
          <p style={{ fontWeight: 700 }}>{d.name}</p>
          <p>{d.value} ({d.percentage}%)</p>
        </div>
      )
    }
    return null
  }

  const CustomLegend = ({ payload }) => (
    <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 8, fontSize: 12 }}>
      {payload.map((entry) => (
        <div key={entry.value} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: entry.color }} />
          <span style={{ color: '#64748b' }}>{entry.value}</span>
        </div>
      ))}
    </div>
  )

  const monthLabel = selectedMonth?.includes("/")
    ? moment(selectedMonth, "MM/YYYY").format("MMMM YYYY")
    : selectedMonth

  if (!attendanceList || attendanceList.length === 0) {
    return (
      <div className='grid grid-cols-2 gap-5 my-6'>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <p className="text-sm font-bold text-slate-700">📊 Daily Attendance</p>
          <p className="text-xs text-slate-400 mt-1">
            {selectedMonth ? `No attendance data for ${monthLabel} yet` : "Select course and month to see data"}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <p className="text-sm font-bold text-slate-700">🗓️ Monthly Attendance</p>
          <p className="text-xs text-slate-400 mt-1">
            {selectedMonth ? `No attendance data for ${monthLabel} yet` : "Select course and month to see data"}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className='grid grid-cols-2 gap-5 my-6'>
      <div style={{
        background: 'white', borderRadius: 16, padding: '20px 16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #f1f5f9'
      }}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontWeight: 700, fontSize: 16, color: '#1e1b4b' }}>📊 Daily Attendance</h2>
          <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
            {monthLabel} — Present / Absent / Leave per day
          </p>
        </div>
        <ResponsiveContainer width='100%' height={280}>
          <BarChart data={dailyData} barGap={2}>
            <defs>
              <linearGradient id="acadPresentGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" stopOpacity={1} />
                <stop offset="100%" stopColor="#c084fc" stopOpacity={0.8} />
              </linearGradient>
              <linearGradient id="acadAbsentGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
                <stop offset="100%" stopColor="#fb7185" stopOpacity={0.8} />
              </linearGradient>
              <linearGradient id="acadLeaveGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.8} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray='3 3' stroke='#f1f5f9' vertical={false} />
            <XAxis dataKey='day' tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#f8fafc' }} />
            <Legend content={<CustomLegend />} />
            <Bar dataKey='Present' fill='url(#acadPresentGrad)' radius={[6, 6, 0, 0]} maxBarSize={14} />
            <Bar dataKey='Absent' fill='url(#acadAbsentGrad)' radius={[6, 6, 0, 0]} maxBarSize={14} />
            <Bar dataKey='Leave' fill='url(#acadLeaveGrad)' radius={[6, 6, 0, 0]} maxBarSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{
        background: 'white', borderRadius: 16, padding: '20px 16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #f1f5f9'
      }}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontWeight: 700, fontSize: 16, color: '#1e1b4b' }}>🗓️ Monthly Attendance</h2>
          <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
            {monthLabel} — Present / Absent / Leave breakdown
          </p>
        </div>
        <ResponsiveContainer width='100%' height={280}>
          <PieChart>
            <defs>
              <linearGradient id="acadPiePresent" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#c084fc" />
              </linearGradient>
              <linearGradient id="acadPieAbsent" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="100%" stopColor="#fb7185" />
              </linearGradient>
              <linearGradient id="acadPieLeave" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>
            </defs>
            <Pie
              data={monthlyData}
              cx='50%' cy='50%'
              innerRadius={70} outerRadius={110}
              dataKey='value' paddingAngle={3}
              label={({ name, percentage }) => `${name} ${percentage}%`}
              labelLine={{ stroke: '#94a3b8' }}
            >
              <Cell fill='url(#acadPiePresent)' />
              <Cell fill='url(#acadPieAbsent)' />
              <Cell fill='url(#acadPieLeave)' />
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