"use client"
import React, { useEffect, useRef, useState } from "react"

const COLORS = {
  P: { bg: "#dcfce7", text: "#166534" }, // green
  A: { bg: "#fee2e2", text: "#991b1b" }, // red
  L: { bg: "#fef3c7", text: "#92400e" }, // amber
}

export default function AttendanceCell({ value, studentId, day, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  const pick = (status) => {
    onChange(studentId, day, status)
    setOpen(false)
  }

  const style = value
    ? { backgroundColor: COLORS[value].bg, color: COLORS[value].text }
    : { backgroundColor: "#ffffff", color: "#cbd5e1" }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        style={style}
        className="w-7 h-7 rounded-md text-xs font-bold border border-gray-200 flex items-center justify-center cursor-pointer hover:border-blue-400"
      >
        {value || "—"}
      </button>

      {open && (
        <div className="absolute z-50 top-8 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-1 flex gap-1">
          <button
            onClick={() => pick("P")}
            className="w-7 h-7 rounded-md text-xs font-bold bg-green-100 text-green-800 hover:bg-green-200"
          >
            P
          </button>
          <button
            onClick={() => pick("A")}
            className="w-7 h-7 rounded-md text-xs font-bold bg-red-100 text-red-800 hover:bg-red-200"
          >
            A
          </button>
          <button
            onClick={() => pick("L")}
            className="w-7 h-7 rounded-md text-xs font-bold bg-amber-100 text-amber-800 hover:bg-amber-200"
          >
            L
          </button>
          <button
            onClick={() => pick(null)}
            title="Clear"
            className="w-7 h-7 rounded-md text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            —
          </button>
        </div>
      )}
    </div>
  )
}