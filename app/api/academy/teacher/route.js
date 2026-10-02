import { NextResponse } from "next/server"
import { getDb } from "@/utils"
import { ObjectId } from "mongodb"
import crypto from "crypto"

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

async function generateTeacherId(db, schoolId) {
  const last = await db
    .collection("teachers")
    .find({ schoolId, program: "academy", teacherId: { $regex: "^ATCH-" } })
    .sort({ teacherId: -1 })
    .limit(1)
    .toArray()

  if (last.length === 0) return "ATCH-001"
  const lastNum = parseInt(String(last[0].teacherId).replace("ATCH-", ""), 10)
  const nextNum = isNaN(lastNum) ? 1 : lastNum + 1
  return `ATCH-${String(nextNum).padStart(3, "0")}`
}

// ─────────────────────────────────────────────
// GET — list academy teachers
// ─────────────────────────────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get("email")
    const subject = searchParams.get("subject")
    const status = searchParams.get("status")

    const db = await getDb()
    const { org, error, status: errStatus } = await loadAcademyOrg(db, email)
    if (error) return NextResponse.json({ error }, { status: errStatus })

    const filter = { schoolId: org.schoolId, program: "academy" }
    if (subject) filter.subject = subject
    if (status) filter.status = status

    const teachers = await db
      .collection("teachers")
      .find(filter)
      .sort({ teacherId: 1 })
      .toArray()

    return NextResponse.json(
      teachers.map((t) => ({
        _id: t._id.toString(),
        teacherId: t.teacherId || "",
        name: t.name || "",
        email: t.email || "",
        phone: t.phone || "",
        subject: t.subject || "",
        classes: Array.isArray(t.classes) ? t.classes : [],
        qualification: t.qualification || "",
        joiningDate: t.joiningDate || "",
        salary: Number(t.salary) || 0,
        address: t.address || "",
        status: t.status || "Active",
        publicToken: t.publicToken || "",
        createdAt: t.createdAt,
      }))
    )
  } catch (err) {
    console.error("❌ GET /api/academy/teacher:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// POST — create academy teacher
// ─────────────────────────────────────────────
export async function POST(req) {
  try {
    const data = await req.json()
    const {
      email, name, email: teacherEmail, phone, classes, qualification,
      subject, joiningDate, salary, address, status,
    } = data

    if (!email) {
      return NextResponse.json({ error: "email required" }, { status: 400 })
    }
    if (!name || !teacherEmail) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 })
    }

    const db = await getDb()
    const { org, error, status: errStatus } = await loadAcademyOrg(db, email)
    if (error) return NextResponse.json({ error }, { status: errStatus })

    const collection = db.collection("teachers")

    const existing = await collection.findOne({
      schoolId: org.schoolId,
      program: "academy",
      email: String(teacherEmail).trim().toLowerCase(),
    })
    if (existing) {
      return NextResponse.json(
        { error: "A teacher with this email already exists in your academy" },
        { status: 400 }
      )
    }

    const teacherId = await generateTeacherId(db, org.schoolId)
    const publicToken = crypto.randomBytes(16).toString("hex")

    const doc = {
      schoolId: org.schoolId,
      orgId: org._id.toString(),
      program: "academy",
      teacherId,
      name: String(name).trim(),
      email: String(teacherEmail).trim().toLowerCase(),
      phone: phone ? String(phone).trim() : "",
      classes: Array.isArray(classes) ? classes : [],
      qualification: qualification ? String(qualification).trim() : "",
      subject: subject ? String(subject).trim() : "",
      joiningDate: joiningDate || "",
      salary: Number(salary) || 0,
      address: address ? String(address).trim() : "",
      status: status || "Active",
      publicToken,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await collection.insertOne(doc)

    return NextResponse.json({
      success: true,
      id: result.insertedId.toString(),
      teacherId,
      publicToken,
    })
  } catch (err) {
    console.error("❌ POST /api/academy/teacher:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// PUT — update academy teacher
// ─────────────────────────────────────────────
export async function PUT(req) {
  try {
    const data = await req.json()
    const { email, _id: teacherMongoId, ...fields } = data

    if (!email) {
      return NextResponse.json({ error: "email required" }, { status: 400 })
    }
    if (!teacherMongoId) {
      return NextResponse.json({ error: "teacher _id required" }, { status: 400 })
    }

    const db = await getDb()
    const { org, error, status } = await loadAcademyOrg(db, email)
    if (error) return NextResponse.json({ error }, { status })

    let _id
    try { _id = new ObjectId(teacherMongoId) } catch {
      return NextResponse.json({ error: "Invalid _id" }, { status: 400 })
    }

    const patch = { updatedAt: new Date() }
    if (fields.name !== undefined) patch.name = String(fields.name).trim()
    if (fields.email !== undefined) patch.email = String(fields.email).trim().toLowerCase()
    if (fields.phone !== undefined) patch.phone = String(fields.phone).trim()
    if (fields.subject !== undefined) patch.subject = String(fields.subject).trim()
    if (fields.qualification !== undefined) patch.qualification = String(fields.qualification).trim()
    if (fields.joiningDate !== undefined) patch.joiningDate = fields.joiningDate || ""
    if (fields.salary !== undefined) patch.salary = Number(fields.salary) || 0
    if (fields.address !== undefined) patch.address = String(fields.address).trim()
    if (fields.status !== undefined) patch.status = fields.status
    if (fields.classes !== undefined) patch.classes = Array.isArray(fields.classes) ? fields.classes : []

    const result = await db.collection("teachers").updateOne(
      { _id, schoolId: org.schoolId, program: "academy" },
      { $set: patch }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("❌ PUT /api/academy/teacher:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// PATCH — regenerate public token
// ─────────────────────────────────────────────
export async function PATCH(req) {
  try {
    const data = await req.json()
    const { email, _id: teacherMongoId } = data

    if (!email || !teacherMongoId) {
      return NextResponse.json({ error: "email and _id required" }, { status: 400 })
    }

    const db = await getDb()
    const { org, error, status } = await loadAcademyOrg(db, email)
    if (error) return NextResponse.json({ error }, { status })

    let _id
    try { _id = new ObjectId(teacherMongoId) } catch {
      return NextResponse.json({ error: "Invalid _id" }, { status: 400 })
    }

    const publicToken = crypto.randomBytes(16).toString("hex")

    const result = await db.collection("teachers").updateOne(
      { _id, schoolId: org.schoolId, program: "academy" },
      { $set: { publicToken, updatedAt: new Date() } }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, publicToken })
  } catch (err) {
    console.error("❌ PATCH /api/academy/teacher:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// DELETE — remove academy teacher
// ─────────────────────────────────────────────
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get("email")
    const id = searchParams.get("id")

    if (!email || !id) {
      return NextResponse.json({ error: "email and id required" }, { status: 400 })
    }

    const db = await getDb()
    const { org, error, status } = await loadAcademyOrg(db, email)
    if (error) return NextResponse.json({ error }, { status })

    let _id
    try { _id = new ObjectId(id) } catch {
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