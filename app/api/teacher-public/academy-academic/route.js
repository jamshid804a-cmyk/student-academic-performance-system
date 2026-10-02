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
// GET — list tests OR exams
//   ?token=...&kind=test|exam&course=X&section=A&year=2025&month=MM/YYYY&type=Monthly
// ─────────────────────────────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get("token")
    const kind = searchParams.get("kind") // "test" | "exam"
    const course = searchParams.get("course")
    const section = searchParams.get("section")
    const year = searchParams.get("year")
    const month = searchParams.get("month")
    const type = searchParams.get("type") // testType or examType

    if (!token || !kind || !course || !month) {
      return NextResponse.json([])
    }

    const db = await getDb()
    const teacher = await resolveTeacher(db, token)
    if (!teacher) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 })
    }

    const collectionName = kind === "exam" ? "exams" : "tests"
    const typeField = kind === "exam" ? "examType" : "testType"

    const filter = {
      schoolId: teacher.schoolId,
      program: "academy",
      subject: course,
      month,
    }
    if (section) filter.section = section
    if (year) filter.year = year
    if (type) filter[typeField] = type

    const records = await db
      .collection(collectionName)
      .find(filter)
      .toArray()

    return NextResponse.json(
      records.map((r) => ({ ...r, _id: r._id.toString() }))
    )
  } catch (err) {
    console.error("❌ GET /api/teacher-public/academy-academic:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// POST — save one mark
//   Body: { token, kind, studentId, course, section, year, month, type, subject, obtained, total }
// ─────────────────────────────────────────────
export async function POST(req) {
  try {
    const data = await req.json()
    const { token, kind, studentId, course, section, year, month, type, subject, obtained, total } = data

    if (!token || !kind || !studentId || !course || !month || !type || !subject) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const db = await getDb()
    const teacher = await resolveTeacher(db, token)
    if (!teacher) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 })
    }

    const student = await db.collection("students").findOne({
      schoolId: teacher.schoolId,
      program: "academy",
      id: Number(studentId),
    })
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    const collectionName = kind === "exam" ? "exams" : "tests"
    const typeField = kind === "exam" ? "examType" : "testType"

    const obt = Number(obtained) || 0
    const tot = Number(total) || 0
    const percentage = tot > 0 ? Math.round((obt / tot) * 100) : 0

    await db.collection(collectionName).updateOne(
      {
        schoolId: teacher.schoolId,
        program: "academy",
        studentId: String(studentId),
        subject,
        month,
        [typeField]: type,
      },
      {
        $set: {
          schoolId: teacher.schoolId,
          program: "academy",
          studentId: String(studentId),
          course,
          section: section || "",
          year: year || "",
          month,
          [typeField]: type,
          subject,
          obtained: obt,
          total: tot,
          percentage,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("❌ POST /api/teacher-public/academy-academic:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// DELETE — remove marks for a subject (all students or one)
//   ?token=...&kind=test|exam&subject=Maths&month=MM/YYYY&type=Monthly
// ─────────────────────────────────────────────
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get("token")
    const kind = searchParams.get("kind")
    const subject = searchParams.get("subject")
    const month = searchParams.get("month")
    const type = searchParams.get("type")
    const studentId = searchParams.get("studentId")

    if (!token || !kind || !subject) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const db = await getDb()
    const teacher = await resolveTeacher(db, token)
    if (!teacher) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 })
    }

    const collectionName = kind === "exam" ? "exams" : "tests"
    const typeField = kind === "exam" ? "examType" : "testType"

    const filter = {
      schoolId: teacher.schoolId,
      program: "academy",
      subject,
    }
    if (month) filter.month = month
    if (type) filter[typeField] = type
    if (studentId) filter.studentId = String(studentId)

    const result = await db.collection(collectionName).deleteMany(filter)

    return NextResponse.json({ success: true, deletedCount: result.deletedCount })
  } catch (err) {
    console.error("❌ DELETE /api/teacher-public/academy-academic:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}