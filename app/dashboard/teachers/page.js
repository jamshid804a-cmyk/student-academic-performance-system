"use client"

import React, { useEffect, useState, useCallback } from "react"
import dynamic from "next/dynamic"
import {
  LoaderIcon,
  Users,
  UserPlus,
  Search,
  Calendar,
  ClipboardCheck,
} from "lucide-react"
import GlobalApi from "@/app/_services/GlobalApi"
import { toast } from "sonner"

const AddNewTeacher = dynamic(() => import("./_components/AddNewTeacher"), { ssr: false })
const TeacherListTable = dynamic(() => import("./_components/TeacherListTable"), { ssr: false })
const EditTeacherDialog = dynamic(() => import("./_components/EditTeacherDialog"), { ssr: false })
const TeacherDetailsDialog = dynamic(() => import("./_components/TeacherDetailsDialog"), { ssr: false })
const TeacherAttendanceGrid = dynamic(() => import("./_components/TeacherAttendanceGrid"), { ssr: false })

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
]

const monthNameToKey = (name) => {
  const map = {
    January: "01", February: "02", March: "03", April: "04",
    May: "05", June: "06", July: "07", August: "08",
    September: "09", October: "10", November: "11", December: "12",
  }
  return `${map[name]}/${new Date().getFullYear()}`
}

