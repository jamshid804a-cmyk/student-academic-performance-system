"use client"
import React, { useMemo } from "react"

export default function YearSelection({ selectedYear, defaultYear }) {
  // Generate years from 2025 → current year + 10
  const years = useMemo(() => {
    const start = 2025
    const current = new Date().getFullYear()
    const end = Math.max(current + 10, 2035)
    const list = []
    for (let y = start; y <= end; y++) list.push(y)
    return list
  }, [])

  return (
    <select
      value={defaultYear || ""}
      className="border rounded-lg px-3 py-2 bg-white text-sm outline-none focus:border-purple-500"
      onChange={(e) => selectedYear(e.target.value)}
    >
      <option value="">All Years</option>
      {years.map((y) => (
        <option key={y} value={String(y)}>{y}</option>
      ))}
    </select>
  )
}