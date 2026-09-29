"use client"

import React, { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Loader2, ArrowLeft, ClipboardCheck } from "lucide-react"
import GlobalApi from "@/app/_services/GlobalApi"
import AttendanceModule from "@/components/AttendanceModule"

export default function TeacherAttendancePage() {
  const params = useParams()
  const token = params?.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [teacher, setTeacher] = useState(null)

  useEffect(() => {
    if (!token) return
    ;(async () => {
      try {
        const resp = await GlobalApi.GetPublicTeacher(token)
        if (resp.data?.teacher) {
          setTeacher(resp.data.teacher)
        } else {
          setError("Invalid link")
        }
      } catch (err) {
        console.error(err)
        setError(err?.response?.data?.error || "Could not load data")
      } finally {
        setLoading(false)
      }
    })()
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    )
  }

  if (error || !teacher) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
          <p className="text-lg font-bold text-slate-800">Link Not Valid</p>
          <p className="text-sm text-slate-500 mt-2">{error}</p>
          <Link
            href={`/teacher/${token}/public`}
            className="inline-block mt-4 text-indigo-600 font-semibold text-sm"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-600 to-cyan-700 text-white">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center gap-3">
          <Link
            href={`/teacher/${token}/public`}
            className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
              <ClipboardCheck size={22} />
            </div>
            <div>
              <p className="text-xs text-sky-100 font-semibold uppercase tracking-widest">
                Attendance
              </p>
              <h1 className="text-xl font-bold">{teacher.name}</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Module */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-5">
          <AttendanceModule
            teacherMode={true}
            allowedClasses={teacher.classes || []}
            teacherName={teacher.name}
            storageKey={`teacher_attendance_filters_${teacher._id}`}
          />
        </div>
      </div>
    </div>
  )
}