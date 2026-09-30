import { NextResponse } from "next/server"
import { getDb } from "@/utils"
import { getCurrentSchool } from "@/utils/getCurrentSchool"

// ─────────────────────────────────────────────
// GET — attendance for the LOGGED-IN user's school
//   ?studentId=1  → records for one student
//   ?grade=1st&month=MM/YYYY&section=A&session=... → class-wide
// ─────────────────────────────────────────────
export async function GET(req) {
  try {
    const schoolResult = await getCurrentSchool()
    if (!schoolResult.success) {
      return NextResponse.json({ error: schoolResult.error }, { status: 401 })
    }
    const { schoolId } = schoolResult.school

    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get("studentId")
    const grade = searchParams.get("grade")
    const month = searchParams.get("month")
    const section = searchParams.get("section")
    const session = searchParams.get("session")

    const db = await getDb()

    if (studentId) {
      // One student's records
      const records = await db
        .collection("attendance")
        .find({ schoolId, studentId: String(studentId) })
        .sort({ day: 1 })
        .toArray()

      return NextResponse.json(
        records.map((r) => ({ ...r, id: r._id.toString(), _id: undefined }))
      )
    }

    // Class-wide attendance: fetch students first, then their records
    const studentFilter = { schoolId }
    if (grade) studentFilter.grade = grade
    if (section) studentFilter.section = section
    if (session) studentFilter.session = session

    const students = await db
      .collection("students")
      .find(studentFilter)
      .sort({ rollNo: 1, id: 1 })
      .toArray()

    if (students.length === 0) return NextResponse.json([])

    const studentIds = students.map((s) => String(s.id))

    const attFilter = { schoolId, studentId: { $in: studentIds } }
    if (month) attFilter.date = month

    const records = await db
      .collection("attendance")
      .find(attFilter)
      .toArray()

    // Build a map: studentId → { day: status }
    const byStudent = {}
    records.forEach((r) => {
      const sid = String(r.studentId)
      if (!byStudent[sid]) byStudent[sid] = {}
      byStudent[sid][String(r.day)] = r.status || (r.present ? "P" : "A")
    })

    const response = students.map((s) => ({
      studentId: s.id,
      rollNo: s.rollNo,
      name: s.name,
      grade: s.grade,
      section: s.section,
      session: s.session,
      attendance: byStudent[String(s.id)] || {},
    }))

    return NextResponse.json(response)
  } catch (err) {
    console.error("❌ GET /api/attendance:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// POST — save one attendance record (tagged with schoolId)
// ─────────────────────────────────────────────
export async function POST(req) {
  try {
    const schoolResult = await getCurrentSchool()
    if (!schoolResult.success) {
      return NextResponse.json({ error: schoolResult.error }, { status: 401 })
    }
    const { schoolId } = schoolResult.school

    const data = await req.json()
    const { studentId, day, date, status, present } = data

    if (!studentId || day === undefined || !date) {
      return NextResponse.json(
        { error: "studentId, day, date are required" },
        { status: 400 }
      )
    }

    // Resolve status from either `status` (P/A/L) or legacy `present` boolean
    const finalStatus =
      status || (present === true ? "P" : present === false ? "A" : "P")

    const db = await getDb()
    const collection = db.collection("attendance")

    await collection.updateOne(
      {
        schoolId,
        studentId: String(studentId),
        day: Number(day),
        date: String(date),
      },
      {
        $set: {
          schoolId,
          studentId: String(studentId),
          day: Number(day),
          date: String(date),
          status: String(finalStatus).toUpperCase(),
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("❌ POST /api/attendance:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// DELETE — remove one day's record (only your school's)
//   ?studentId=1&day=15&month=MM/YYYY
// ─────────────────────────────────────────────
export async function DELETE(req) {
  try {
    const schoolResult = await getCurrentSchool()
    if (!schoolResult.success) {
      return NextResponse.json({ error: schoolResult.error }, { status: 401 })
    }
    const { schoolId } = schoolResult.school

    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get("studentId")
    const day = searchParams.get("day")
    const month = searchParams.get("month")

    if (!studentId || day === null || !month) {
      return NextResponse.json(
        { error: "studentId, day, month are required" },
        { status: 400 }
      )
    }

    const db = await getDb()
    await db.collection("attendance").deleteOne({
      schoolId,
      studentId: String(studentId),
      day: Number(day),
      date: String(month),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("❌ DELETE /api/attendance:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}