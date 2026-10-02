import { NextResponse } from "next/server"
import { getDb } from "@/utils"
import { ObjectId } from "mongodb"

// ─────────────────────────────────────────────
// Helper: load org by email + ensure it's an academy-capable org
// ─────────────────────────────────────────────
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
// GET — list all academy students for the org
//   ?email=user@example.com  (required)
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

    const students = await db
      .collection("students")
      .find({ schoolId: org.schoolId, program: "academy" })
      .sort({ createdAt: -1 })
      .toArray()

    return NextResponse.json({
      success: true,
      students: students.map((s) => ({
        _id: s._id.toString(),
        name: s.name || "",
        fatherName: s.fatherName || "",
        phone: s.phone || "",
        subject: s.subject || "",
        batch: s.batch || "",
        monthlyFee: Number(s.monthlyFee) || 0,
        admissionDate: s.admissionDate || null,
        createdAt: s.createdAt,
      })),
    })
  } catch (err) {
    console.error("❌ GET /api/academy/student:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// POST — create a new academy student
//   Body: { email, name, subject, batch, fatherName?, phone?, monthlyFee?, admissionDate? }
// ─────────────────────────────────────────────
export async function POST(req) {
  try {
    const body = await req.json()
    const email = body.email
    const name = String(body.name || "").trim()
    const subject = String(body.subject || "").trim()
    const batch = String(body.batch || "").trim()
    const fatherName = String(body.fatherName || "").trim()
    const phone = String(body.phone || "").trim()
    const monthlyFee = Number(body.monthlyFee) || 0
    const admissionDate = body.admissionDate || null

    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: "Student name is required" },
        { status: 400 }
      )
    }
    if (!subject) {
      return NextResponse.json(
        { error: "Subject is required" },
        { status: 400 }
      )
    }
    if (!batch) {
      return NextResponse.json(
        { error: "Batch is required" },
        { status: 400 }
      )
    }

    const db = await getDb()
    const { org, error, status } = await loadAcademyOrg(db, email)
    if (error) {
      return NextResponse.json({ error }, { status })
    }

    const doc = {
      name,
      fatherName,
      phone,
      subject,
      batch,
      monthlyFee,
      admissionDate: admissionDate ? new Date(admissionDate) : new Date(),
      // Standard ownership fields
      schoolId: org.schoolId,
      orgId: org._id.toString(),
      program: "academy",
      createdAt: new Date(),
    }

    const result = await db.collection("students").insertOne(doc)

    return NextResponse.json({
      success: true,
      student: {
        _id: result.insertedId.toString(),
        ...doc,
      },
    })
  } catch (err) {
    console.error("❌ POST /api/academy/student:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// DELETE — remove an academy student
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

    const result = await db.collection("students").deleteOne({
      _id,
      schoolId: org.schoolId,
      program: "academy",
    })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("❌ DELETE /api/academy/student:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}