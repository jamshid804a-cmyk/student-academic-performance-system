"use client"
export const dynamic = 'force-dynamic'

import React, { useEffect, useState, useMemo, useRef } from 'react'
import { LoaderIcon, FlaskConical, Send, Plus, X } from 'lucide-react'
import GlobalApi from '@/app/_services/GlobalApi'
import { toast } from 'sonner'

const GRADES = ["1st","2nd","3rd","4th","5th","6th","7th","8th","9th","10th"]
const SECTIONS = ["A", "B", "C"]
const SESSIONS = Array.from({ length: 100 }, (_, i) => `${2025 + i}-${2026 + i}`)
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]
const TEST_TYPES = ["Monthly", "Weekly", "Daily"]

const STORAGE_KEY = "testing_filters_v2"

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
  const [subjects, setSubjects] = useState([]) // [{_id, name, studentId}]
  const [tests, setTests] = useState({})       // { `${studentId}__${subjectName}`: { marks, percentage } }
  const [loading, setLoading] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const debounceRef = useRef(null)

  const [addingFor, setAddingFor] = useState(null)   // studentId of the row currently adding
  const [newSubjectName, setNewSubjectName] = useState("")

  // ─── Load saved filters ───
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

  // ─── Save filters ───
  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ grade, section, session, month, testType })
    )
  }, [grade, section, session, month, testType, hydrated])

  // ─── Fetch students + subjects + tests ───
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
        GlobalApi.GetAllSubjects(),          // all subjects across all students
        GlobalApi.GetTests({ grade, section, session, month: monthKey, testType }),
      ])

      const marks = {}
      ;(testResp.data || []).forEach((t) => {
        marks[`${t.studentId}__${t.subject}`] = {
          marks: t.marks,
          totalMarks: t.totalMarks,
          percentage: t.percentage,
        }
      })

      setStudents(studentResp.data || [])
      setSubjects(subjectResp.data || [])
      setTests(marks)
    } catch (err) {
      console.error(err)
      toast.error("Failed to load data")
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!hydrated) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(fetchAll, 250)
    return () => debounceRef.current && clearTimeout(debounceRef.current)
    // eslint-disable-next-line
  }, [grade, section, session, month, testType, hydrated])

  const monthKey = month ? monthNameToKey(month) : ""

  // ─── Unique subject names (across all students) — becomes table columns ───
  const subjectColumns = useMemo(() => {
    const names = new Set()
    subjects.forEach((s) => names.add(s.name))
    return Array.from(names).sort()
  }, [subjects])

  // ─── Map: studentId → Set of subject names they have ───
  const subjectsByStudent = useMemo(() => {
    const map = {}
    subjects.forEach((s) => {
      if (!map[s.studentId]) map[s.studentId] = []
      map[s.studentId].push(s)
    })
    return map
  }, [subjects])

  // ─── Add subject for a student ───
  const handleAddSubject = async (studentId) => {
    const name = newSubjectName.trim()
    if (!name) return
    try {
      await GlobalApi.CreateSubject({ name, studentId: String(studentId) })
      setNewSubjectName("")
      setAddingFor(null)
      toast.success("Subject added")
      fetchAll()
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to add")
    }
  }

  // ─── Remove a subject for one student ───
  const handleRemoveSubject = async (studentId, subjectName) => {
    const record = subjects.find(
      (s) => s.studentId === String(studentId) && s.name === subjectName
    )
    if (!record) return
    if (!confirm(`Remove subject "${subjectName}" from this student?`)) return
    try {
      await GlobalApi.DeleteSubject(record.id)
      toast.success("Removed")
      fetchAll()
    } catch {
      toast.error("Failed to remove")
    }
  }

  // ─── Save marks ───
  const handleMarksChange = async (studentId, subjectName, value) => {
    const key = `${studentId}__${subjectName}`
    setTests((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        marks: value,
        totalMarks: prev[key]?.totalMarks ?? 100,
      },
    }))
    try {
      await GlobalApi.SaveTest({
        studentId,
        grade, section, session,
        month: monthKey,
        testType,
        subject: subjectName,
        marks: value,
        totalMarks: 100,
      })
      const testResp = await GlobalApi.GetTests({
        grade, section, session, month: monthKey, testType,
      })
      const marks = {}
      ;(testResp.data || []).forEach((t) => {
        marks[`${t.studentId}__${t.subject}`] = {
          marks: t.marks, totalMarks: t.totalMarks, percentage: t.percentage,
        }
      })
      setTests(marks)
    } catch (err) {
      console.error(err)
      toast.error("Failed to save marks")
    }
  }

  // ─── Build rows ───
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
          if (pct < 50) {
            hasLow = true
            lowSubjects.push({ subject: sub.name, percentage: pct, marks: record.marks })
          }
        } else {
          studentMarks[sub.name] = null
        }
      })

      const overallPct = count > 0 ? Math.round(totalPct / count) : 0
      return {
        student: s,
        mySubjects,
        subjectMarks: studentMarks,
        overallPct,
        risk: hasLow ? "Risk" : (count > 0 ? "Active" : "—"),
        lowSubjects,
      }
    })
  }, [students, subjectsByStudent, tests])

  // ─── Send notification ───
  const handleSend = async (row) => {
    if (row.lowSubjects.length === 0) {
      toast.info("No subjects below 50%")
      return
    }
    const lines = row.lowSubjects.map((s) => `${s.subject}: ${s.marks}/100 (${s.percentage}%)`).join(", ")
    const message = `Dear Parent, your child ${row.student.name} scored below 50% in: ${lines} for the ${testType} test in ${month}. Please provide extra support.`
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: row.student.id, message,
          blockNumber: 0, weekStart: 0, weekEnd: 0, type: "academic",
        }),
      })
      toast.success(`Notification sent for ${row.student.name}`)
    } catch (err) {
      console.error(err)
      toast.error("Failed to send")
    }
  }

  return (
    <div className="p-7">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center shadow-md">
          <FlaskConical size={22} />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Testing</h2>
          <p className="text-sm text-slate-500">Monthly, Weekly, and Daily test marks</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-2xl shadow-sm p-5 mb-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Filters</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <select className="fi" value={grade} onChange={(e) => setGrade(e.target.value)}>
            <option value="">Grade</option>
            {GRADES.map(g => <option key={g}>{g}</option>)}
          </select>
          <select className="fi" value={section} onChange={(e) => setSection(e.target.value)}>
            <option value="">Section</option>
            {SECTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="fi" value={session} onChange={(e) => setSession(e.target.value)}>
            <option value="">Session</option>
            {SESSIONS.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="fi" value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">Month</option>
            {MONTHS.map(m => <option key={m}>{m}</option>)}
          </select>
          <select className="fi" value={testType} onChange={(e) => setTestType(e.target.value)}>
            {TEST_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-10 text-slate-400">
          <LoaderIcon className="animate-spin mr-2" /> Loading...
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white border rounded-2xl p-10 text-center text-slate-400">
          Select Grade, Month and Test Type to load students.
        </div>
      ) : (
        <div className="bg-white border rounded-2xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-3 text-left font-semibold text-slate-700">Roll No</th>
                <th className="p-3 text-left font-semibold text-slate-700">Name</th>
                <th className="p-3 text-left font-semibold text-slate-700">Session</th>
                <th className="p-3 text-left font-semibold text-slate-700">Month</th>
                <th className="p-3 text-left font-semibold text-slate-700">Test</th>
                {subjectColumns.map((name) => (
                  <th key={name} className="p-3 text-center font-semibold text-slate-700 min-w-[110px]">
                    {name}
                  </th>
                ))}
                <th className="p-3 text-center font-semibold text-slate-700">Overall %</th>
                <th className="p-3 text-center font-semibold text-slate-700">Status</th>
                <th className="p-3 text-center font-semibold text-slate-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const hasSubject = (name) => row.mySubjects.some((s) => s.name === name)

                return (
                  <tr key={row.student.id} className="border-b hover:bg-slate-50">
                    <td className="p-3">{row.student.rollNo ?? "—"}</td>
                    <td className="p-3 font-medium">{row.student.name}</td>
                    <td className="p-3">{row.student.session || "—"}</td>
                    <td className="p-3">{monthKey}</td>
                    <td className="p-3">{testType}</td>

                    {subjectColumns.map((name) => {
                      if (!hasSubject(name)) {
                        return <td key={name} className="p-2 text-center text-slate-300">—</td>
                      }
                      const cell = row.subjectMarks[name]
                      return (
                        <td key={name} className="p-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={cell?.marks ?? ""}
                              onChange={(e) => handleMarksChange(row.student.id, name, e.target.value)}
                              placeholder="—"
                              className={`w-14 px-2 py-1 rounded border text-center text-sm
                                ${cell && cell.percentage < 50
                                  ? "border-red-400 bg-red-50 text-red-700"
                                  : "border-gray-300"}`}
                            />
                            <button
                              onClick={() => handleRemoveSubject(row.student.id, name)}
                              title="Remove subject"
                              className="w-5 h-5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </td>
                      )
                    })}

                    <td className="p-3 text-center font-semibold">{row.overallPct}%</td>

                    <td className="p-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold
                        ${row.risk === "Risk"
                          ? "bg-red-100 text-red-700"
                          : row.risk === "Active"
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-500"}`}>
                        {row.risk}
                      </span>
                    </td>

                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleSend(row)}
                          disabled={row.lowSubjects.length === 0}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white"
                        >
                          <Send size={12} /> Send
                        </button>
                        <button
                          onClick={() => {
                            setAddingFor(addingFor === row.student.id ? null : row.student.id)
                            setNewSubjectName("")
                          }}
                          title="Add subject"
                          className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      {addingFor === row.student.id && (
                        <div className="mt-2 flex gap-1 justify-center">
                          <input
                            autoFocus
                            value={newSubjectName}
                            onChange={(e) => setNewSubjectName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddSubject(row.student.id)
                              if (e.key === 'Escape') { setAddingFor(null); setNewSubjectName("") }
                            }}
                            placeholder="Subject name"
                            className="w-28 px-2 py-1 rounded border border-gray-300 text-xs"
                          />
                          <button
                            onClick={() => handleAddSubject(row.student.id)}
                            className="px-2 py-1 rounded bg-emerald-600 text-white text-xs"
                          >
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
      )}

      <style jsx>{`
        .fi { padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 8px; background: white; font-size: 14px; outline: none; }
        .fi:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.1); }
      `}</style>
    </div>
  )
}