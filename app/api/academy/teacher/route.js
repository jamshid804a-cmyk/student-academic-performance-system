import { NextResponse } from "next/server"
import { getDb } from "@/utils"
import { ObjectId } from "mongodb"
import crypto from "crypto"

async function loadAcademyOrg(db, orgEmail) {
  if (!orgEmail) return { error: "orgEmail required", status: 400 }
  const org = await db
    .collection("schools")
    .findOne({ email: String(orgEmail).toLowerCase().trim() })
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
// GET — returns { success, teachers: [] }
// ─────────────────────────────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const orgEmail = searchParams.get("orgEmail")
    const status = searchParams.get("status")

    const db = await getDb()
    const { org, error, status: errStatus } = await loadAcademyOrg(db, orgEmail)
    if (error) return NextResponse.json({ error }, { status: errStatus })

    const filter = { schoolId: org.schoolId, program: "academy" }
    if (status) filter.status = status

    const teachers = await db
      .collection("teachers")
      .find(filter)
      .sort({ teacherId: 1 })
      .toArray()

    return NextResponse.json({
      success: true,
      teachers: teachers.map((t) => ({
        _id: t._id.toString(),
        teacherId: t.teacherId || "",
        name: t.name || "",
        email: t.email || "",
        phone: t.phone || "",
        classes: Array.isArray(t.classes) ? t.classes : [],
        qualification: t.qualification || "",
        joiningDate: t.joiningDate || "",
        salary: Number(t.salary) || 0,
        address: t.address || "",
        status: t.status || "Active",
        publicToken: t.publicToken || "",
        createdAt: t.createdAt,
      })),
    })
  } catch (err) {
    console.error("❌ GET /api/academy/teacher:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// POST — create
// ─────────────────────────────────────────────
export async function POST(req) {
  try {
    const data = await req.json()
    const orgEmail = data.orgEmail
    const name = String(data.name || "").trim()
    const teacherEmail = String(data.email || "").trim().toLowerCase()

    if (!orgEmail) return NextResponse.json({ error: "orgEmail required" }, { status: 400 })
    if (!name || !teacherEmail) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 })
    }

    const db = await getDb()
    const { org, error, status: errStatus } = await loadAcademyOrg(db, orgEmail)
    if (error) return NextResponse.json({ error }, { status: errStatus })

    const collection = db.collection("teachers")
    const existing = await collection.findOne({
      schoolId: org.schoolId,
      program: "academy",
      email: teacherEmail,
    })
    if (existing) {
      return NextResponse.json(
        { error: "A teacher with this email already exists" },
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
      name,
      email: teacherEmail,
      phone: data.phone ? String(data.phone).trim() : "",
      classes: Array.isArray(data.classes) ? data.classes : [],
      qualification: data.qualification ? String(data.qualification).trim() : "",
      joiningDate: data.joiningDate || "",
      salary: Number(data.salary) || 0,
      address: data.address ? String(data.address).trim() : "",
      status: data.status || "Active",
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
// PUT — update
// ─────────────────────────────────────────────
export async function PUT(req) {
  try {
    const data = await req.json()
    const orgEmail = data.orgEmail
    const teacherMongoId = data._id

    if (!orgEmail) return NextResponse.json({ error: "orgEmail required" }, { status: 400 })
    if (!teacherMongoId) return NextResponse.json({ error: "_id required" }, { status: 400 })

    const db = await getDb()
    const { org, error, status } = await loadAcademyOrg(db, orgEmail)
    if (error) return NextResponse.json({ error }, { status })

    let _id
    try { _id = new ObjectId(teacherMongoId) } catch {
      return NextResponse.json({ error: "Invalid _id" }, { status: 400 })
    }

    const patch = { updatedAt: new Date() }
    if (data.name !== undefined) patch.name = String(data.name).trim()
    if (data.email !== undefined) patch.email = String(data.email).trim().toLowerCase()
    if (data.phone !== undefined) patch.phone = String(data.phone).trim()
    if (data.qualification !== undefined) patch.qualification = String(data.qualification).trim()
    if (data.joiningDate !== undefined) patch.joiningDate = data.joiningDate || ""
    if (data.salary !== undefined) patch.salary = Number(data.salary) || 0
    if (data.address !== undefined) patch.address = String(data.address).trim()
    if (data.status !== undefined) patch.status = data.status
    if (data.classes !== undefined) patch.classes = Array.isArray(data.classes) ? data.classes : []

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
// PATCH — regenerate token
// ─────────────────────────────────────────────
export async function PATCH(req) {
  try {
    const data = await req.json()
    const orgEmail = data.orgEmail
    const teacherMongoId = data._id

    if (!orgEmail || !teacherMongoId) {
      return NextResponse.json({ error: "orgEmail and _id required" }, { status: 400 })
    }

    const db = await getDb()
    const { org, error, status } = await loadAcademyOrg(db, orgEmail)
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
// DELETE
// ─────────────────────────────────────────────
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url)
    const orgEmail = searchParams.get("orgEmail")
    const id = searchParams.get("id")

    if (!orgEmail || !id) {
      return NextResponse.json({ error: "orgEmail and id required" }, { status: 400 })
    }

    const db = await getDb()
    const { org, error, status } = await loadAcademyOrg(db, orgEmail)
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