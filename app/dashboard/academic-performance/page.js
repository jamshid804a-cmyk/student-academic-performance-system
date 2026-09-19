"use client"

import React from 'react'
import Link from 'next/link'
import { BookOpen, FlaskConical, FileText } from 'lucide-react'

export default function AcademicPerformance() {
  return (
    <div className="p-7">

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
          <BookOpen size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Academic Performance
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage testing and examination records
          </p>
        </div>
      </div>

      {/* Two big cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl">

        {/* Testing card */}
        <Link href="/dashboard/academic-performance/testing">
          <div className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer h-full">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <FlaskConical size={26} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
              Testing
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Monthly, Weekly, and Daily test marks management
            </p>
          </div>
        </Link>

        {/* Examination card */}
        <Link href="/dashboard/academic-performance/examination">
          <div className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-700 transition-all cursor-pointer h-full">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <FileText size={26} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
              Examination
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Mid Term and Final Term examination results
            </p>
          </div>
        </Link>

      </div>
    </div>
  )
}