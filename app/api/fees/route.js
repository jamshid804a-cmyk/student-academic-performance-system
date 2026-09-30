import { NextResponse } from "next/server"
import { getDb } from "@/utils"
import { ObjectId } from "mongodb"
import { getCurrentSchool } from "@/utils/getCurrentSchool"

// ─────────────────────────────────────────────
// GET — fee payments for the LOGGED-IN user's school
//   ?grade=&section=&session=&month=MM/YYYY
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

    const db = await getDb()

    // ✅ schoolId always in the filter
    const filter = { schoolId }
    if (grade) filter.grade = grade
    if (section) filter.section = section
    if (session) filter.session = session
    if (month) filter.month = month

    const records = await db
      .collection("fees")
      .find(filter)
      .sort({ paidAt: -1 })
      .toArray()

    return NextResponse.json(
      records.map((r) => ({ ...r, _id: r._id.toString() }))
    )
  } catch (err) {
    console.error("❌ GET /api/fees:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// POST — record a fee payment (tagged with schoolId)
// ─────────────────────────────────────────────
export async function POST(req) {
  try {
    const schoolResult = await getCurrentSchool()
    if (!schoolResult.success) {
      return NextResponse.json({ error: schoolResult.error }, { status: 401 })
    }
    const { schoolId } = schoolResult.school

    const data = await req.json()
    const { studentId, grade, section, session, month, amount, paidDate, note } = data

    if (!studentId || !month || amount === undefined) {
      return NextResponse.json(
        { error: "studentId, month, amount are required" },
        { status: 400 }
      )
    }

    const db = await getDb()
    const doc = {
      schoolId,                          // ✅ tag with school
      studentId: String(studentId),
      grade: grade || "",
      section: section || "",
      session: session || "",
      month: String(month),
      amount: Number(amount) || 0,
      paidDate: paidDate || "",
      note: note || "",
      paidAt: new Date(),
    }

    const result = await db.collection("fees").insertOne(doc)

    return NextResponse.json({
      success: true,
      id: result.insertedId.toString(),
    })
  } catch (err) {
    console.error("❌ POST /api/fees:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// PUT — delete all fee records for a student in one month
//   Body: { studentId, session, month }
// ─────────────────────────────────────────────
export async function PUT(req) {
  try {
    const schoolResult = await getCurrentSchool()
    if (!schoolResult.success) {
      return NextResponse.json({ error: schoolResult.error }, { status: 401 })
    }
    const { schoolId } = schoolResult.school

    const body = await req.json()
    const { studentId, session, month } = body

    if (!studentId || !month) {
      return NextResponse.json(
        { error: "studentId and month are required" },
        { status: 400 }
      )
    }

    const db = await getDb()

    const filter = { schoolId, studentId: String(studentId), month: String(month) }
    if (session) filter.session = session

    const result = await db.collection("fees").deleteMany(filter)

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
    })
  } catch (err) {
    console.error("❌ PUT /api/fees:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// DELETE — remove one fee payment (only your school's)
// ─────────────────────────────────────────────
export async function DELETE(req) {
  try {
    const schoolResult = await getCurrentSchool()
    if (!schoolResult.success) {
      return NextResponse.json({ error: schoolResult.error }, { status: 401 })
    }
    const { schoolId } = schoolResult.school

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 })
    }

    const db = await getDb()
    const result = await db.collection("fees").deleteOne({
      _id: new ObjectId(id),
      schoolId,
    })

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
    })
  } catch (err) {
    console.error("❌ DELETE /api/fees:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}