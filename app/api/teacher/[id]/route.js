import { NextResponse } from "next/server"
import { getDb } from "@/utils"
import { ObjectId } from "mongodb"
import { getCurrentSchool } from "@/utils/getCurrentSchool"
import crypto from "crypto"

// ─────────────────────────────────────────────
// GET — one teacher (only if it belongs to your school)
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

    let teacher = null
    try {
      teacher = await db.collection("teachers").findOne({
        _id: new ObjectId(id),
        schoolId,
      })
    } catch {}
    if (!teacher) {
      teacher = await db.collection("teachers").findOne({ teacherId: id, schoolId })
    }

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 })
    }

    return NextResponse.json({ ...teacher, _id: teacher._id.toString() })
  } catch (err) {
    console.error("❌ GET /api/teacher/[id]:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// PUT — update a teacher (only your school's)
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
      const byTid = await db.collection("teachers").findOne({
        teacherId: id,
        schoolId,
      })
      if (!byTid) {
        return NextResponse.json({ error: "Teacher not found" }, { status: 404 })
      }
      _id = byTid._id
    }

    const allowed = [
      "name", "email", "phone", "classes", "qualification",
      "subject", "joiningDate", "salary", "address", "status",
    ]
    const patch = {}
    for (const key of allowed) {
      if (data[key] !== undefined) patch[key] = data[key]
    }
    if (patch.email) patch.email = String(patch.email).trim().toLowerCase()
    if (patch.salary !== undefined) patch.salary = Number(patch.salary) || 0
    patch.updatedAt = new Date()

    const result = await db
      .collection("teachers")
      .updateOne({ _id, schoolId }, { $set: patch })

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("❌ PUT /api/teacher/[id]:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// DELETE — remove a teacher (only your school's)
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
      const byTid = await db.collection("teachers").findOne({
        teacherId: id,
        schoolId,
      })
      if (!byTid) {
        return NextResponse.json({ error: "Teacher not found" }, { status: 404 })
      }
      _id = byTid._id
    }

    const result = await db
      .collection("teachers")
      .deleteOne({ _id, schoolId })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("❌ DELETE /api/teacher/[id]:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// PATCH — regenerate public token (only your school's)
// ─────────────────────────────────────────────
export async function PATCH(req, { params }) {
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
      const byTid = await db.collection("teachers").findOne({
        teacherId: id,
        schoolId,
      })
      if (!byTid) {
        return NextResponse.json({ error: "Teacher not found" }, { status: 404 })
      }
      _id = byTid._id
    }

    const newToken = crypto.randomBytes(16).toString("hex")
    await db.collection("teachers").updateOne(
      { _id, schoolId },
      { $set: { publicToken: newToken, updatedAt: new Date() } }
    )

    return NextResponse.json({ success: true, publicToken: newToken })
  } catch (err) {
    console.error("❌ PATCH /api/teacher/[id]:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}