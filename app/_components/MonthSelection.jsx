"use client"
import React from 'react'

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

const monthNameToKey = (name) => {
  const map = {
    January: "01", February: "02", March: "03", April: "04",
    May: "05", June: "06", July: "07", August: "08",
    September: "09", October: "10", November: "11", December: "12",
  }
  return map[name] || "01"
}

const keyToMonthName = (key) => {
  const map = {
    "01": "January", "02": "February", "03": "March", "04": "April",
    "05": "May", "06": "June", "07": "July", "08": "August",
    "09": "September", "10": "October", "11": "November", "12": "December",
  }
  return map[key] || ""
}

export default function MonthSelection({ selectedMonth, defaultMonth }) {
  // defaultMonth may be "04/2026" — extract the month name
  const currentName = defaultMonth
    ? keyToMonthName(String(defaultMonth).split("/")[0])
    : ""

  const handleChange = (e) => {
    const name = e.target.value
    if (!name) {
      selectedMonth("")
      return
    }
    const monthKey = `${monthNameToKey(name)}/${new Date().getFullYear()}`
    selectedMonth(monthKey)
  }

  return (
    <select
      className="border rounded-lg px-3 py-2 bg-white text-sm outline-none focus:border-blue-500"
      value={currentName}
      onChange={handleChange}
    >
      <option value="">Select Month</option>
      {MONTHS.map((m) => (
        <option key={m} value={m}>{m}</option>
      ))}
    </select>
  )
}