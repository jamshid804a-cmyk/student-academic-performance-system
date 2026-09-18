"use client"
export const dynamic = 'force-dynamic'

import React from 'react'

export default function AcademicPerformance() {
  return (
    <div className="p-7">
      <h2 className="text-2xl font-bold mb-2">Academic Performance</h2>
      <p className="text-slate-500">
        Select <b>Testing</b> or <b>Examination</b> from the sidebar.
      </p>
    </div>
  )
}