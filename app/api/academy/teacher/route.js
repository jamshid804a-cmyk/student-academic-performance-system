import { NextResponse } from "next/server"
import { getDb } from "@/utils"
import { ObjectId } from "mongodb"

async function loadAcademyOrg(db, email) {
  if (!email) return { error: "email required", status: 400 }
  const org = await db
    .collection("schools")
    .findOne({ email: String(email).toLowerCase().trim() })
  if (!org) return { error: "No organization", status: 404 }

  const pkg = org.package || "school"
  if (pkg !== "academy" && pkg !== "both") {
    return { error: "Academy section not available", status: 400 }
  }
  return { org }
}

// ─────────────────────────────────────────────
// GET — list academy teachers
//   ?email=user@example.com
// ─────────────────────────────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get("email")

    const db = await getDb()
    const { org, error, status } = await loadAcademyOrg(db, email)
    if (error) {
      return NextResponse.json({ error }, { status })
    }

    const teachers = await db
      .collection("teachers")
      .find({ schoolId: org.schoolId, program: "academy" })
      .sort({ createdAt: -1 })
      .toArray()

    return NextResponse.json({
      success: true,
      teachers: teachers.map((t) => ({
        _id: t._id.toString(),
        name: t.name || "",
        subject: t.subject || "",
        phone: t.phone || "",
        salary: Number(t.salary) || 0,
        joiningDate: t.joiningDate || null,
        createdAt: t.createdAt,
      })),
    })
  } catch (err) {
    console.error("❌ GET /api/academy/teacher:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// POST — create academy teacher
//   Body: { email, name, subject, phone?, salary?, joiningDate? }
// ─────────────────────────────────────────────
export async function POST(req) {
  try {
    const body = await req.json()
    const email = body.email
    const name = String(body.name || "").trim()
    const subject = String(body.subject || "").trim()
    const phone = String(body.phone || "").trim()
    const salary = Number(body.salary) || 0
    const joiningDate = body.joiningDate || null

    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: "Teacher name is required" },
        { status: 400 }
      )
    }
    if (!subject) {
      return NextResponse.json({ error: "Subject is required" }, { status: 400 })
    }

    const db = await getDb()
    const { org, error, status } = await loadAcademyOrg(db, email)
    if (error) {
      return NextResponse.json({ error }, { status })
    }

    const doc = {
      name,
      subject,
      phone,
      salary,
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      schoolId: org.schoolId,
      orgId: org._id.toString(),
      program: "academy",
      createdAt: new Date(),
    }

    const result = await db.collection("teachers").insertOne(doc)

    return NextResponse.json({
      success: true,
      teacher: { _id: result.insertedId.toString(), ...doc },
    })
  } catch (err) {
    console.error("❌ POST /api/academy/teacher:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// DELETE — remove academy teacher
//   ?id=xxx&email=user@example.com
// ─────────────────────────────────────────────
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    const email = searchParams.get("email")

    if (!id || !email) {
      return NextResponse.json(
        { error: "id and email required" },
        { status: 400 }
      )
    }

    const db = await getDb()
    const { org, error, status } = await loadAcademyOrg(db, email)
    if (error) {
      return NextResponse.json({ error }, { status })
    }

    let _id
    try {
      _id = new ObjectId(id)
    } catch {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 })
    }

    const result = await db.collection("teachers").deleteOne({
      _id,
      schoolId: org.schoolId,
      program: "academy",
    })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("❌ DELETE /api/academy/teacher:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}