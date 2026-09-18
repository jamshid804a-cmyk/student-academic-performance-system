"use client"
export const dynamic = 'force-dynamic'

import React, { useEffect, useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, X, BookOpen, LoaderIcon, FlaskConical, Send } from 'lucide-react'
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

  const [subjects, setSubjects] = useState([])
  const [newSubject, setNewSubject] = useState("")
  const [loadingSubjects, setLoadingSubjects] = useState(false)

  const [students, setStudents] = useState([])
  const [tests, setTests] = useState({})
  const [loadingTable, setLoadingTable] = useState(false)

  const loadSubjects = async () => {
    setLoadingSubjects(true)
    try {
      const resp = await GlobalApi.GetAllSubjects()
      setSubjects(resp.data || [])
    } catch (err) { console.error(err) }
    setLoadingSubjects(false)
  }

  useEffect(() => { loadSubjects() }, [])

  const handleAddSubject = async () => {
    const name = newSubject.trim()
    if (!name) return
    try {
      await GlobalApi.CreateSubject({ name })
      setNewSubject("")
      toast.success("Subject added")
      loadSubjects()
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to add subject")
    }
  }

  const handleDeleteSubject = async (id, name) => {
    if (!confirm(`Remove subject "${name}"?`)) return
    try {
      await GlobalApi.DeleteSubject(id)
      toast.success("Subject removed")
      loadSubjects()
    } catch { toast.error("Failed to remove subject") }
  }

  useEffect(() => {
    const load = async () => {
      if (!grade || !month || !testType) {
        setStudents([]); setTests({}); return
      }
      setLoadingTable(true)
      try {
        const monthKey = monthNameToKey(month)
        const studentParams = { grade }
        if (section) studentParams.section = section
        if (session) studentParams.session = session
        const studentResp = await GlobalApi.GetAllStudents(studentParams)
        const testResp = await GlobalApi.GetTests({
          grade, section, session, month: monthKey, testType,
        })
        const marks = {}
        ;(testResp.data || []).forEach((t) => {
          marks[`${t.studentId}__${t.subject}`] = {
            marks: t.marks,
            totalMarks: t.totalMarks,
            percentage: t.percentage,
          }
        })
        setStudents(studentResp.data || [])
        setTests(marks)
      } catch (err) {
        console.error(err)
        toast.error("Failed to load table")
      }
      setLoadingTable(false)
    }
    load()
  }, [grade, section, session, month, testType])

  const monthKey = month ? monthNameToKey(month) : ""

  const handleMarksChange = async (student, subject, value) => {
    const key = `${student.id}__${subject}`
    setTests((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), marks: value, totalMarks: prev[key]?.totalMarks ?? 100 },
    }))
    try {
      await GlobalApi.SaveTest({
        studentId: student.id, grade, section, session,
        month: monthKey, testType, subject, marks: value, totalMarks: 100,
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
      console.error(err); toast.error("Failed to save marks")
    }
  }

  const rows = useMemo(() => {
    return students.map((s) => {
      const studentMarks = {}
      let totalPct = 0, count = 0, hasLowSubject = false
      const lowSubjects = []
      subjects.forEach((sub) => {
        const record = tests[`${s.id}__${sub.name}`]
        if (record && record.marks !== undefined && record.marks !== "") {
          const pct = record.percentage ?? Math.round((record.marks / (record.totalMarks || 100)) * 100)
          studentMarks[sub.name] = { marks: record.marks, total: record.totalMarks || 100, percentage: pct }
          totalPct += pct; count += 1
          if (pct < 50) {
            hasLowSubject = true
            lowSubjects.push({ subject: sub.name, percentage: pct, marks: record.marks })
          }
        } else { studentMarks[sub.name] = null }
      })
      const overallPct = count > 0 ? Math.round(totalPct / count) : 0
      return {
        student: s, subjectMarks: studentMarks, overallPct,
        risk: hasLowSubject ? "Risk" : "Active", lowSubjects,
      }
    })
  }, [students, subjects, tests])

  const handleSend = async (row) => {
    if (row.lowSubjects.length === 0) {
      toast.info("All subjects are above 50% — no notification needed.")
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
    } catch (err) { console.error(err); toast.error("Failed to send notification") }
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

      {/* Subjects */}
      <div className="bg-white border rounded-2xl shadow-sm p-5 mb-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Subjects</h3>
        <div className="flex gap-2 mb-3">
          <input type="text" placeholder="Add a subject (e.g. Math)"
            value={newSubject} onChange={(e) => setNewSubject(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:border-blue-500 outline-none text-sm"
          />
          <Button onClick={handleAddSubject} disabled={!newSubject.trim()}>
            <Plus size={16} className="mr-1" /> Add Subject
          </Button>
        </div>
        {loadingSubjects ? <p className="text-sm text-slate-400">Loading subjects...</p>
          : subjects.length === 0 ? <p className="text-sm text-slate-400">No subjects yet.</p>
          : (
            <div className="flex flex-wrap gap-2">
              {subjects.map((s) => (
                <span key={s.id} className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-sm">
                  {s.name}
                  <button onClick={() => handleDeleteSubject(s.id, s.name)}
                    className="w-5 h-5 rounded bg-slate-200 hover:bg-red-100 hover:text-red-600 text-slate-500 flex items-center justify-center">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
      </div>

      {/* Table */}
      {loadingTable ? (
        <div className="flex justify-center py-10 text-slate-400">
          <LoaderIcon className="animate-spin mr-2" /> Loading table...
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
                {subjects.map((s) => (
                  <th key={s.id} className="p-3 text-center font-semibold text-slate-700 min-w-[90px]">{s.name}</th>
                ))}
                <th className="p-3 text-center font-semibold text-slate-700">Overall %</th>
                <th className="p-3 text-center font-semibold text-slate-700">Status</th>
                <th className="p-3 text-center font-semibold text-slate-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.student.id} className="border-b hover:bg-slate-50">
                  <td className="p-3">{row.student.rollNo ?? "—"}</td>
                  <td className="p-3 font-medium">{row.student.name}</td>
                  <td className="p-3">{row.student.session || "—"}</td>
                  <td className="p-3">{monthKey}</td>
                  <td className="p-3">{testType}</td>
                  {subjects.map((sub) => {
                    const cell = row.subjectMarks[sub.name]
                    return (
                      <td key={sub.id} className="p-2 text-center">
                        <input type="number" min="0" max="100"
                          value={cell?.marks ?? ""}
                          onChange={(e) => handleMarksChange(row.student, sub.name, e.target.value)}
                          className={`w-16 px-2 py-1 rounded border text-center text-sm
                            ${cell && cell.percentage < 50 ? "border-red-400 bg-red-50 text-red-700" : "border-gray-300"}`}
                          placeholder="—"
                        />
                      </td>
                    )
                  })}
                  <td className="p-3 text-center font-semibold">{row.overallPct}%</td>
                  <td className="p-3 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold
                      ${row.risk === "Risk" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                      {row.risk}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <button onClick={() => handleSend(row)} disabled={row.lowSubjects.length === 0}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white">
                      <Send size={12} /> Send
                    </button>
                  </td>
                </tr>
              ))}
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