import { NextResponse } from "next/server"
import { getDb } from "@/utils"

// ─────────────────────────────────────────────
// GET — FLAT attendance list for one course+batch
//   ?email=user@example.com&course=...&section=A&batch=Batch 1&year=2025&month=MM/YYYY
// Returns one row per (student × day) with status.
// ─────────────────────────────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get("email")
    const course = searchParams.get("course")
    const section = searchParams.get("section")
    const batch = searchParams.get("batch")
    const year = searchParams.get("year")
    const month = searchParams.get("month")

    if (!email) {
      return NextResponse.json({ error: "email required" }, { status: 400 })
    }
    if (!course || !month) {
      return NextResponse.json([])
    }

    const db = await getDb()
    const org = await db
      .collection("schools")
      .findOne({ email: String(email).toLowerCase().trim() })

    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 })
    }

    // 1. Fetch students for course + optional section / batch / year
    const studentFilter = {
      schoolId: org.schoolId,
      program: "academy",
      subject: course,
    }
    if (section) studentFilter.section = section
    if (batch) studentFilter.batchNo = batch
    if (year) studentFilter.year = year

    const students = await db
      .collection("students")
      .find(studentFilter)
      .sort({ rollNo: 1, id: 1 })
      .toArray()

    if (students.length === 0) return NextResponse.json([])

    const ids = students.map((s) => String(s.id))

    // 2. Fetch attendance for those students in that month
    const records = await db
      .collection("attendance")
      .find({
        schoolId: org.schoolId,
        program: "academy",
        studentId: { $in: ids },
        date: month,
      })
      .toArray()

    // 3. Flatten
    const byId = {}
    students.forEach((s) => { byId[String(s.id)] = s })

    const flat = records.map((r) => {
      const s = byId[String(r.studentId)] || {}
      return {
        studentId: r.studentId,
        name: s.name || "",
        course: s.subject || "",
        grade: s.subject || "",     // RiskBox uses .grade
        section: s.section || "",
        batchNo: s.batchNo || "",
        year: s.year || "",
        rollNo: s.rollNo ?? null,
        day: r.day,
        date: r.date,
        status: r.status || (r.present ? "P" : "A"),
        present: r.status === "P" || r.present === true,
      }
    })

    return NextResponse.json(flat)
  } catch (err) {
    console.error("❌ GET /api/academy/attendance/flat:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}