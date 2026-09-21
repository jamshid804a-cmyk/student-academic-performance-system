"use client"
import React from 'react'

const GRADES = [
  "Nursery",
  "Prep",
  "1st", "2nd", "3rd", "4th", "5th",
  "6th", "7th", "8th", "9th", "10th",
  "11th", "12th",
]

export default function GradeSelection({ selectedGrade, defaultGrade }) {
  return (
    <select
      className="border rounded-lg px-3 py-2 bg-white text-sm outline-none focus:border-blue-500"
      value={defaultGrade || ""}
      onChange={(e) => selectedGrade(e.target.value)}
    >
      <option value="">Select Grade</option>
      {GRADES.map((g) => (
        <option key={g} value={g}>{g}</option>
      ))}
    </select>
  )
}