import { NextResponse } from "next/server"
import { getDb } from "@/utils"
import { ObjectId } from "mongodb"
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server"

const OWNER_EMAIL = "jamshid804a@gmail.com"

async function isOwner() {
  try {
    const { getUser } = getKindeServerSession()
    const user = await getUser()
    if (!user?.email) return false
    return String(user.email).toLowerCase().trim() === OWNER_EMAIL.toLowerCase()
  } catch {
    return false
  }
}

// Resolve the given id (ObjectId string OR schoolId) to a real ObjectId
async function resolveId(db, id) {
  try {
    return new ObjectId(id)
  } catch {
    const bySchoolId = await db.collection("schools").findOne({ schoolId: id })
    return bySchoolId?._id || null
  }
}

// ─────────────────────────────────────────────
// GET — one school by id or schoolId
// ─────────────────────────────────────────────
export async function GET(req, { params }) {
  try {
    if (!(await isOwner())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getDb()
    const _id = await resolveId(db, params.id)
    if (!_id) {
      return NextResponse.json({ error: "School not found" }, { status: 404 })
    }

    const school = await db.collection("schools").findOne({ _id })
    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      school: { ...school, _id: school._id.toString() },
    })
  } catch (err) {
    console.error("❌ GET /api/admin/schools/[id]:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// PATCH — update a school
//   Body: { active?, schoolName?, ownerName?, note?, expiresAt? }
//   ⭐ This is what the ON/OFF toggle calls.
// ─────────────────────────────────────────────
export async function PATCH(req, { params }) {
  try {
    if (!(await isOwner())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getDb()
    const _id = await resolveId(db, params.id)
    if (!_id) {
      return NextResponse.json({ error: "School not found" }, { status: 404 })
    }

    const body = await req.json()

    // Whitelist — never allow changing schoolId or email via this route
    const patch = {}
    if (body.active !== undefined) patch.active = Boolean(body.active)
    if (body.schoolName !== undefined) patch.schoolName = String(body.schoolName).trim()
    if (body.ownerName !== undefined) patch.ownerName = String(body.ownerName).trim()
    if (body.note !== undefined) patch.note = String(body.note).trim()
    if (body.expiresAt !== undefined) patch.expiresAt = new Date(body.expiresAt)
    patch.updatedAt = new Date()

    const result = await db.collection("schools").updateOne(
      { _id },
      { $set: patch }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "School not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("❌ PATCH /api/admin/schools/[id]:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// DELETE — remove a school AND all its data
// ─────────────────────────────────────────────
export async function DELETE(req, { params }) {
  try {
    if (!(await isOwner())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getDb()
    const _id = await resolveId(db, params.id)
    if (!_id) {
      return NextResponse.json({ error: "School not found" }, { status: 404 })
    }

    const school = await db.collection("schools").findOne({ _id })
    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 })
    }

    // Delete the school document
    await db.collection("schools").deleteOne({ _id })

    // Also delete every record tagged with this schoolId (optional but clean)
    const schoolId = school.schoolId
    if (schoolId) {
      const collections = [
        "students", "attendance", "tests", "exams",
        "fees", "notifications", "teachers", "teacher_attendance",
      ]
      for (const name of collections) {
        try {
          await db.collection(name).deleteMany({ schoolId })
        } catch (e) {
          console.error(`Failed to clean ${name}:`, e.message)
        }
      }
    }

    return NextResponse.json({ success: true, deletedSchoolId: schoolId })
  } catch (err) {
    console.error("❌ DELETE /api/admin/schools/[id]:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}