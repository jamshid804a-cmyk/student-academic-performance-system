"use client"

import React, { useEffect, useState, useMemo, useCallback } from "react"
import { LoaderIcon, FileText, Send, Plus, X, Search, UserPlus, Trash2 } from "lucide-react"
import { toast } from "sonner"

const SECTIONS = ["A", "B", "C"]
const START_YEAR = 2025
const END_YEAR = new Date().getFullYear() + 30
const YEARS = []
for (let y = START_YEAR; y <= END_YEAR; y++) YEARS.push(String(y))
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

export default function TeacherAcademyExaminationModule({ teacher, token }) {
  const [course, setCourse] = useState("")
  const [section, setSection] = useState("")
  const [year, setYear] = useState("")
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()])
  const [examType, setExamType] = useState("Mid Term")

  const [courses, setCourses] = useState([])
  const [students, setStudents] = useState([])
  const [subjects, setSubjects] = useState({})
  const [exams, setExams] = useState({})
  const [loading, setLoading] = useState(false)
  const [searchInput, setSearchInput] = useState("")

  const [extraSubjects, setExtraSubjects] = useState({})
  const [hiddenSubjects, setHiddenSubjects] = useState({})

  const [subjectModal, setSubjectModal] = useState(null)
  const [newSubjectName, setNewSubjectName] = useState("")
  const [deletingSubject, setDeletingSubject] = useState(null)

  useEffect(() => {
    if (!token) return
    fetch(`/api/teacher-public/courses?token=${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d.success) setCourses(d.courses || []) })
      .catch(() => {})
  }, [token])

  useEffect(() => {
    if (courses.length === 0 || course) return
    const assigned = Array.isArray(teacher?.classes) ? teacher.classes : []
    if (assigned.length > 0) {
      const first = assigned[0]
      setCourse(first.course || first.grade || "")
      if (first.section) setSection(first.section)
    }
  }, [courses, teacher, course])

  const fetchAll = useCallback(async () => {
    if (!token || !course || !month || !examType) {
      setStudents([]); setExams({}); return
    }
    setLoading(true)
    try {
      const monthKey = monthNameToKey(month)

      const params = new URLSearchParams({ token, course, month: monthKey, type: examType })
      if (section) params.append('section', section)
      if (year) params.append('year', year)
      const examRes = await fetch(
        `/api/teacher-public/academy-academic?kind=exam&${params.toString()}`,
        { cache: 'no-store' }
      )
      const examArr = await examRes.json()

      const attParams = new URLSearchParams({ token, course, month: monthKey })
      if (section) attParams.append('section', section)
      if (year) attParams.append('year', year)
      const attRes = await fetch(
        `/api/teacher-public/academy-attendance?${attParams.toString()}`,
        { cache: 'no-store' }
      )
      const attData = await attRes.json()
      setStudents(Array.isArray(attData?.students) ? attData.students : [])

      const marks = {}
      ;(Array.isArray(examArr) ? examArr : []).forEach((e) => {
        marks[`${e.studentId}__${e.subject}`] = {
          obtained: e.obtained, total: e.total, percentage: e.percentage,
        }
      })
      setExams(marks)

      try {
        const key = `tch_exam_subjects_${token}`
        const saved = JSON.parse(localStorage.getItem(key) || "{}")
        setSubjects(saved)
      } catch { setSubjects({}) }
    } catch (err) {
      console.error(err)
      toast.error("Failed to load")
    }
    setLoading(false)
  }, [token, course, section, year, month, examType])

  useEffect(() => { fetchAll() }, [fetchAll])

  useEffect(() => {
    if (!token) return
    try {
      localStorage.setItem(`tch_exam_subjects_${token}`, JSON.stringify(subjects))
    } catch {}
  }, [subjects, token])

  const monthKey = month ? monthNameToKey(month) : ""

  const subjectsByStudent = useMemo(() => {
    const map = {}
    Object.entries(subjects).forEach(([sid, names]) => {
      if ((hiddenSubjects[sid] || []).length > 0) return
      ;(names || []).forEach((name) => {
        if (!map[sid]) map[sid] = []
        if (!map[sid].some((x) => x.name === name)) map[sid].push({ name })
      })
    })
    Object.entries(extraSubjects).forEach(([sid, names]) => {
      names.forEach((name) => {
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

  const handleAddSubjectSingle = (studentId) => {
    const name = newSubjectName.trim()
    if (!name) return
    const sid = String(studentId)
    setSubjects((prev) => ({ ...prev, [sid]: [...(prev[sid] || []), name] }))
    setNewSubjectName("")
    setSubjectModal(null)
    toast.success(`"${name}" added for this student`)
  }

  const handleAddSubjectBulk = () => {
    const name = newSubjectName.trim()
    if (!name) return
    setSubjects((prev) => {
      const copy = { ...prev }
      students.forEach((st) => {
        const sid = String(st.id)
        if (!(copy[sid] || []).includes(name)) {
          copy[sid] = [...(copy[sid] || []), name]
        }
      })
      return copy
    })
    toast.success(`"${name}" added to all students`)
    setNewSubjectName("")
    setSubjectModal(null)
  }

  const handleRemoveSubject = (studentId, subjectName) => {
    if (!confirm(`Remove "${subjectName}" from this student?`)) return
    const sid = String(studentId)
    setSubjects((prev) => ({ ...prev, [sid]: (prev[sid] || []).filter((n) => n !== subjectName) }))
    toast.success("Removed")
  }

  const handleRemoveSubjectAll = async (subjectName) => {
    if (!confirm(`Remove "${subjectName}" from ALL students?`)) return
    setDeletingSubject(subjectName)
    try {
      const params = new URLSearchParams({
        token, kind: "exam", subject: subjectName, month: monthKey, type: examType,
      })
      await fetch(`/api/teacher-public/academy-academic?${params.toString()}`, { method: 'DELETE' })
      setSubjects((prev) => {
        const copy = {}
        Object.entries(prev).forEach(([sid, names]) => {
          copy[sid] = (names || []).filter((n) => n !== subjectName)
        })
        return copy
      })
      setExams((prev) => {
        const copy = { ...prev }
        Object.keys(copy).forEach((k) => { if (k.endsWith(`__${subjectName}`)) delete copy[k] })
        return copy
      })
      toast.success(`"${subjectName}" removed`)
    } catch (err) {
      console.error(err)
      toast.error("Failed to remove")
    }
    setDeletingSubject(null)
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

      await fetch('/api/teacher-public/academy-academic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token, kind: "exam", studentId, course, section, year,
          month: monthKey, type: examType, subject: subjectName, obtained, total,
        }),
      })
    } catch (err) {
      console.error(err)
      toast.error("Failed to save")
    }
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
      await fetch("/api/teacher-public/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, studentId: row.student.id, message, type: "examination" }),
      })
      toast.success(`Notification sent for ${row.student.name}`)
    } catch (err) { console.error(err); toast.error("Failed to send") }
  }

  const filterClass = "px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-purple-500"

  return (
    <div className="max-w-6xl mx-auto px-4 pb-10">
      <div className="bg-white border rounded-2xl shadow-sm p-4 mb-5 flex flex-wrap items-center gap-3">
        <select className={filterClass} value={course} onChange={(e) => setCourse(e.target.value)}>
          <option value="">Course</option>
          {courses.map((c) => <option key={c._id} value={c.name}>{c.name}</option>)}
        </select>
        <select className={filterClass} value={section} onChange={(e) => setSection(e.target.value)}>
          <option value="">Section</option>
          {SECTIONS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className={filterClass} value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="">Year</option>
          {YEARS.map((y) => <option key={y}>{y}</option>)}
        </select>
        <select className={filterClass} value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="">Month</option>
          {MONTHS.map((m) => <option key={m}>{m}</option>)}
        </select>
        <select className={filterClass} value={examType} onChange={(e) => setExamType(e.target.value)}>
          {EXAM_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <button onClick={fetchAll}
          className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold">
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-slate-400">
          <LoaderIcon className="animate-spin mr-2" /> Loading...
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white border rounded-2xl p-12 text-center text-slate-400">
          <FileText size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-base font-medium">No students loaded</p>
          <p className="text-sm mt-1">Select Course, Month and Exam Type</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <button
              onClick={() => { setSubjectModal({ mode: "bulk" }); setNewSubjectName("") }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-bold shadow-md">
              <UserPlus size={18} /> Add Subject to All
            </button>
            <div className="flex items-center gap-2 border rounded-xl px-4 py-2.5 shadow-sm bg-white">
              <Search size={16} className="text-slate-400" />
              <input type="text" placeholder="Search student..." value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="outline-none text-sm w-48 bg-transparent" />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b">
                    {["Roll No","Name","Year","Month","Examination"].map((h) => (
                      <th key={h} className="px-4 py-3.5 font-bold text-slate-600 uppercase text-[11px] text-left">{h}</th>
                    ))}
                    {subjectColumns.map((name) => (
                      <th key={name} className="px-4 py-3.5 font-bold text-slate-600 uppercase text-[11px] text-left">
                        <div className="flex items-center gap-1.5">
                          <span>{name}</span>
                          <button onClick={() => handleRemoveSubjectAll(name)} disabled={deletingSubject === name}
                            className="w-5 h-5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center disabled:opacity-50 normal-case">
                            {deletingSubject === name ? <LoaderIcon size={11} className="animate-spin" /> : <Trash2 size={11} />}
                          </button>
                        </div>
                      </th>
                    ))}
                    {["Total","Obtained","%","Status","Action"].map((h) => (
                      <th key={h} className="px-4 py-3.5 font-bold text-slate-600 uppercase text-[11px] text-center">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const hasSubject = (name) => row.mySubjects.some((s) => s.name === name)
                    return (
                      <tr key={row.student.id} className="border-b hover:bg-purple-50/40">
                        <td className="px-4 py-3 font-bold text-purple-600">{row.student.rollNo ?? "—"}</td>
                        <td className="px-4 py-3 font-semibold">{row.student.name}</td>
                        <td className="px-4 py-3 text-slate-600">{row.student.year || "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{monthKey}</td>
                        <td className="px-4 py-3 text-slate-600">{examType}</td>

                        {subjectColumns.map((name) => {
                          if (!hasSubject(name)) {
                            return <td key={name} className="px-4 py-3 text-center text-slate-300">—</td>
                          }
                          const cell = row.subjectMarks[name]
                          const pct = cell?.percentage ?? 0
                          return (
                            <td key={name} className="px-2 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <input type="number" min="0" value={cell?.obtained ?? ""}
                                  onChange={(e) => handleMarksChange(row.student.id, name, "obtained", e.target.value)}
                                  placeholder="Obt"
                                  className={`w-16 px-2 py-2 rounded-lg border text-center text-sm font-bold outline-none ${cell && pct < 50 ? "border-red-400 bg-red-50 text-red-700" : "border-slate-200 bg-white"}`} />
                                <span className="text-slate-400 text-sm font-bold">/</span>
                                <input type="number" min="0" value={cell?.total ?? ""}
                                  onChange={(e) => handleMarksChange(row.student.id, name, "total", e.target.value)}
                                  placeholder="Tot"
                                  className="w-16 px-2 py-2 rounded-lg border border-slate-200 bg-white text-center text-sm font-bold outline-none" />
                                <button onClick={() => handleRemoveSubject(row.student.id, name)}
                                  className="w-6 h-6 rounded-md text-slate-400 hover:text-red-600 flex items-center justify-center">
                                  <X size={13} />
                                </button>
                              </div>
                            </td>
                          )
                        })}

                        <td className="px-4 py-3 text-center font-bold">{row.sumTotal}</td>
                        <td className="px-4 py-3 text-center font-bold text-emerald-600">{row.sumObtained}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-bold ${row.overallPct >= 50 ? "text-emerald-600" : "text-red-600"}`}>
                            {row.overallPct}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${row.risk === "Risk" ? "bg-red-100 text-red-700" : row.risk === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                            {row.risk}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleSend(row)} disabled={row.lowSubjects.length === 0}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 disabled:text-slate-400 text-white">
                              <Send size={12} /> Send
                            </button>
                            <button onClick={() => { setSubjectModal({ mode: "single", studentId: row.student.id }); setNewSubjectName("") }}
                              className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center justify-center">
                              <Plus size={18} />
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

      {subjectModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className={`px-6 py-5 ${subjectModal.mode === "bulk" ? "bg-gradient-to-r from-purple-600 to-pink-600" : "bg-gradient-to-r from-emerald-500 to-teal-600"} text-white`}>
              <h3 className="text-lg font-bold">
                {subjectModal.mode === "bulk" ? "Add Subject to All Students" : "Add Subject"}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Subject Name</label>
              <input autoFocus value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { if (subjectModal.mode === "bulk") handleAddSubjectBulk(); else handleAddSubjectSingle(subjectModal.studentId) } }}
                placeholder="e.g. Grammar, Vocabulary"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none focus:border-purple-500" />
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-slate-50">
              <button onClick={() => setSubjectModal(null)} className="px-4 py-2.5 rounded-xl border text-sm">Cancel</button>
              <button
                onClick={() => subjectModal.mode === "bulk" ? handleAddSubjectBulk() : handleAddSubjectSingle(subjectModal.studentId)}
                disabled={!newSubjectName.trim()}
                className={`px-5 py-2.5 rounded-xl text-white text-sm font-semibold ${subjectModal.mode === "bulk" ? "bg-purple-600" : "bg-emerald-600"} disabled:opacity-50`}>
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}