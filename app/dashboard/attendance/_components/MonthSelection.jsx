"use client"
import React from 'react'

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

export default function MonthSelection({ selectedMonth, defaultMonth }) {
  return (
    <select
      className="border rounded-lg px-3 py-2 bg-white text-sm outline-none focus:border-blue-500"
      value={defaultMonth || ""}
      onChange={(e) => selectedMonth(e.target.value)}
    >
      <option value="">Select Month</option>
      {MONTHS.map((m) => (
        <option key={m} value={m}>{m}</option>
      ))}
    </select>
  )
}