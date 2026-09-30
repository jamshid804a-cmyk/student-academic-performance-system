import { NextResponse } from "next/server"
import { getDb } from "@/utils"
import { getCurrentSchool } from "@/utils/getCurrentSchool"

// ─────────────────────────────────────────────
// GET — FLAT attendance list for one class
//   ?grade=1st&month=MM/YYYY&section=A&session=...
// Returns one row per (student × day) with status.
// ─────────────────────────────────────────────
export async function GET(req) {
  try {
    const schoolResult = await getCurrentSchool()
    if (!schoolResult.success) {
      return NextResponse.json({ error: schoolResult.error }, { status: 401 })
    }
    const { schoolId } = schoolResult.school

    const { searchParams } = new URL(req.url)
    const grade = searchParams.get("grade")
    const month = searchParams.get("month")
    const section = searchParams.get("section")
    const session = searchParams.get("session")

    if (!grade || !month) {
      return NextResponse.json([])
    }

    const db = await getDb()

    // 1. Fetch the class's students
    const studentFilter = { schoolId, grade }
    if (section) studentFilter.section = section
    if (session) studentFilter.session = session

    const students = await db
      .collection("students")
      .find(studentFilter)
      .sort({ rollNo: 1, id: 1 })
      .toArray()

    if (students.length === 0) return NextResponse.json([])

    const ids = students.map((s) => String(s.id))

    // 2. Fetch their attendance for that month
    const records = await db
      .collection("attendance")
      .find({ schoolId, studentId: { $in: ids }, date: month })
      .toArray()

    // 3. Flatten: one row per record, with student info attached
    const byId = {}
    students.forEach((s) => { byId[String(s.id)] = s })

    const flat = records.map((r) => {
      const s = byId[String(r.studentId)] || {}
      return {
        studentId: r.studentId,
        name: s.name || "",
        grade: s.grade || "",
        section: s.section || "",
        session: s.session || "",
        rollNo: s.rollNo ?? null,
        day: r.day,
        date: r.date,
        status: r.status || (r.present ? "P" : "A"),
        present: r.status === "P" || r.present === true,
      }
    })

    return NextResponse.json(flat)
  } catch (err) {
    console.error("❌ GET /api/attendance/flat:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}