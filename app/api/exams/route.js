import { NextResponse } from "next/server"
import { getDb } from "@/utils"
import { getCurrentSchool } from "@/utils/getCurrentSchool"

// ─────────────────────────────────────────────
// GET — exams for the LOGGED-IN user's school
//   ?grade=1st&section=A&session=...&month=MM/YYYY&examType=Mid Term
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
    const section = searchParams.get("section")
    const session = searchParams.get("session")
    const month = searchParams.get("month")
    const examType = searchParams.get("examType")

    const db = await getDb()

    const filter = { schoolId }
    if (grade) filter.grade = grade
    if (section) filter.section = section
    if (session) filter.session = session
    if (month) filter.month = month
    if (examType) filter.examType = examType

    const exams = await db
      .collection("exams")
      .find(filter)
      .toArray()

    return NextResponse.json(
      exams.map((e) => ({ ...e, _id: e._id.toString() }))
    )
  } catch (err) {
    console.error("❌ GET /api/exams:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// POST — save/update exam marks (tagged with schoolId)
// ─────────────────────────────────────────────
export async function POST(req) {
  try {
    const schoolResult = await getCurrentSchool()
    if (!schoolResult.success) {
      return NextResponse.json({ error: schoolResult.error }, { status: 401 })
    }
    const { schoolId } = schoolResult.school

    const data = await req.json()
    const {
      studentId, grade, section, session,
      month, examType, subject, obtained, total,
    } = data

    if (!studentId || !subject || !month || !examType) {
      return NextResponse.json(
        { error: "studentId, subject, month, examType are required" },
        { status: 400 }
      )
    }

    const db = await getDb()
    const collection = db.collection("exams")

    const obtNum = Number(obtained) || 0
    const totNum = Number(total) || 0
    const percentage = totNum > 0 ? Math.round((obtNum / totNum) * 100) : 0

    await collection.updateOne(
      {
        schoolId,
        studentId: String(studentId),
        subject: String(subject),
        month: String(month),
        examType: String(examType),
      },
      {
        $set: {
          schoolId,
          studentId: String(studentId),
          grade: grade || "",
          section: section || "",
          session: session || "",
          month: String(month),
          examType: String(examType),
          subject: String(subject),
          obtained: obtNum,
          total: totNum,
          percentage,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("❌ POST /api/exams:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// DELETE — remove a specific exam (only your school's)
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
    const subject = searchParams.get("subject")
    const month = searchParams.get("month")
    const examType = searchParams.get("examType")

    if (!studentId || !subject || !month || !examType) {
      return NextResponse.json(
        { error: "studentId, subject, month, examType are required" },
        { status: 400 }
      )
    }

    const db = await getDb()
    await db.collection("exams").deleteOne({
      schoolId,
      studentId: String(studentId),
      subject: String(subject),
      month: String(month),
      examType: String(examType),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("❌ DELETE /api/exams:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}