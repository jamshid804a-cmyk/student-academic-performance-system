"use client"
export const dynamic = 'force-dynamic'

import React from 'react'
import { FileText } from 'lucide-react'

export default function ExaminationPage() {
  return (
    <div className="p-7">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center shadow-md">
          <FileText size={22} />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Examination</h2>
          <p className="text-sm text-slate-500">Mid term and final term records</p>
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-10 text-center text-slate-400">
        Examination section — coming soon.
      </div>
    </div>
  )
}