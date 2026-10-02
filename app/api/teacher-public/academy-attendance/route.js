import { NextResponse } from "next/server"
import { getDb } from "@/utils"

async function resolveTeacher(db, token) {
  if (!token) return null
  const teacher = await db.collection("teachers").findOne({ publicToken: token })
  if (!teacher) return null
  if (teacher.program !== "academy") return null
  if (teacher.status && teacher.status.toLowerCase() !== "active") return null
  return teacher
}

// ─────────────────────────────────────────────
// GET — public academy attendance for a teacher's course/section/batch
//   ?token=...&course=...&section=A&batchNo=Batch 1&month=MM/YYYY
// ─────────────────────────────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get("token")
    const course = searchParams.get("course")
    const section = searchParams.get("section")
    const batchNo = searchParams.get("batchNo")
    const month = searchParams.get("month")

    if (!token || !course || !month) {
      return NextResponse.json({ students: [], attendance: [] })
    }

    const db = await getDb()
    const teacher = await resolveTeacher(db, token)
    if (!teacher) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 })
    }

    // Confirm the teacher actually teaches this course/section
    const classes = Array.isArray(teacher.classes) ? teacher.classes : []
    const allowed = classes.some((c) => {
      const cName = c.course || c.grade
      if (cName !== course) return false
      if (c.section && section && c.section !== section) return false
      if (c.batchNo && batchNo && c.batchNo !== batchNo) return false
      return true
    })
    if (!allowed) {
      return NextResponse.json({ error: "Course not assigned to you" }, { status: 403 })
    }

    const studentFilter = {
      schoolId: teacher.schoolId,
      program: "academy",
      subject: course,
    }
    if (section) studentFilter.section = section
    if (batchNo) studentFilter.batchNo = batchNo

    const students = await db
      .collection("students")
      .find(studentFilter)
      .sort({ rollNo: 1, id: 1 })
      .toArray()

    const ids = students.map((s) => String(s.id))

    const records = await db
      .collection("attendance")
      .find({
        schoolId: teacher.schoolId,
        program: "academy",
        studentId: { $in: ids },
        date: month,
      })
      .toArray()

    return NextResponse.json({
      students: students.map((s) => ({
        id: s.id,
        name: s.name,
        rollNo: s.rollNo ?? null,
        subject: s.subject,
        section: s.section,
        batchNo: s.batchNo,
      })),
      attendance: records.map((r) => ({
        studentId: r.studentId,
        day: r.day,
        status: r.status || "A",
      })),
    })
  } catch (err) {
    console.error("❌ GET /api/teacher-public/academy-attendance:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// POST — save attendance
//   Body: { token, studentId, day, date, status }
// ─────────────────────────────────────────────
export async function POST(req) {
  try {
    const body = await req.json()
    const { token, studentId, day, date, status } = body

    if (!token || !studentId || !day || !date || !status) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const db = await getDb()
    const teacher = await resolveTeacher(db, token)
    if (!teacher) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 })
    }

    // Confirm the student belongs to this teacher's schoolId + program
    const student = await db.collection("students").findOne({
      schoolId: teacher.schoolId,
      program: "academy",
      id: Number(studentId),
    })
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Confirm the teacher teaches this student's course
    const classes = Array.isArray(teacher.classes) ? teacher.classes : []
    const allowed = classes.some((c) => {
      const cName = c.course || c.grade
      return cName === student.subject &&
        (!c.section || !student.section || c.section === student.section) &&
        (!c.batchNo || !student.batchNo || c.batchNo === student.batchNo)
    })
    if (!allowed) {
      return NextResponse.json({ error: "Not your student" }, { status: 403 })
    }

    await db.collection("attendance").updateOne(
      {
        schoolId: teacher.schoolId,
        program: "academy",
        studentId: String(studentId),
        day: Number(day),
        date,
      },
      {
        $set: {
          schoolId: teacher.schoolId,
          program: "academy",
          studentId: String(studentId),
          day: Number(day),
          date,
          status: String(status).toUpperCase(),
          present: status === "P",
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("❌ POST /api/teacher-public/academy-attendance:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// DELETE — remove attendance
//   ?token=...&studentId=1&day=15&date=MM/YYYY
// ─────────────────────────────────────────────
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get("token")
    const studentId = searchParams.get("studentId")
    const day = searchParams.get("day")
    const date = searchParams.get("date")

    if (!token || !studentId || !day || !date) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const db = await getDb()
    const teacher = await resolveTeacher(db, token)
    if (!teacher) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 })
    }

    await db.collection("attendance").deleteOne({
      schoolId: teacher.schoolId,
      program: "academy",
      studentId: String(studentId),
      day: Number(day),
      date,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("❌ DELETE /api/teacher-public/academy-attendance:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}