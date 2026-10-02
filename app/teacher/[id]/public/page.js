"use client"
import React, { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  Loader2, GraduationCap, ClipboardCheck, FlaskConical, FileText,
  User, BookOpen, Library,
} from "lucide-react"
import GlobalApi from "@/app/_services/GlobalApi"

export default function TeacherPublicPage() {
  const params = useParams()
  const token = params?.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [teacher, setTeacher] = useState(null)
  const [students, setStudents] = useState([])

  useEffect(() => {
    if (!token) return
    (async () => {
      try {
        const resp = await GlobalApi.GetPublicTeacher(token)
        if (resp.data?.teacher) {
          setTeacher(resp.data.teacher)
          setStudents(resp.data.students || [])
        } else {
          setError("Invalid or expired link")
        }
      } catch (err) {
        console.error(err)
        const msg = err?.response?.data?.error || "Could not load teacher information"
        setError(msg)
      } finally {
        setLoading(false)
      }
    })()
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
          <p className="mt-3 text-slate-500 text-sm">Loading your portal...</p>
        </div>
      </div>
    )
  }

  if (error || !teacher) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 mx-auto flex items-center justify-center mb-4">
            <User size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Link Not Valid</h2>
          <p className="text-sm text-slate-500 mt-2">
            {error || "This link is invalid or has been regenerated."}
          </p>
          <p className="text-xs text-slate-400 mt-4">
            Please contact your administrator for a fresh link.
          </p>
        </div>
      </div>
    )
  }

  const isAcademy = teacher.program === "academy"

  // Format teacher's classes / courses
  const classChips = Array.isArray(teacher.classes) && teacher.classes.length > 0
    ? teacher.classes
    : []

  // Academy: only Attendance for now
  // School: Attendance + Testing + Examination
  const sections = isAcademy
    ? [
        {
          title: "Attendance",
          description: "Mark daily student attendance for your courses",
          icon: ClipboardCheck,
          color: "sky",
          href: `/teacher/${token}/attendance`,
        },
      ]
    : [
        {
          title: "Attendance",
          description: "Mark daily student attendance for your classes",
          icon: ClipboardCheck,
          color: "sky",
          href: `/teacher/${token}/attendance`,
        },
        {
          title: "Testing",
          description: "Enter monthly, weekly, and daily test marks",
          icon: FlaskConical,
          color: "indigo",
          href: `/teacher/${token}/testing`,
        },
        {
          title: "Examination",
          description: "Enter Mid Term and Final Term exam marks",
          icon: FileText,
          color: "purple",
          href: `/teacher/${token}/examination`,
        },
      ]

  const colorMap = {
    sky: "from-sky-500 to-cyan-600",
    indigo: "from-indigo-500 to-purple-600",
    purple: "from-purple-500 to-pink-600",
  }

  // Theme colors
  const headerBg = isAcademy
    ? "bg-gradient-to-r from-purple-700 via-fuchsia-700 to-pink-700"
    : "bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-700"

  const bodyBg = isAcademy
    ? "bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50"
    : "bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50"

  return (
    <div className={`min-h-screen ${bodyBg}`}>
      {/* Header */}
      <div className={`${headerBg} text-white`}>
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center">
              {isAcademy ? <Library size={32} /> : <GraduationCap size={32} />}
            </div>
            <div>
              <p className="text-white/80 text-xs font-semibold uppercase tracking-widest">
                {isAcademy ? "Academy Teacher Portal" : "Teacher Portal"}
              </p>
              <h1 className="text-3xl font-bold mt-1">{teacher.name}</h1>
              <p className="text-white/90 text-sm mt-1">
                {teacher.teacherId}
                {teacher.subject ? ` · ${teacher.subject}` : ""}
                {teacher.qualification ? ` · ${teacher.qualification}` : ""}
              </p>
            </div>
          </div>

          {/* Class / Course chips */}
          {classChips.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-5">
              <span className="text-xs font-semibold text-white/80 mr-1 self-center">
                {isAcademy ? "Assigned Courses:" : "Assigned Classes:"}
              </span>
              {classChips.map((c, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-lg bg-white/15 border border-white/25 text-xs font-bold"
                >
                  {isAcademy ? (c.course || c.grade) : c.grade}
                  {c.section ? ` - ${c.section}` : ""}
                  {isAcademy && c.batchNo ? ` · ${c.batchNo}` : ""}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-800">
            {isAcademy ? "Your Sections" : "Your Sections"}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Open any section to manage your {isAcademy ? "courses" : "classes"}.
          </p>
        </div>

        <div className={`grid grid-cols-1 gap-5 ${isAcademy ? "md:grid-cols-1 max-w-md" : "md:grid-cols-3"}`}>
          {sections.map((s) => {
            const Icon = s.icon
            return (
              <Link
                key={s.title}
                href={s.href}
                className="group bg-white rounded-2xl shadow-md hover:shadow-2xl border border-slate-100 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
              >
                <div className={`h-1.5 bg-gradient-to-r ${colorMap[s.color]}`} />
                <div className="p-6">
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colorMap[s.color]} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}
                  >
                    <Icon size={26} />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-slate-800">
                    {s.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                    {s.description}
                  </p>
                  <div className={`mt-4 text-xs font-semibold ${isAcademy ? "text-purple-600" : "text-indigo-600"} group-hover:translate-x-1 transition-transform`}>
                    Open →
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Students summary */}
        <div className="mt-10 bg-white rounded-2xl shadow-md border border-slate-100 p-6">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${isAcademy ? "bg-purple-50 text-purple-600" : "bg-indigo-50 text-indigo-600"} flex items-center justify-center`}>
              <BookOpen size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
                {students.length} student{students.length === 1 ? "" : "s"} in your {isAcademy ? "courses" : "classes"}
              </p>
              <p className="text-xs text-slate-500">
                These students appear in Attendance{isAcademy ? "" : ", Testing, and Examination"}.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-slate-400 py-8">
          {isAcademy ? "Academy Teacher Portal" : "Teacher Portal"} · Secure link · Do not share this URL publicly
        </div>
      </div>
    </div>
  )
}