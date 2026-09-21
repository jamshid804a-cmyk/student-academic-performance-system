"use client"

import React, { useEffect, useState, useMemo } from 'react'
import { LoaderIcon, FileText, Send, Plus, X, Search } from 'lucide-react'
import GlobalApi from '@/app/_services/GlobalApi'
import { toast } from 'sonner'

const GRADES = [
  "Nursery",
  "Prep",
  "1st", "2nd", "3rd", "4th", "5th",
  "6th", "7th", "8th", "9th", "10th",
  "11th", "12th",
]
const SECTIONS = ["A", "B", "C"]
const SESSIONS = Array.from({ length: 100 }, (_, i) => `${2025 + i}-${2026 + i}`)
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
]
const EXAM_TYPES = ["Mid Term", "Final Term"]

const STORAGE_KEY = "examination_filters_v1"
const EXTRA_KEY = "examination_extra_subjects_v1"     // subjects added ONLY in Examination
const HIDDEN_KEY = "examination_hidden_subjects_v1"   // subjects hidden ONLY in Examination

// Subjects to hide from this page
const HIDDEN_SUBJECTS = ["english", "urdu"]
const isExcluded = (name) => HIDDEN_SUBJECTS.includes(String(name || "").trim().toLowerCase())

const monthNameToKey = (name) => {
  const map = {
    January: "01", February: "02", March: "03", April: "04",
    May: "05", June: "06", July: "07", August: "08",
    September: "09", October: "10", November: "11", December: "12",
  }
  return `${map[name]}/${new Date().getFullYear()}`
}