export default function TeachersPage() {
  const [activeTab, setActiveTab] = useState("teachers")

  // Teacher list state
  const [teachers, setTeachers] = useState([])
  const [loadingTeachers, setLoadingTeachers] = useState(true)
  const [searchInput, setSearchInput] = useState("")

  // Dialog state
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editTeacher, setEditTeacher] = useState(null)
  const [viewTeacher, setViewTeacher] = useState(null)

  // Attendance tab state
  const [attendanceMonth, setAttendanceMonth] = useState("")
  const [teacherAttendance, setTeacherAttendance] = useState([])
  const [loadingAttendance, setLoadingAttendance] = useState(false)

  // Load teachers
  const loadTeachers = useCallback(async () => {
    setLoadingTeachers(true)
    try {
      const resp = await GlobalApi.GetAllTeachers()
      setTeachers(resp.data || [])
    } catch (err) {
      console.error(err)
      toast.error("Failed to load teachers")
    }
    setLoadingTeachers(false)
  }, [])

  useEffect(() => {
    loadTeachers()
  }, [loadTeachers])

  // Load teacher attendance when month changes
  useEffect(() => {
    if (!attendanceMonth || activeTab !== "attendance") return
    const load = async () => {
      setLoadingAttendance(true)
      try {
        const monthKey = monthNameToKey(attendanceMonth)
        const resp = await GlobalApi.GetTeacherAttendance(monthKey)
        setTeacherAttendance(resp.data || [])
      } catch (err) {
        console.error(err)
        toast.error("Failed to load teacher attendance")
      }
      setLoadingAttendance(false)
    }
    load()
  }, [attendanceMonth, activeTab])

  // Regenerate public token — used by the 🔗 button
  const handleRegenerateLink = async (teacher) => {
    try {
      const resp = await GlobalApi.RegenerateTeacherToken(teacher._id)
      const newToken = resp.data?.publicToken
      if (!newToken) throw new Error("No token returned")

      const url = `${window.location.origin}/teacher/${newToken}/public`

      // Update local list
      setTeachers((prev) =>
        prev.map((t) =>
          t._id === teacher._id ? { ...t, publicToken: newToken } : t
        )
      )

      // Copy to clipboard
      try {
        await navigator.clipboard.writeText(url)
        toast.success("New link generated and copied to clipboard")
      } catch {
        toast.success("New link generated")
        window.prompt("Copy this link:", url)
      }

      return url
    } catch (err) {
      console.error(err)
      toast.error("Failed to regenerate link")
      return null
    }
  }

  // Copy existing link (without regenerating)
  const handleCopyLink = async (teacher) => {
    if (!teacher.publicToken) {
      toast.error("No link yet — click the link icon to generate one")
      return
    }
    const url = `${window.location.origin}/teacher/${teacher.publicToken}/public`
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Link copied to clipboard")
    } catch {
      window.prompt("Copy this link:", url)
    }
  }

  // WhatsApp share
  const handleWhatsApp = (teacher) => {
    if (!teacher.publicToken) {
      toast.error("Generate the link first")
      return
    }
    const url = `${window.location.origin}/teacher/${teacher.publicToken}/public`
    const phone = String(teacher.phone || "").replace(/[^\d]/g, "")
    const text = encodeURIComponent(
      `Dear ${teacher.name}, here is your teacher portal link:\n${url}\n\n` +
      `You can mark student attendance, enter test & exam marks from this link.`
    )
    const waUrl = phone
      ? `https://wa.me/${phone}?text=${text}`
      : `https://wa.me/?text=${text}`
    window.open(waUrl, "_blank")
  }

  const filteredTeachers = teachers.filter((t) => {
    if (!searchInput.trim()) return true
    const q = searchInput.toLowerCase()
    return (
      String(t.name || "").toLowerCase().includes(q) ||
      String(t.teacherId || "").toLowerCase().includes(q) ||
      String(t.email || "").toLowerCase().includes(q) ||
      String(t.subject || "").toLowerCase().includes(q)
    )
  })

  return (
    <div className="p-7 animate-page-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md">
          <Users size={24} />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Teachers</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage teaching staff & their attendance
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab("teachers")}
          className={`px-5 py-3 text-sm font-bold rounded-t-xl transition-all flex items-center gap-2 ${
            activeTab === "teachers"
              ? "bg-indigo-600 text-white shadow-md"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          }`}
        >
          <Users size={16} />
          Teachers
        </button>
        <button
          onClick={() => setActiveTab("attendance")}
          className={`px-5 py-3 text-sm font-bold rounded-t-xl transition-all flex items-center gap-2 ${
            activeTab === "attendance"
              ? "bg-emerald-600 text-white shadow-md"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          }`}
        >
          <ClipboardCheck size={16} />
          Teacher Attendance
        </button>
      </div>

      {/* ============ TEACHERS TAB ============ */}
      {activeTab === "teachers" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <button
              onClick={() => setShowAddDialog(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600
                hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-bold shadow-md
                transition-all hover:scale-[1.03]"
            >
              <UserPlus size={18} />
              Add New Teacher
            </button>

            <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 shadow-sm bg-white dark:bg-slate-800 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-900/40 transition-all">
              <Search size={16} className="text-slate-400" />
              <input
                type="text"
                placeholder="Search teacher..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="outline-none text-sm w-56 bg-transparent text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
              />
            </div>
          </div>

          {loadingTeachers ? (
            <div className="flex justify-center py-16 text-slate-400">
              <LoaderIcon className="animate-spin mr-2" /> Loading teachers...
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-500 mx-auto flex items-center justify-center mb-4">
                <Users size={28} />
              </div>
              <p className="text-base font-semibold text-slate-700 dark:text-slate-200">
                {teachers.length === 0 ? "No teachers yet" : "No matches"}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {teachers.length === 0
                  ? 'Click "Add New Teacher" to add your first teacher.'
                  : "Try a different search."}
              </p>
            </div>
          ) : (
            <TeacherListTable
              teachers={filteredTeachers}
              onEdit={(t) => setEditTeacher(t)}
              onView={(t) => setViewTeacher(t)}
              onCopyLink={handleCopyLink}
              onRegenerateLink={handleRegenerateLink}
              onWhatsApp={handleWhatsApp}
              onDeleted={loadTeachers}
            />
          )}
        </>
      )}

      {/* ============ ATTENDANCE TAB ============ */}
      {activeTab === "attendance" && (
        <>
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-5 mb-5">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-slate-500" />
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Month
                </label>
              </div>
              <select
                value={attendanceMonth}
                onChange={(e) => setAttendanceMonth(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm outline-none focus:border-emerald-500"
              >
                <option value="">Select Month</option>
                {MONTHS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {!attendanceMonth ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/40 text-emerald-500 mx-auto flex items-center justify-center mb-4">
                <ClipboardCheck size={28} />
              </div>
              <p className="text-base font-semibold text-slate-700 dark:text-slate-200">
                Select a month
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Choose a month above to mark teacher attendance.
              </p>
            </div>
          ) : loadingAttendance ? (
            <div className="flex justify-center py-16 text-slate-400">
              <LoaderIcon className="animate-spin mr-2" /> Loading attendance...
            </div>
          ) : (
            <TeacherAttendanceGrid
              teachers={teachers}
              month={monthNameToKey(attendanceMonth)}
              monthLabel={attendanceMonth}
              attendance={teacherAttendance}
              onSaved={async () => {
                const resp = await GlobalApi.GetTeacherAttendance(
                  monthNameToKey(attendanceMonth)
                )
                setTeacherAttendance(resp.data || [])
              }}
            />
          )}
        </>
      )}

      {/* Dialogs */}
      {showAddDialog && (
        <AddNewTeacher
          onClose={() => setShowAddDialog(false)}
          onSaved={() => {
            setShowAddDialog(false)
            loadTeachers()
          }}
        />
      )}

      {editTeacher && (
        <EditTeacherDialog
          teacher={editTeacher}
          onClose={() => setEditTeacher(null)}
          onSaved={() => {
            setEditTeacher(null)
            loadTeachers()
          }}
        />
      )}

      {viewTeacher && (
        <TeacherDetailsDialog
          teacher={viewTeacher}
          onClose={() => setViewTeacher(null)}
        />
      )}
    </div>
  )
}