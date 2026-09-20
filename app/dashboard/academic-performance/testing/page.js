"use client"


import React, { useEffect, useState, useMemo } from 'react'
import { LoaderIcon, FlaskConical, Send, Plus, X, Search } from 'lucide-react'
import GlobalApi from '@/app/_services/GlobalApi'
import { toast } from 'sonner'

const GRADES = ["1st","2nd","3rd","4th","5th","6th","7th","8th","9th","10th"]
const SECTIONS = ["A", "B", "C"]
const SESSIONS = Array.from({ length: 100 }, (_, i) => `${2025 + i}-${2026 + i}`)
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
]
const TEST_TYPES = ["Monthly", "Weekly", "Daily"]

const STORAGE_KEY = "testing_filters_v1"

const monthNameToKey = (name) => {
  const map = {
    January: "01", February: "02", March: "03", April: "04",
    May: "05", June: "06", July: "07", August: "08",
    September: "09", October: "10", November: "11", December: "12",
  }
  return `${map[name]}/${new Date().getFullYear()}`
}

export default function TestingPage() {
  const [grade, setGrade] = useState("")
  const [section, setSection] = useState("")
  const [session, setSession] = useState("")
  const [month, setMonth] = useState("")
  const [testType, setTestType] = useState("Monthly")

  const [students, setStudents] = useState([])
  const [subjects, setSubjects] = useState([])
  const [tests, setTests] = useState({})
  const [loading, setLoading] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [addingFor, setAddingFor] = useState(null)
  const [newSubjectName, setNewSubjectName] = useState("")
  const [searchInput, setSearchInput] = useState("")

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
      if (saved.grade) setGrade(saved.grade)
      if (saved.section) setSection(saved.section)
      if (saved.session) setSession(saved.session)
      if (saved.month) setMonth(saved.month)
      if (saved.testType) setTestType(saved.testType)
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ grade, section, session, month, testType }))
  }, [grade, section, session, month, testType, hydrated])

  const fetchAll = async () => {
    if (!grade || !month || !testType) {
      setStudents([]); setSubjects([]); setTests({}); return
    }
    setLoading(true)
    try {
      const monthKey = monthNameToKey(month)
      const params = { grade }
      if (section) params.section = section
      if (session) params.session = session

      const [studentResp, subjectResp, testResp] = await Promise.all([
        GlobalApi.GetAllStudents(params),
        GlobalApi.GetAllSubjects(),
        GlobalApi.GetTests({ grade, section, session, month: monthKey, testType }),
      ])

      const marks = {}
      ;(testResp.data || []).forEach((t) => {
        marks[`${t.studentId}__${t.subject}`] = {
          marks: t.marks, totalMarks: t.totalMarks, percentage: t.percentage,
        }
      })

      setStudents(studentResp.data || [])
      setSubjects(subjectResp.data || [])
      setTests(marks)
    } catch (err) {
      console.error(err); toast.error("Failed to load data")
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!hydrated) return
    const t = setTimeout(fetchAll, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line
  }, [grade, section, session, month, testType, hydrated])

  const monthKey = month ? monthNameToKey(month) : ""

  const subjectColumns = useMemo(() => {
    const names = new Set()
    subjects.forEach((s) => {
      if (s.name !== "English" && s.name !== "Urdu") names.add(s.name)
    })
    return Array.from(names).sort()
  }, [subjects])

  const subjectsByStudent = useMemo(() => {
    const map = {}
    subjects.forEach((s) => {
      if (!map[s.studentId]) map[s.studentId] = []
      map[s.studentId].push(s)
    })
    return map
  }, [subjects])

  const handleAddSubject = async (studentId) => {
    const name = newSubjectName.trim()
    if (!name) return
    try {
      await GlobalApi.CreateSubject({ name, studentId: String(studentId) })
      setNewSubjectName(""); setAddingFor(null); toast.success("Subject added"); fetchAll()
    } catch (err) { toast.error(err?.response?.data?.error || "Failed to add") }
  }

  const handleRemoveSubject = async (studentId, subjectName) => {
    const record = subjects.find((s) => s.studentId === String(studentId) && s.name === subjectName)
    if (!record) return
    if (!confirm(`Remove subject "${subjectName}" from this student?`)) return
    try { await GlobalApi.DeleteSubject(record.id); toast.success("Removed"); fetchAll() }
    catch { toast.error("Failed to remove") }
  }

  const handleMarksChange = async (studentId, subjectName, value) => {
    const key = `${studentId}__${subjectName}`
    setTests((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), marks: value, totalMarks: prev[key]?.totalMarks ?? 100 } }))
    try {
      await GlobalApi.SaveTest({
        studentId, grade, section, session, month: monthKey, testType,
        subject: subjectName, marks: value, totalMarks: 100,
      })
      const testResp = await GlobalApi.GetTests({ grade, section, session, month: monthKey, testType })
      const marks = {}
      ;(testResp.data || []).forEach((t) => {
        marks[`${t.studentId}__${t.subject}`] = { marks: t.marks, totalMarks: t.totalMarks, percentage: t.percentage }
      })
      setTests(marks)
    } catch (err) { console.error(err); toast.error("Failed to save marks") }
  }

  const rows = useMemo(() => {
    return students.map((s) => {
      const mySubjects = subjectsByStudent[String(s.id)] || []
      const studentMarks = {}
      let totalPct = 0, count = 0, hasLow = false
      const lowSubjects = []

      mySubjects.forEach((sub) => {
        const record = tests[`${s.id}__${sub.name}`]
        if (record && record.marks !== undefined && record.marks !== "") {
          const pct = record.percentage ?? Math.round((record.marks / (record.totalMarks || 100)) * 100)
          studentMarks[sub.name] = { marks: record.marks, percentage: pct }
          totalPct += pct; count++
          if (pct < 50) { hasLow = true; lowSubjects.push({ subject: sub.name, percentage: pct, marks: record.marks }) }
        } else { studentMarks[sub.name] = null }
      })

      const overallPct = count > 0 ? Math.round(totalPct / count) : 0
      return {
        student: s, mySubjects, subjectMarks: studentMarks, overallPct,
        risk: hasLow ? "Risk" : (count > 0 ? "Active" : "—"),
        lowSubjects,
      }
    })
  }, [students, subjectsByStudent, tests])

  const filteredRows = useMemo(() => {
    if (!searchInput.trim()) return rows
    const q = searchInput.toLowerCase()
    return rows.filter((r) => r.student.name?.toLowerCase().includes(q))
  }, [rows, searchInput])

  const handleSend = async (row) => {
    if (row.lowSubjects.length === 0) { toast.info("No subjects below 50%"); return }
    const lines = row.lowSubjects.map((s) => `${s.subject}: ${s.marks}/100 (${s.percentage}%)`).join(", ")
    const message = `Dear Parent, your child ${row.student.name} scored below 50% in: ${lines} for the ${testType} test in ${month}.`
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: row.student.id, message, blockNumber: 0, weekStart: 0, weekEnd: 0, type: "academic" }),
      })
      toast.success(`Notification sent for ${row.student.name}`)
    } catch (err) { console.error(err); toast.error("Failed to send") }
  }

  const filterClass = "px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 transition-all"

  return (
    <div className="p-7 animate-page-in">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform duration-300">
          <FlaskConical size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Testing</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Monthly, Weekly, and Daily test marks</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 p-5 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-blue-500 to-cyan-500" />
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
          <select className={filterClass} value={testType} onChange={(e) => setTestType(e.target.value)}>
            {TEST_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16 text-slate-400">
          <LoaderIcon className="animate-spin mr-2" /> Loading...
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-500 mx-auto flex items-center justify-center mb-4">
            <FlaskConical size={28} />
          </div>
          <p className="text-base font-semibold text-slate-700 dark:text-slate-200">No students loaded</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Select Grade, Month and Test Type</p>
        </div>
      ) : (
        <>
          {/* Search bar */}
          <div className="flex justify-end mb-3">
            <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 shadow-sm bg-white dark:bg-slate-800 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/40 transition-all">
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
            <div className="h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
                    {["Roll No","Name","Session","Month","Test", ...subjectColumns, "Overall %","Status","Action"].map((h) => (
                      <th key={h} className={`px-4 py-3.5 font-bold text-slate-600 dark:text-slate-300 uppercase text-[11px] tracking-wider
                        ${["Overall %","Status","Action"].includes(h) ? "text-center" : "text-left"}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const hasSubject = (name) => row.mySubjects.some((s) => s.name === name)
                    return (
                      <tr key={row.student.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-blue-50/50 dark:hover:bg-slate-700/40 transition-colors">
                        <td className="px-4 py-3 font-bold text-indigo-600 dark:text-indigo-400">{row.student.rollNo ?? "—"}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100">{row.student.name}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.student.session || "—"}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{monthKey}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{testType}</td>

                        {subjectColumns.map((name) => {
                          if (!hasSubject(name)) {
                            return <td key={name} className="px-4 py-3 text-center text-slate-300 dark:text-slate-600">—</td>
                          }
                          const cell = row.subjectMarks[name]
                          return (
                            <td key={name} className="px-2 py-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="number" min="0" max="100"
                                  value={cell?.marks ?? ""}
                                  onChange={(e) => handleMarksChange(row.student.id, name, e.target.value)}
                                  placeholder="—"
                                  className={`w-16 px-2 py-1.5 rounded-lg border text-center text-sm font-semibold outline-none transition
                                    ${cell && cell.percentage < 50
                                      ? "border-red-400 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700"
                                      : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:border-blue-500"}`}
                                />
                                <button
                                  onClick={() => handleRemoveSubject(row.student.id, name)}
                                  title="Remove subject"
                                  className="w-5 h-5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center justify-center transition"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            </td>
                          )
                        })}

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
                                bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-700
                                disabled:text-slate-400 text-white transition-all hover:scale-105 disabled:scale-100"
                            >
                              <Send size={12} /> Send
                            </button>
                            <button
                              onClick={() => { setAddingFor(addingFor === row.student.id ? null : row.student.id); setNewSubjectName("") }}
                              title="Add subject"
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
                                className="w-28 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs outline-none focus:border-blue-500"
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