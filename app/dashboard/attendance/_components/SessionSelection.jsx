"use client"
import React from 'react'

const SESSIONS = Array.from({ length: 100 }, (_, i) => {
  const start = 2025 + i
  return `${start}-${start + 1}`
})

export default function SessionSelection({ selectedSession, defaultSession }) {
  return (
    <select
      className="border rounded-lg px-3 py-2 bg-white text-sm outline-none focus:border-blue-500"
      value={defaultSession || ""}
      onChange={(e) => selectedSession(e.target.value)}
    >
      <option value="">All Sessions</option>
      {SESSIONS.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  )
}