export default function ExaminationPage() {
  const [grade, setGrade] = useState("")
  const [section, setSection] = useState("")
  const [session, setSession] = useState("")
  const [month, setMonth] = useState("")
  const [examType, setExamType] = useState("Mid Term")

  const [students, setStudents] = useState([])
  const [subjects, setSubjects] = useState([])
  const [exams, setExams] = useState({})
  const [loading, setLoading] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [addingFor, setAddingFor] = useState(null)
  const [newSubjectName, setNewSubjectName] = useState("")
  const [searchInput, setSearchInput] = useState("")

  // Examination-only subject data (never touches the Testing section)
  const [extraSubjects, setExtraSubjects] = useState({})   // { [studentId]: [names] }
  const [hiddenSubjects, setHiddenSubjects] = useState({}) // { [studentId]: [names] }

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
      if (saved.grade) setGrade(saved.grade)
      if (saved.section) setSection(saved.section)
      if (saved.session) setSession(saved.session)
      if (saved.month) setMonth(saved.month)
      if (saved.examType) setExamType(saved.examType)
    } catch {}
    try {
      setExtraSubjects(JSON.parse(localStorage.getItem(EXTRA_KEY) || "{}"))
    } catch {}
    try {
      setHiddenSubjects(JSON.parse(localStorage.getItem(HIDDEN_KEY) || "{}"))
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ grade, section, session, month, examType }))
  }, [grade, section, session, month, examType, hydrated])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(EXTRA_KEY, JSON.stringify(extraSubjects))
  }, [extraSubjects, hydrated])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(hiddenSubjects))
  }, [hiddenSubjects, hydrated])

  const fetchAll = async () => {
    if (!grade || !month || !examType) {
      setStudents([]); setSubjects([]); setExams({}); return
    }
    setLoading(true)
    try {
      const monthKey = monthNameToKey(month)
      const params = { grade }
      if (section) params.section = section
      if (session) params.session = session

      const [studentResp, subjectResp, examResp] = await Promise.all([
        GlobalApi.GetAllStudents(params),
        GlobalApi.GetAllSubjects(),
        GlobalApi.GetExams({ grade, section, session, month: monthKey, examType }),
      ])

      const marks = {}
      ;(examResp.data || []).forEach((e) => {
        marks[`${e.studentId}__${e.subject}`] = {
          obtained: e.obtained, total: e.total, percentage: e.percentage,
        }
      })
      setStudents(studentResp.data || [])
      setSubjects(subjectResp.data || [])
      setExams(marks)
    } catch (err) { console.error(err); toast.error("Failed to load") }
    setLoading(false)
  }

  useEffect(() => {
    if (!hydrated) return
    const t = setTimeout(fetchAll, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line
  }, [grade, section, session, month, examType, hydrated])

  const monthKey = month ? monthNameToKey(month) : ""

  const subjectsByStudent = useMemo(() => {
    const map = {}

    subjects.forEach((s) => {
      const sid = String(s.studentId)
      if (isExcluded(s.name)) return
      if ((hiddenSubjects[sid] || []).includes(s.name)) return
      if (!map[sid]) map[sid] = []
      if (!map[sid].some((x) => x.name === s.name)) map[sid].push({ name: s.name })
    })

    Object.entries(extraSubjects).forEach(([sid, names]) => {
      names.forEach((name) => {
        if (isExcluded(name)) return
        if (!map[sid]) map[sid] = []
        if (!map[sid].some((x) => x.name === name)) map[sid].push({ name })
      })
    })

    return map
  }, [subjects, extraSubjects, hiddenSubjects])

  const subjectColumns = useMemo(() => {
    const names = new Set()
    students.forEach((st) => {
      ;(subjectsByStudent[String(st.id)] || []).forEach((s) => names.add(s.name))
    })
    return Array.from(names).sort()
  }, [students, subjectsByStudent])

  const handleAddSubject = (studentId) => {
    const name = newSubjectName.trim()
    if (!name) return
    if (isExcluded(name)) { toast.error(`"${name}" is hidden on this page`); return }

    const sid = String(studentId)
    const alreadyExists = (subjectsByStudent[sid] || []).some(
      (s) => s.name.toLowerCase() === name.toLowerCase()
    )
    if (alreadyExists) { toast.error("Subject already exists for this student"); return }

    setExtraSubjects((prev) => ({ ...prev, [sid]: [...(prev[sid] || []), name] }))
    setHiddenSubjects((prev) => ({ ...prev, [sid]: (prev[sid] || []).filter((n) => n !== name) }))

    setNewSubjectName(""); setAddingFor(null)
    toast.success("Subject added (Examination only)")
  }

  const handleRemoveSubject = (studentId, subjectName) => {
    if (!confirm(`Remove subject "${subjectName}" from Examination for this student?`)) return
    const sid = String(studentId)

    setExtraSubjects((prev) => ({ ...prev, [sid]: (prev[sid] || []).filter((n) => n !== subjectName) }))
    setHiddenSubjects((prev) => {
      const list = prev[sid] || []
      return list.includes(subjectName) ? prev : { ...prev, [sid]: [...list, subjectName] }
    })
    toast.success("Removed from Examination")
  }

  const handleMarksChange = async (studentId, subjectName, field, value) => {
    const key = `${studentId}__${subjectName}`
    setExams((prev) => {
      const prevRec = prev[key] || { obtained: "", total: "" }
      return { ...prev, [key]: { ...prevRec, [field]: value } }
    })
    try {
      const current = exams[key] || {}
      const obtained = field === "obtained" ? value : current.obtained
      const total = field === "total" ? value : current.total
      await GlobalApi.SaveExam({ studentId, grade, section, session, month: monthKey, examType, subject: subjectName, obtained, total })
      const examResp = await GlobalApi.GetExams({ grade, section, session, month: monthKey, examType })
      const marks = {}
      ;(examResp.data || []).forEach((e) => {
        marks[`${e.studentId}__${e.subject}`] = { obtained: e.obtained, total: e.total, percentage: e.percentage }
      })
      setExams(marks)
    } catch (err) { console.error(err); toast.error("Failed to save") }
  }

  const rows = useMemo(() => {
    return students.map((s) => {
      const mySubjects = subjectsByStudent[String(s.id)] || []

      const studentMarks = {}
      let sumObtained = 0, sumTotal = 0, hasLow = false
      const lowSubjects = []

      mySubjects.forEach((sub) => {
        const record = exams[`${s.id}__${sub.name}`]
        if (record && (record.obtained !== undefined || record.total !== undefined)) {
          const obt = Number(record.obtained) || 0
          const tot = Number(record.total) || 0
          const pct = tot > 0 ? Math.round((obt / tot) * 100) : 0
          studentMarks[sub.name] = { obtained: obt, total: tot, percentage: pct }
          sumObtained += obt; sumTotal += tot
          if (tot > 0 && pct < 50) { hasLow = true; lowSubjects.push({ subject: sub.name, obtained: obt, total: tot, percentage: pct }) }
        } else { studentMarks[sub.name] = null }
      })

      const overallPct = sumTotal > 0 ? Math.round((sumObtained / sumTotal) * 100) : 0
      const hasAny = mySubjects.length > 0
      return {
        student: s, mySubjects, subjectMarks: studentMarks,
        sumObtained, sumTotal, overallPct,
        risk: hasLow ? "Risk" : (hasAny ? "Active" : "—"),
        lowSubjects,
      }
    })
  }, [students, subjectsByStudent, exams])

  const filteredRows = useMemo(() => {
    if (!searchInput.trim()) return rows
    const q = searchInput.toLowerCase()
    return rows.filter((r) => r.student.name?.toLowerCase().includes(q))
  }, [rows, searchInput])

  const handleSend = async (row) => {
    if (row.lowSubjects.length === 0) { toast.info("No subjects below 50%"); return }
    const lines = row.lowSubjects.map((s) => `${s.subject}: ${s.obtained}/${s.total} (${s.percentage}%)`).join(", ")
    const message = `Dear Parent, your child ${row.student.name} scored below 50% in: ${lines} for the ${examType} exam in ${month}.`
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: row.student.id, message, blockNumber: 0, weekStart: 0, weekEnd: 0, type: "academic" }),
      })
      toast.success(`Notification sent for ${row.student.name}`)
    } catch (err) { console.error(err); toast.error("Failed to send") }
  }

  const filterClass = "px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/40 transition-all"

  return (
    <div className="p-7 animate-page-in">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform duration-300">
          <FileText size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Examination</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Mid Term and Final Term records</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 p-5 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-purple-500 to-pink-500" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">Filters</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <select className={filterClass} value={grade} onChange={(e) => setGrade(e.target.value)}>
            <option value="">Grade</option>
            {GRADES.map(g => <option key={g}>{g}</option>)}
          </select>
          <select className={filterClass} value={section} onChange={(e) => setSection(e.target.value)}>
            <option value="">Section</option>
            {SECTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className={filterClass} value={session} onChange={(e) => setSession(e.target.value)}>
            <option value="">Session</option>
            {SESSIONS.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className={filterClass} value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">Month</option>
            {MONTHS.map(m => <option key={m}>{m}</option>)}
          </select>
          <select className={filterClass} value={examType} onChange={(e) => setExamType(e.target.value)}>
            {EXAM_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-slate-400">
          <LoaderIcon className="animate-spin mr-2" /> Loading...
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-purple-50 dark:bg-purple-900/40 text-purple-500 mx-auto flex items-center justify-center mb-4">
            <FileText size={28} />
          </div>
          <p className="text-base font-semibold text-slate-700 dark:text-slate-200">No students loaded</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Select Grade, Month and Exam Type</p>
        </div>
      ) : (
        <>
          <div className="flex justify-end mb-3">
            <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 shadow-sm bg-white dark:bg-slate-800 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-100 dark:focus-within:ring-purple-900/40 transition-all">
              <Search size={16} className="text-slate-400" />
              <input
                type="text"
                placeholder="Search student..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="outline-none text-sm w-48 bg-transparent text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
                    {["Roll No","Name","Session","Month","Examination", ...subjectColumns, "Total Marks","Obtained","Overall %","Status","Action"].map((h) => (
                      <th key={h} className={`px-4 py-3.5 font-bold text-slate-600 dark:text-slate-300 uppercase text-[11px] tracking-wider
                        ${["Total Marks","Obtained","Overall %","Status","Action"].includes(h) ? "text-center" : "text-left"}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const hasSubject = (name) => row.mySubjects.some((s) => s.name === name)
                    return (
                      <tr key={row.student.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-purple-50/50 dark:hover:bg-slate-700/40 transition-colors">
                        <td className="px-4 py-3 font-bold text-purple-600 dark:text-purple-400">{row.student.rollNo ?? "—"}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100">{row.student.name}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.student.session || "—"}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{monthKey}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{examType}</td>

                        {subjectColumns.map((name) => {
                          if (!hasSubject(name)) {
                            return <td key={name} className="px-4 py-3 text-center text-slate-300 dark:text-slate-600">—</td>
                          }
                          const cell = row.subjectMarks[name]
                          const pct = cell?.percentage ?? 0
                          return (
                            <td key={name} className="px-2 py-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="number" min="0"
                                  value={cell?.obtained ?? ""}
                                  onChange={(e) => handleMarksChange(row.student.id, name, "obtained", e.target.value)}
                                  placeholder="obt"
                                  className={`w-14 px-1 py-1.5 rounded-lg border text-center text-xs font-semibold outline-none transition
                                    ${cell && pct < 50
                                      ? "border-red-400 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700"
                                      : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"}`}
                                />
                                <span className="text-slate-400 text-xs font-bold">/</span>
                                <input
                                  type="number" min="0"
                                  value={cell?.total ?? ""}
                                  onChange={(e) => handleMarksChange(row.student.id, name, "total", e.target.value)}
                                  placeholder="tot"
                                  className="w-14 px-1 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-center text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none"
                                />
                                <button
                                  onClick={() => handleRemoveSubject(row.student.id, name)}
                                  title="Remove subject from Examination"
                                  className="w-5 h-5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center justify-center transition"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            </td>
                          )
                        })}

                        <td className="px-4 py-3 text-center font-bold text-slate-700 dark:text-slate-200">{row.sumTotal}</td>
                        <td className="px-4 py-3 text-center font-bold text-emerald-600 dark:text-emerald-400">{row.sumObtained}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-bold ${row.overallPct >= 50 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                            {row.overallPct}%
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                            ${row.risk === "Risk"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                              : row.risk === "Active"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"}`}>
                            {row.risk}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleSend(row)}
                              disabled={row.lowSubjects.length === 0}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold
                                bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 dark:disabled:bg-slate-700
                                disabled:text-slate-400 text-white transition-all hover:scale-105 disabled:scale-100"
                            >
                              <Send size={12} /> Send
                            </button>
                            <button
                              onClick={() => { setAddingFor(addingFor === row.student.id ? null : row.student.id); setNewSubjectName("") }}
                              title="Add subject (Examination only)"
                              className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300
                                hover:bg-emerald-100 dark:hover:bg-emerald-900/60 flex items-center justify-center transition hover:scale-110"
                            >
                              <Plus size={14} />
                            </button>
                          </div>

                          {addingFor === row.student.id && (
                            <div className="mt-2 flex gap-1 justify-center animate-fade-in">
                              <input
                                autoFocus
                                value={newSubjectName}
                                onChange={(e) => setNewSubjectName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddSubject(row.student.id)
                                  if (e.key === 'Escape') { setAddingFor(null); setNewSubjectName("") }
                                }}
                                placeholder="Subject name"
                                className="w-28 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs outline-none focus:border-purple-500"
                              />
                              <button onClick={() => handleAddSubject(row.student.id)}
                                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition">
                                Add
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}