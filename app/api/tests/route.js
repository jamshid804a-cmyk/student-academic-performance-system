import { NextResponse } from "next/server"
import { getDb } from "@/utils"
import { getCurrentSchool } from "@/utils/getCurrentSchool"

// ─────────────────────────────────────────────
// GET — tests for the LOGGED-IN user's school
//   ?grade=1st&section=A&session=...&month=MM/YYYY&testType=Monthly
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
    const testType = searchParams.get("testType")

    const db = await getDb()

    // ✅ schoolId always present
    const filter = { schoolId }
    if (grade) filter.grade = grade
    if (section) filter.section = section
    if (session) filter.session = session
    if (month) filter.month = month
    if (testType) filter.testType = testType

    const tests = await db
      .collection("tests")
      .find(filter)
      .toArray()

    return NextResponse.json(
      tests.map((t) => ({ ...t, _id: t._id.toString() }))
    )
  } catch (err) {
    console.error("❌ GET /api/tests:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// POST — save/update test marks (tagged with schoolId)
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
      month, testType, subject, marks, totalMarks,
    } = data

    if (!studentId || !subject || !month || !testType) {
      return NextResponse.json(
        { error: "studentId, subject, month, testType are required" },
        { status: 400 }
      )
    }

    const db = await getDb()
    const collection = db.collection("tests")

    // Compute percentage safely
    const totalNum = Number(totalMarks) || 100
    const marksNum = Number(marks) || 0
    const percentage = totalNum > 0
      ? Math.round((marksNum / totalNum) * 100)
      : 0

    // Upsert: one test per (school × student × subject × month × testType)
    await collection.updateOne(
      {
        schoolId,
        studentId: String(studentId),
        subject: String(subject),
        month: String(month),
        testType: String(testType),
      },
      {
        $set: {
          schoolId,
          studentId: String(studentId),
          grade: grade || "",
          section: section || "",
          session: session || "",
          month: String(month),
          testType: String(testType),
          subject: String(subject),
          marks: marksNum,
          totalMarks: totalNum,
          percentage,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("❌ POST /api/tests:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// DELETE — remove a specific test (only your school's)
//   ?studentId=1&subject=Math&month=MM/YYYY&testType=Monthly
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
    const testType = searchParams.get("testType")

    if (!studentId || !subject || !month || !testType) {
      return NextResponse.json(
        { error: "studentId, subject, month, testType are required" },
        { status: 400 }
      )
    }

    const db = await getDb()
    await db.collection("tests").deleteOne({
      schoolId,
      studentId: String(studentId),
      subject: String(subject),
      month: String(month),
      testType: String(testType),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("❌ DELETE /api/tests:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}