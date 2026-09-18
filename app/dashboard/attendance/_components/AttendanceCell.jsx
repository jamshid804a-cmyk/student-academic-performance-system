"use client"
import React from "react"

// Cycle order: null -> P -> A -> L -> null
const CYCLE = [null, "P", "A", "L"]

const COLORS = {
  P: { bg: "#dcfce7", text: "#166534", label: "P" }, // green
  A: { bg: "#fee2e2", text: "#991b1b", label: "A" }, // red
  L: { bg: "#fef3c7", text: "#92400e", label: "L" }, // yellow
}

export default function AttendanceCell({ value, studentId, day, onChange }) {
  const handleClick = () => {
    const currentIndex = CYCLE.indexOf(value ?? null)
    const next = CYCLE[(currentIndex + 1) % CYCLE.length]
    onChange(studentId, day, next)
  }

  const style = value
    ? { backgroundColor: COLORS[value].bg, color: COLORS[value].text }
    : { backgroundColor: "#ffffff", color: "#cbd5e1", borderColor: "#e5e7eb" }

  return (
    <button
      type="button"
      onClick={handleClick}
      style={style}
      title={
        value === "P" ? "Present" :
        value === "A" ? "Absent" :
        value === "L" ? "Leave" :
        "Empty (click to mark)"
      }
      className="w-7 h-7 rounded-md text-xs font-bold border flex items-center justify-center cursor-pointer transition-all hover:scale-110 hover:shadow-sm"
    >
      {value || "·"}
    </button>
  )
}