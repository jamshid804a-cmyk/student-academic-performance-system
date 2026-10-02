"use client"
import React, { useEffect, useState } from "react"

export default function CourseSelection({ email, selectedCourse, defaultCourse }) {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!email) return
    fetch(`/api/academy/courses?email=${encodeURIComponent(email)}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d.success) setCourses(d.courses || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [email])

  const grouped = courses.reduce((acc, c) => {
    const cat = c.category || "Other"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(c)
    return acc
  }, {})

  return (
    <select
      value={defaultCourse || ""}
      className="border rounded-lg px-3 py-2 bg-white text-sm outline-none focus:border-purple-500 min-w-[180px]"
      onChange={(e) => selectedCourse(e.target.value)}
      disabled={loading}
    >
      <option value="">{loading ? "Loading…" : "Select Course"}</option>
      {Object.keys(grouped).sort().map((cat) => (
        <optgroup key={cat} label={cat}>
          {grouped[cat].map((c) => (
            <option key={c._id} value={c.name}>{c.name}</option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}