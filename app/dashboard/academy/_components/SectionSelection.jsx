"use client"
import React from "react"

const SECTIONS = ["A", "B", "C"]

export default function SectionSelection({ selectedSection, defaultSection }) {
  return (
    <select
      value={defaultSection || ""}
      className="border rounded-lg px-3 py-2 bg-white text-sm outline-none focus:border-purple-500"
      onChange={(e) => selectedSection(e.target.value)}
    >
      <option value="">All Sections</option>
      {SECTIONS.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  )
}