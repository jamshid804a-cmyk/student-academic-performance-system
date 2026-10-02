"use client"
import React from "react"

const BATCHES = Array.from({ length: 20 }, (_, i) => `Batch ${i + 1}`)

export default function BatchSelection({ selectedBatch, defaultBatch }) {
  return (
    <select
      value={defaultBatch || ""}
      className="border rounded-lg px-3 py-2 bg-white text-sm outline-none focus:border-purple-500"
      onChange={(e) => selectedBatch(e.target.value)}
    >
      <option value="">All Batches</option>
      {BATCHES.map((b) => (
        <option key={b} value={b}>{b}</option>
      ))}
    </select>
  )
}