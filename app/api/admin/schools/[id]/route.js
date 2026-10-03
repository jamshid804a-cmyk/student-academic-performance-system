import { NextResponse } from "next/server"
import { getDb } from "@/utils"
import { ObjectId } from "mongodb"

const OWNER_EMAIL = "jamshid804a@gmail.com"

function isOwnerEmail(email) {
  if (!email) return false
  return String(email).toLowerCase().trim() === OWNER_EMAIL.toLowerCase()
}

async function resolveId(db, id) {
  try {
    return new ObjectId(id)
  } catch {
    const bySchoolId = await db.collection("schools").findOne({ schoolId: id })
    return bySchoolId?._id || null
  }
}

// ─────────────────────────────────────────────
// GET — one org
//   ?email=jamshid804a@gmail.com
// ─────────────────────────────────────────────
export async function GET(req, { params }) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get("email")
    if (!isOwnerEmail(email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getDb()
    const _id = await resolveId(db, params.id)
    if (!_id) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const school = await db.collection("schools").findOne({ _id })
    if (!school) return NextResponse.json({ error: "Not found" }, { status: 404 })

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
// PATCH — update org (suspend/activate/price/etc)
//   Body: { email (owner), ...fields }
// ─────────────────────────────────────────────
export async function PATCH(req, { params }) {
  try {
    const body = await req.json()
    const ownerEmail = body.email
    if (!isOwnerEmail(ownerEmail)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getDb()
    const _id = await resolveId(db, params.id)
    if (!_id) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const patch = { updatedAt: new Date() }

    if (body.schoolName !== undefined) patch.schoolName = String(body.schoolName).trim()
    if (body.ownerName !== undefined) patch.ownerName = String(body.ownerName).trim()
    if (body.note !== undefined) patch.note = String(body.note).trim()
    if (body.package !== undefined) {
      const p = String(body.package)
      if (["school", "academy", "both"].includes(p)) patch.package = p
    }

    if (body.schoolSection && typeof body.schoolSection === "object") {
      const s = body.schoolSection
      if (s.active !== undefined) patch["schoolSection.active"] = Boolean(s.active)
      if (s.expiresAt !== undefined)
        patch["schoolSection.expiresAt"] = s.expiresAt ? new Date(s.expiresAt) : null
      if (s.price !== undefined) patch["schoolSection.price"] = Number(s.price) || 0
      if (s.priceNote !== undefined) patch["schoolSection.priceNote"] = String(s.priceNote)

      if (s.active !== undefined) patch.active = Boolean(s.active)
      if (s.expiresAt !== undefined)
        patch.expiresAt = s.expiresAt ? new Date(s.expiresAt) : null
    }

    if (body.academySection && typeof body.academySection === "object") {
      const a = body.academySection
      if (a.active !== undefined) patch["academySection.active"] = Boolean(a.active)
      if (a.expiresAt !== undefined)
        patch["academySection.expiresAt"] = a.expiresAt ? new Date(a.expiresAt) : null
      if (a.price !== undefined) patch["academySection.price"] = Number(a.price) || 0
      if (a.priceNote !== undefined) patch["academySection.priceNote"] = String(a.priceNote)
    }

    if (patch["schoolSection.active"] === true && patch["schoolSection.expiresAt"] === undefined) {
      patch["schoolSection.expiresAt"] = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      patch.expiresAt = patch["schoolSection.expiresAt"]
    }
    if (patch["academySection.active"] === true && patch["academySection.expiresAt"] === undefined) {
      patch["academySection.expiresAt"] = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }

    const result = await db
      .collection("schools")
      .updateOne({ _id }, { $set: patch })

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("❌ PATCH /api/admin/schools/[id]:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// DELETE — remove org + its data
//   ?email=jamshid804a@gmail.com
// ─────────────────────────────────────────────
export async function DELETE(req, { params }) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get("email")
    if (!isOwnerEmail(email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getDb()
    const _id = await resolveId(db, params.id)
    if (!_id) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const school = await db.collection("schools").findOne({ _id })
    if (!school) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await db.collection("schools").deleteOne({ _id })

    const schoolId = school.schoolId
    if (schoolId) {
      const collections = [
        "students", "attendance", "tests", "exams",
        "fees", "notifications", "teachers", "teacher_attendance",
        "academy_courses",
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