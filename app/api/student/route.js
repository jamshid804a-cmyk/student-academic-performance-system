import { NextResponse } from "next/server"
import { getDb } from "@/utils"
import { getCurrentSchool } from "@/utils/getCurrentSchool"

// ─────────────────────────────────────────────
// GET — Fetch students for the LOGGED-IN user's school
//   Supports: ?grade=&section=&session=
// ─────────────────────────────────────────────
export async function GET(req) {
  try {
    const schoolResult = await getCurrentSchool()
    if (!schoolResult.success) {
      return NextResponse.json(
        { error: schoolResult.error || "Unauthorized" },
        { status: 401 }
      )
    }

    const { schoolId } = schoolResult.school
    const { searchParams } = new URL(req.url)
    const grade = searchParams.get("grade")
    const section = searchParams.get("section")
    const session = searchParams.get("session")

    const db = await getDb()

    // ✅ schoolId is ALWAYS in the filter — this is the key security
    const filter = { schoolId }
    if (grade) filter.grade = grade
    if (section) filter.section = section
    if (session) filter.session = session

    const students = await db
      .collection("students")
      .find(filter)
      .sort({ id: 1 })
      .toArray()

    const formatted = students.map((s) => ({
      ...s,
      id: s.id ?? null,
      _id: s._id.toString(),
    }))

    return NextResponse.json(formatted)
  } catch (err) {
    console.error("❌ GET /api/student:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// POST — Create a new student, tagged with schoolId
// ─────────────────────────────────────────────
export async function POST(req) {
  try {
    const schoolResult = await getCurrentSchool()
    if (!schoolResult.success) {
      return NextResponse.json(
        { error: schoolResult.error || "Unauthorized" },
        { status: 401 }
      )
    }

    const { schoolId } = schoolResult.school
    const data = await req.json()

    if (!data.name || !data.grade) {
      return NextResponse.json(
        { error: "name and grade are required" },
        { status: 400 }
      )
    }

    const db = await getDb()
    const collection = db.collection("students")

    // Auto-generate the next numeric id (1, 2, 3...) per school
    const last = await collection
      .find({ schoolId })
      .sort({ id: -1 })
      .limit(1)
      .toArray()
    const nextId = last.length > 0 ? Number(last[0].id) + 1 : 1

    const doc = {
      ...data,
      id: data.id ?? nextId,
      schoolId,                        // ✅ tag with school
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await collection.insertOne(doc)

    return NextResponse.json({
      success: true,
      id: result.insertedId.toString(),
      studentId: doc.id,
    })
  } catch (err) {
    console.error("❌ POST /api/student:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}