"use client"
import React, { useEffect, useMemo, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  Loader2,
  ArrowLeft,
  FileText,
  Search,
  Users,
  Send,
} from "lucide-react"
import GlobalApi from "@/app/_services/GlobalApi"
import { toast } from "sonner"

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
]
const EXAM_TYPES = ["Mid Term", "Final Term"]

const monthNameToKey = (name) => {
  const map = {
    January: "01", February: "02", March: "03", April: "04",
    May: "05", June: "06", July: "07", August: "08",
    September: "09", October: "10", November: "11", December: "12",
  }
  return `${map[name]}/${new Date().getFullYear()}`
}

export default function TeacherExaminationPage() {
  const params = useParams()
  const token = params?.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [teacher, setTeacher] = useState(null)
  const [students, setStudents] = useState([])
  const [subjects, setSubjects] = useState([])
  const [exams, setExams] = useState({}) // { "studentId__subject": {obtained,total,percentage} }

  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()])
  const [examType, setExamType] = useState("Mid Term")
  const [searchInput, setSearchInput] = useState("")

  useEffect(() => {
    if (!token) return
    ;(async () => {
      try {
        const resp = await GlobalApi.GetPublicTeacher(token)
        if (!resp.data?.teacher) {
          setError("Invalid link")
          setLoading(false)
          return
        }
        setTeacher(resp.data.teacher)
        setStudents(resp.data.students || [])

        const subResp = await GlobalApi.GetAllSubjects()
        setSubjects(subResp.data || [])
      } catch (err) {
        console.error(err)
        setError(err?.response?.data?.error || "Could not load data")
      } finally {
        setLoading(false)
      }
    })()
  }, [token])

  const monthKey = useMemo(() => monthNameToKey(selectedMonth), [selectedMonth])

  const loadExams = useCallback(async () => {
    if (!students.length || !monthKey || !examType) return
    try {
      const all = {}
      const groups = new Map()
      students.forEach((s) => {
        const key = `${s.grade || ""}__${s.section || ""}`
        if (!groups.has(key)) groups.set(key, { grade: s.grade, section: s.section })
      })

      await Promise.all(
        Array.from(groups.values()).map(async (g) => {
          try {
            const resp = await GlobalApi.GetExams({
              grade: g.grade,
              section: g.section,
              month: monthKey,
              examType,
            })
            const records = resp.data || []
            records.forEach((r) => {
              all[`${r.studentId}__${r.subject}`] = {
                obtained: r.obtained,
                total: r.total,
                percentage: r.percentage,
              }
            })
          } catch (e) {
            console.error("group exams fetch error", e)
          }
        })
      )
      setExams(all)
    } catch (err) {
      console.error(err)
      toast.error("Failed to load exams")
    }
  }, [students, monthKey, examType])

  useEffect(() => {
    loadExams()
  }, [loadExams])

  const subjectNames = useMemo(() => {
    const names = new Set()
    subjects.forEach((s) => {
      if (s.name) names.add(s.name)
    })
    return Array.from(names).sort()
  }, [subjects])

  const handleMarksChange = async (student, subjectName, field, value) => {
    const key = `${student.id}__${subjectName}`
    const current = exams[key] || { obtained: "", total: "" }
    const obtained = field === "obtained" ? value : current.obtained
    const total = field === "total" ? value : current.total

    const obtNum = obtained === "" ? null : Number(obtained)
    const totNum = total === "" ? null : Number(total)
    if (
      obtNum !== null &&
      totNum !== null &&
      !Number.isNaN(obtNum) &&
      !Number.isNaN(totNum) &&
      obtNum > totNum
    ) {
      toast.error("Obtained cannot be greater than total")
      return
    }

    setExams((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), [field]: value },
    }))

    try {
      await GlobalApi.SaveExam({
        studentId: student.id,
        grade: student.grade,
        section: student.section,
        session: student.session,
        month: monthKey,
        examType,
        subject: subjectName,
        obtained,
        total,
      })
      const resp = await GlobalApi.GetExams({
        grade: student.grade,
        section: student.section,
        month: monthKey,
        examType,
      })
      const map = { ...exams }
      ;(resp.data || []).forEach((r) => {
        map[`${r.studentId}__${r.subject}`] = {
          obtained: r.obtained,
          total: r.total,
          percentage: r.percentage,
        }
      })
      setExams(map)
    } catch (err) {
      console.error(err)
      toast.error("Failed to save")
    }
  }

  const handleSend = async (student) => {
    const low = []
    subjectNames.forEach((name) => {
      const rec = exams[`${student.id}__${name}`]
      if (rec && rec.obtained !== undefined && rec.obtained !== "") {
        const tot = Number(rec.total) || 0
        const pct = tot > 0 ? Math.round((Number(rec.obtained) / tot) * 100) : 0
        if (pct < 50) {
          low.push({ subject: name, obtained: rec.obtained, total: tot, pct })
        }
      }
    })
    if (low.length === 0) {
      toast.info("No subjects below 50%")
      return
    }
    const lines = low.map((s) => `${s.subject}: ${s.obtained}/${s.total} (${s.pct}%)`).join(", ")
    const message = `Dear Parent, your child ${student.name} scored below 50% in: ${lines} for the ${examType} exam in ${selectedMonth}.`
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          message,
          blockNumber: 0,
          weekStart: 0,
          weekEnd: 0,
          type: "examination",
        }),
      })
      toast.success(`Notification sent to ${student.name}'s parent`)
    } catch (err) {
      console.error(err)
      toast.error("Failed to send")
    }
  }

  const filteredStudents = useMemo(() => {
    if (!searchInput.trim()) return students
    const q = searchInput.toLowerCase()
    return students.filter((s) =>
      String(s.name || "").toLowerCase().includes(q)
    )
  }, [students, searchInput])

  const cellPct = (studentId, subj) => {
    const rec = exams[`${studentId}__${subj}`]
    if (!rec || rec.obtained === undefined || rec.obtained === "") return null
    const tot = Number(rec.total) || 0
    if (tot <= 0) return 0
    return rec.percentage ?? Math.round((Number(rec.obtained) / tot) * 100)
  }

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
          <Link href={`/teacher/${token}/public`} className="inline-block mt-4 text-indigo-600 font-semibold text-sm">
            ← Back to home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-700 text-white">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link
              href={`/teacher/${token}/public`}
              className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition"
            >
              <ArrowLeft size={20} />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
                <FileText size={22} />
              </div>
              <div>
                <p className="text-xs text-purple-100 font-semibold uppercase tracking-widest">
                  Examination
                </p>
                <h1 className="text-xl font-bold">{teacher.name}</h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white/15 border border-white/30 text-white text-sm outline-none focus:bg-white/25"
            >
              {MONTHS.map((m) => (
                <option key={m} className="text-slate-800">{m}</option>
              ))}
            </select>
            <select
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white/15 border border-white/30 text-white text-sm outline-none focus:bg-white/25"
            >
              {EXAM_TYPES.map((t) => (
                <option key={t} className="text-slate-800">{t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm bg-white">
            <Search size={16} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search student..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="outline-none text-sm w-48 bg-transparent"
            />
          </div>
          <div className="text-xs text-slate-500">
            {subjectNames.length} subject{subjectNames.length === 1 ? "" : "s"} · {filteredStudents.length} student{filteredStudents.length === 1 ? "" : "s"}
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Users size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-base font-semibold text-slate-700">No students</p>
            <p className="text-sm text-slate-500 mt-1">
              You don't have any students in your classes yet.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-3 py-3 font-bold text-slate-600 uppercase text-[11px] tracking-wider text-left">
                      Student
                    </th>
                    {subjectNames.map((sub) => (
                      <th key={sub} className="px-2 py-3 font-bold text-slate-600 uppercase text-[11px] tracking-wider text-center whitespace-nowrap">
                        {sub}
                      </th>
                    ))}
                    <th className="px-3 py-3 font-bold text-slate-600 uppercase text-[11px] tracking-wider text-center">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s) => (
                    <tr key={s._id || s.id} className="border-b border-slate-100 hover:bg-purple-50/40 transition-colors">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2 min-w-[180px]">
                          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">
                            {String(s.name || "?").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 text-xs truncate">{s.name}</p>
                            <p className="text-[10px] text-slate-400">
                              {s.grade}{s.section ? `-${s.section}` : ""} {s.rollNo ? `· R${s.rollNo}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>

                      {subjectNames.map((sub) => {
                        const rec = exams[`${s.id}__${sub}`]
                        const pct = cellPct(s.id, sub)
                        const danger = pct !== null && pct < 50
                        return (
                          <td key={sub} className="px-2 py-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min="0"
                                value={rec?.obtained ?? ""}
                                onChange={(e) => handleMarksChange(s, sub, "obtained", e.target.value)}
                                placeholder="Obt"
                                className={`w-14 px-1 py-1.5 rounded-lg border text-center text-xs font-bold outline-none transition
                                  ${danger
                                    ? "border-red-400 bg-red-50 text-red-700"
                                    : "border-slate-200 bg-white text-slate-800 focus:border-purple-500"}`}
                              />
                              <span className="text-slate-400 text-xs">/</span>
                              <input
                                type="number"
                                min="0"
                                value={rec?.total ?? ""}
                                onChange={(e) => handleMarksChange(s, sub, "total", e.target.value)}
                                placeholder="Tot"
                                className="w-14 px-1 py-1.5 rounded-lg border border-slate-200 bg-white text-center text-xs font-bold text-slate-800 outline-none focus:border-purple-500"
                              />
                            </div>
                          </td>
                        )
                      })}

                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => handleSend(s)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold
                            bg-purple-600 hover:bg-purple-700 text-white transition-all hover:scale-105"
                        >
                          <Send size={12} /> Send
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
              Enter obtained / total marks. Click <b>Send</b> to notify the parent if any subject is below 50%.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}