"use client"

import React, { useEffect, useState, useMemo } from 'react'
import { LoaderIcon, FlaskConical, Send, Plus, X, Search, UserPlus, BookPlus } from 'lucide-react'
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
const TEST_TYPES = ["Monthly", "Weekly", "Daily"]

const STORAGE_KEY = "testing_filters_v1"
const EXTRA_KEY = "testing_extra_subjects_v1"
const HIDDEN_KEY = "testing_hidden_subjects_v1"

// Only Urdu stays excluded — English is now allowed as a subject.
const EXCLUDED_SUBJECTS = ["urdu"]
const isExcluded = (name) => EXCLUDED_SUBJECTS.includes(String(name || "").trim().toLowerCase())

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
  const [searchInput, setSearchInput] = useState("")

  const [extraSubjects, setExtraSubjects] = useState({})
  const [hiddenSubjects, setHiddenSubjects] = useState({})

  // ─── Subject modal state ───
  // mode: 'single' (one student) | 'bulk' (all students) | null (closed)
  const [subjectModal, setSubjectModal] = useState(null)
  const [newSubjectName, setNewSubjectName] = useState("")
  const [bulkSaving, setBulkSaving] = useState(false)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
      if (saved.grade) setGrade(saved.grade)
      if (saved.section) setSection(saved.section)
      if (saved.session) setSession(saved.session)
      if (saved.month) setMonth(saved.month)
      if (saved.testType) setTestType(saved.testType)
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ grade, section, session, month, testType }))
  }, [grade, section, session, month, testType, hydrated])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(EXTRA_KEY, JSON.stringify(extraSubjects))
  }, [extraSubjects, hydrated])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(hiddenSubjects))
  }, [hiddenSubjects, hydrated])

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

  // Clears old test marks for a student/subject combo before (re)adding it
  const clearOldMarks = async (studentId, name) => {
    try {
      await fetch(
        `/api/tests/by-subject?studentId=${encodeURIComponent(studentId)}` +
        `&subject=${encodeURIComponent(name)}` +
        `&month=${encodeURIComponent(monthKey)}` +
        `&testType=${encodeURIComponent(testType)}`,
        { method: "DELETE" }
      )
    } catch (e) {
      console.error("Failed to clear old marks:", e)
    }
  }

  // ─── Add subject to ONE student ───
  const handleAddSubjectSingle = async (studentId) => {
    const name = newSubjectName.trim()
    if (!name) return
    if (isExcluded(name)) { toast.error(`${name} is not allowed in Testing`); return }

    const sid = String(studentId)
    const alreadyExists = (subjectsByStudent[sid] || []).some(
      (s) => s.name.toLowerCase() === name.toLowerCase()
    )
    if (alreadyExists) { toast.error("Subject already exists for this student"); return }

    await clearOldMarks(studentId, name)
    setTests((prev) => {
      const copy = { ...prev }
      delete copy[`${studentId}__${name}`]
      return copy
    })

    setExtraSubjects((prev) => ({ ...prev, [sid]: [...(prev[sid] || []), name] }))
    setHiddenSubjects((prev) => ({ ...prev, [sid]: (prev[sid] || []).filter((n) => n !== name) }))

    setNewSubjectName("")
    setSubjectModal(null)
    toast.success(`"${name}" added for this student`)
  }

  // ─── Add subject to ALL currently loaded students at once ───
  const handleAddSubjectBulk = async () => {
    const name = newSubjectName.trim()
    if (!name) return
    if (isExcluded(name)) { toast.error(`${name} is not allowed in Testing`); return }
    if (students.length === 0) { toast.error("No students loaded"); return }

    const targets = students.filter((st) => {
      const sid = String(st.id)
      return !(subjectsByStudent[sid] || []).some((s) => s.name.toLowerCase() === name.toLowerCase())
    })

    if (targets.length === 0) {
      toast.info("Every student already has this subject")
      setSubjectModal(null)
      setNewSubjectName("")
      return
    }

    setBulkSaving(true)
    try {
      await Promise.all(targets.map((st) => clearOldMarks(st.id, name)))

      setTests((prev) => {
        const copy = { ...prev }
        targets.forEach((st) => { delete copy[`${st.id}__${name}`] })
        return copy
      })

      setExtraSubjects((prev) => {
        const copy = { ...prev }
        targets.forEach((st) => {
          const sid = String(st.id)
          copy[sid] = [...(copy[sid] || []), name]
        })
        return copy
      })

      setHiddenSubjects((prev) => {
        const copy = { ...prev }
        targets.forEach((st) => {
          const sid = String(st.id)
          copy[sid] = (copy[sid] || []).filter((n) => n !== name)
        })
        return copy
      })

      toast.success(`"${name}" added to ${targets.length} student${targets.length === 1 ? "" : "s"}`)
    } catch (err) {
      console.error(err)
      toast.error("Failed to add subject to all students")
    }

    setBulkSaving(false)
    setNewSubjectName("")
    setSubjectModal(null)
  }

  const handleRemoveSubject = (studentId, subjectName) => {
    if (!confirm(`Remove subject "${subjectName}" from Testing for this student?`)) return
    const sid = String(studentId)

    setExtraSubjects((prev) => ({ ...prev, [sid]: (prev[sid] || []).filter((n) => n !== subjectName) }))
    setHiddenSubjects((prev) => {
      const list = prev[sid] || []
      return list.includes(subjectName) ? prev : { ...prev, [sid]: [...list, subjectName] }
    })
    toast.success("Removed from Testing")
  }

  // Save EITHER obtained marks or total marks
  const handleMarksChange = async (studentId, subjectName, field, value) => {
    const key = `${studentId}__${subjectName}`
    setTests((prev) => {
      const prevRec = prev[key] || { marks: "", totalMarks: 100 }
      return { ...prev, [key]: { ...prevRec, [field]: value } }
    })
    try {
      const current = tests[key] || {}
      const marks = field === "marks" ? value : current.marks
      const totalMarks = field === "totalMarks" ? value : current.totalMarks
      await GlobalApi.SaveTest({
        studentId, grade, section, session, month: monthKey, testType,
        subject: subjectName, marks, totalMarks,
      })
      const testResp = await GlobalApi.GetTests({ grade, section, session, month: monthKey, testType })
      const marksMap = {}
      ;(testResp.data || []).forEach((t) => {
        marksMap[`${t.studentId}__${t.subject}`] = { marks: t.marks, totalMarks: t.totalMarks, percentage: t.percentage }
      })
      setTests(marksMap)
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
          const tot = Number(record.totalMarks) || 100
          const pct = record.percentage ?? Math.round((Number(record.marks) / tot) * 100)
          studentMarks[sub.name] = { marks: record.marks, totalMarks: record.totalMarks, percentage: pct }
          totalPct += pct; count++
          if (pct < 50) { hasLow = true; lowSubjects.push({ subject: sub.name, percentage: pct, marks: record.marks, totalMarks: tot }) }
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
    const lines = row.lowSubjects
      .map((s) => `${s.subject}: ${s.marks}/${s.totalMarks} (${s.percentage}%)`)
      .join(", ")
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

  const closeModal = () => {
    setSubjectModal(null)
    setNewSubjectName("")
  }

  const handleModalSubmit = () => {
    if (!subjectModal) return
    if (subjectModal.mode === "bulk") handleAddSubjectBulk()
    else handleAddSubjectSingle(subjectModal.studentId)
  }

  const modalStudentName = subjectModal?.mode === "single"
    ? students.find((s) => s.id === subjectModal.studentId)?.name
    : null

  return (
    <div className="p-7 animate-page-in">

      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform duration-300">
          <FlaskConical size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Testing</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Monthly, Weekly, and Daily test marks</p>
        </div>
      </div>

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
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <button
              onClick={() => { setSubjectModal({ mode: "bulk" }); setNewSubjectName("") }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600
                hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-bold shadow-md
                transition-all hover:scale-[1.03]"
            >
              <UserPlus size={18} />
              Add Subject to All Students
            </button>

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
                          const pct = cell?.percentage ?? 0
                          return (
                            <td key={name} className="px-2 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <input
                                  type="number" min="0"
                                  value={cell?.marks ?? ""}
                                  onChange={(e) => handleMarksChange(row.student.id, name, "marks", e.target.value)}
                                  placeholder="Obt"
                                  className={`w-16 px-2 py-2 rounded-lg border text-center text-sm font-bold outline-none transition
                                    ${cell && pct < 50
                                      ? "border-red-400 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700"
                                      : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40"}`}
                                />
                                <span className="text-slate-400 text-sm font-bold">/</span>
                                <input
                                  type="number" min="0"
                                  value={cell?.totalMarks ?? ""}
                                  onChange={(e) => handleMarksChange(row.student.id, name, "totalMarks", e.target.value)}
                                  placeholder="Tot"
                                  className="w-16 px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800
                                    text-center text-sm font-bold text-slate-800 dark:text-slate-100 outline-none
                                    focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 transition"
                                />
                                <button
                                  onClick={() => handleRemoveSubject(row.student.id, name)}
                                  title="Remove subject from Testing"
                                  className="w-6 h-6 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center justify-center transition"
                                >
                                  <X size={13} />
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
                          <div className="flex items-center justify-center gap-2">
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
                              onClick={() => { setSubjectModal({ mode: "single", studentId: row.student.id }); setNewSubjectName("") }}
                              title="Add subject for this student"
                              className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300
                                hover:bg-emerald-100 dark:hover:bg-emerald-900/60 flex items-center justify-center transition hover:scale-110 shadow-sm"
                            >
                              <Plus size={18} strokeWidth={2.5} />
                            </button>
                          </div>
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

      {/* ─── Add Subject Modal (single student OR bulk) ─── */}
      {subjectModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">

            <div className={`px-6 py-5 ${subjectModal.mode === "bulk"
              ? "bg-gradient-to-r from-indigo-600 to-purple-600"
              : "bg-gradient-to-r from-emerald-500 to-teal-600"}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center text-white">
                  {subjectModal.mode === "bulk" ? <UserPlus size={22} /> : <BookPlus size={22} />}
                </div>
                <div>
                  <h3 className="text-white text-lg font-bold">
                    {subjectModal.mode === "bulk" ? "Add Subject to All Students" : "Add Subject"}
                  </h3>
                  <p className="text-white/80 text-xs mt-0.5">
                    {subjectModal.mode === "bulk"
                      ? `Assigns a new subject to all ${students.length} loaded student(s)`
                      : `For ${modalStudentName || "this student"}`}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {subjectModal.mode === "bulk" && (
                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-3">
                  <p className="text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed">
                    This subject will be added to every student currently loaded by your filters.
                    Students who already have this subject will be skipped automatically.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  Subject Name <span className="text-red-500">*</span>
                </label>
                <input
                  autoFocus
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleModalSubmit()
                    if (e.key === "Escape") closeModal()
                  }}
                  placeholder="e.g. Mathematics, Science, English..."
                  disabled={bulkSaving}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600
                    focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/40
                    outline-none transition text-base text-slate-800 dark:text-slate-100
                    bg-white dark:bg-slate-900 disabled:opacity-60"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
              <button
                onClick={closeModal}
                disabled={bulkSaving}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-semibold
                  text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleModalSubmit}
                disabled={bulkSaving || !newSubjectName.trim()}
                className={`px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition flex items-center gap-2
                  disabled:opacity-50 hover:scale-[1.02]
                  ${subjectModal.mode === "bulk"
                    ? "bg-indigo-600 hover:bg-indigo-700"
                    : "bg-emerald-600 hover:bg-emerald-700"}`}
              >
                {bulkSaving ? (
                  <>
                    <LoaderIcon size={16} className="animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    {subjectModal.mode === "bulk" ? <UserPlus size={16} /> : <BookPlus size={16} />}
                    {subjectModal.mode === "bulk" ? "Add to All" : "Add Subject"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}