"use client"
import React, { useMemo } from "react"

export default function YearSelection({ selectedYear, defaultYear }) {
  // Generate years from 2025 → current year + 30 (auto-grows each year)
  const years = useMemo(() => {
    const START = 2025
    const currentYear = new Date().getFullYear()
    const END = currentYear + 30
    const list = []
    for (let y = START; y <= END; y++) list.push(y)
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