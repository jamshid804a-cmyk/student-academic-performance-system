"use client"
import React, { useMemo } from "react"

export default function YearSelection({ selectedYear, defaultYear }) {
  const years = useMemo(() => {
    const START = 2025
    const END = new Date().getFullYear() + 30
    const list = []
    for (let y = START; y <= END; y++) list.push(String(y))
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
        <option key={y} value={y}>{y}</option>
      ))}
    </select>
  )
}