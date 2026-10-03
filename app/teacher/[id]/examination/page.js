"use client"

import React, { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Loader2, ArrowLeft, FileText } from "lucide-react"
import { Toaster } from "sonner"
import GlobalApi from "@/app/_services/GlobalApi"
import ExaminationModule from "@/components/ExaminationModule"
import TeacherAcademyExaminationModule from "@/components/TeacherAcademyExaminationModule"

export default function TeacherExaminationPage() {
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
        <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
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
            className="inline-block mt-4 text-purple-600 font-semibold text-sm"
          >
            ← Back to portal
          </Link>
        </div>
      </div>
    )
  }

  const isAcademy = teacher.program === "academy"
  const allowedClasses = Array.isArray(teacher.classes) ? teacher.classes : []

  if (isAcademy) {
    return (
      <>
        <Toaster position="top-center" richColors />
        <div className="min-h-screen bg-slate-50">
          <div className="max-w-6xl mx-auto px-4 pt-6">
            <Link
              href={`/teacher/${token}/public`}
              className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4"
            >
              <ArrowLeft size={14} /> Back to portal
            </Link>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 text-white flex items-center justify-center shadow-md">
                <FileText size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Academy Examination</h1>
                <p className="text-sm text-slate-500">
                  {teacher.name} · {teacher.teacherId}
                </p>
              </div>
            </div>
          </div>
          <TeacherAcademyExaminationModule teacher={teacher} token={token} />
        </div>
      </>
    )
  }

  return (
    <>
      <Toaster position="top-center" richColors />
      <ExaminationModule teacherMode={true} allowedClasses={allowedClasses} teacherName={teacher.name} />
    </>
  )
}