import { NextResponse } from "next/server"
import { getDb } from "@/utils"
import { ObjectId } from "mongodb"
import { getCurrentSchool } from "@/utils/getCurrentSchool"

// ─────────────────────────────────────────────
// GET — one student (only if it belongs to your school)
// ─────────────────────────────────────────────
export async function GET(req, { params }) {
  try {
    const schoolResult = await getCurrentSchool()
    if (!schoolResult.success) {
      return NextResponse.json({ error: schoolResult.error }, { status: 401 })
    }

    const { schoolId } = schoolResult.school
    const { id } = params
    const db = await getDb()

    let student = null
    try {
      student = await db.collection("students").findOne({
        _id: new ObjectId(id),
        schoolId,
      })
    } catch {
      // not an ObjectId, try numeric id
    }
    if (!student) {
      student = await db.collection("students").findOne({
        id: Number(id),
        schoolId,
      })
    }

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    return NextResponse.json({ ...student, _id: student._id.toString() })
  } catch (err) {
    console.error("❌ GET /api/student/[id]:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// PUT — update a student (only your school's)
// ─────────────────────────────────────────────
export async function PUT(req, { params }) {
  try {
    const schoolResult = await getCurrentSchool()
    if (!schoolResult.success) {
      return NextResponse.json({ error: schoolResult.error }, { status: 401 })
    }

    const { schoolId } = schoolResult.school
    const { id } = params
    const data = await req.json()
    const db = await getDb()

    let _id
    try {
      _id = new ObjectId(id)
    } catch {
      const byNum = await db.collection("students").findOne({
        id: Number(id),
        schoolId,
      })
      if (!byNum) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 })
      }
      _id = byNum._id
    }

    // Never allow the client to change _id, id, or schoolId
    const { _id: _ignore1, id: _ignore2, schoolId: _ignore3, ...patch } = data
    patch.updatedAt = new Date()

    const result = await db.collection("students").updateOne(
      { _id, schoolId },
      { $set: patch }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("❌ PUT /api/student/[id]:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// DELETE — remove a student (only your school's)
// ─────────────────────────────────────────────
export async function DELETE(req, { params }) {
  try {
    const schoolResult = await getCurrentSchool()
    if (!schoolResult.success) {
      return NextResponse.json({ error: schoolResult.error }, { status: 401 })
    }

    const { schoolId } = schoolResult.school
    const { id } = params
    const db = await getDb()

    let _id
    try {
      _id = new ObjectId(id)
    } catch {
      const byNum = await db.collection("students").findOne({
        id: Number(id),
        schoolId,
      })
      if (!byNum) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 })
      }
      _id = byNum._id
    }

    const result = await db.collection("students").deleteOne({ _id, schoolId })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("❌ DELETE /api/student/[id]:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}