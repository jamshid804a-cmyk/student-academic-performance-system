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

async function resolveStudentId(db, org, body) {
  const { id, _id } = body

  if (id !== undefined && id !== null && String(id).length < 12) {
    const found = await db.collection("students").findOne({
      schoolId: org.schoolId,
      program: "academy",
      id: Number(id),
    })
    if (found) return found._id
  }

  if (_id) {
    try { return new ObjectId(_id) } catch {}
  }

  if (typeof id === "string" && id.length === 24) {
    try { return new ObjectId(id) } catch {}
  }

  return null
}

// ─────────────────────────────────────────────
// GET — list academy students
// ─────────────────────────────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get("email")

    const db = await getDb()
    const { org, error, status } = await loadAcademyOrg(db, email)
    if (error) return NextResponse.json({ error }, { status })

    let students = await db
      .collection("students")
      .find({ schoolId: org.schoolId, program: "academy" })
      .sort({ createdAt: 1 })
      .toArray()

    // Backfill sequential ids
    const missing = students.filter((s) => s.id === undefined || s.id === null)
    if (missing.length > 0) {
      let maxId = students
        .map((s) => Number(s.id) || 0)
        .reduce((a, b) => Math.max(a, b), 0)
      for (const s of missing) {
        maxId += 1
        try {
          await db.collection("students").updateOne(
            { _id: s._id },
            { $set: { id: maxId } }
          )
          s.id = maxId
        } catch (e) {
          console.error("Backfill id failed:", e.message)
        }
      }
    }

    students.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0))

    return NextResponse.json({
      success: true,
      students: students.map((s) => ({
        _id: s._id.toString(),
        id: s.id ?? null,
        name: s.name || "",
        fatherName: s.fatherName || "",
        fatherOccupation: s.fatherOccupation || "",
        admissionNo: s.admissionNo ?? null,
        contact: s.contact || "",
        subject: s.subject || "",
        section: s.section || "",
        rollNo: s.rollNo ?? null,
        year: s.year || "",
        courseDuration: s.courseDuration || "",
        batchNo: s.batchNo || "",
        admissionDate: s.admissionDate || null,
        fee: Number(s.fee) || Number(s.monthlyFee) || 0,
        monthlyFee: Number(s.monthlyFee) || Number(s.fee) || 0,
        address: s.address || "",
        image: s.image || null,
        createdAt: s.createdAt,
      })),
    })
  } catch (err) {
    console.error("❌ GET /api/academy/student:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// POST — create academy student
// ─────────────────────────────────────────────
export async function POST(req) {
  try {
    const body = await req.json()
    const email = body.email
    const name = String(body.name || "").trim()
    const subject = String(body.subject || "").trim()
    const section = String(body.section || "").trim()
    const year = String(body.year || "").trim()

    if (!name || name.length < 2) {
      return NextResponse.json({ error: "Student name is required" }, { status: 400 })
    }
    if (!subject) {
      return NextResponse.json({ error: "Course is required" }, { status: 400 })
    }
    if (!section) {
      return NextResponse.json({ error: "Section is required" }, { status: 400 })
    }

    const db = await getDb()
    const { org, error, status } = await loadAcademyOrg(db, email)
    if (error) return NextResponse.json({ error }, { status })

    const lastStudent = await db
      .collection("students")
      .find({ schoolId: org.schoolId, program: "academy" })
      .sort({ id: -1 })
      .limit(1)
      .toArray()
    const nextId = (Number(lastStudent[0]?.id) || 0) + 1

    const doc = {
      id: nextId,
      name,
      fatherName: String(body.fatherName || "").trim(),
      fatherOccupation: String(body.fatherOccupation || "").trim(),
      admissionNo: body.admissionNo ? Number(body.admissionNo) : null,
      contact: String(body.contact || "").trim(),
      subject,
      section,
      rollNo: body.rollNo ? Number(body.rollNo) : null,
      year,
      courseDuration: String(body.courseDuration || "").trim(),
      batchNo: String(body.batchNo || "").trim(),
      admissionDate: body.admissionDate || null,
      fee: Number(body.fee) || 0,
      monthlyFee: Number(body.fee) || 0,
      address: String(body.address || "").trim(),
      image: body.image || null,
      schoolId: org.schoolId,
      orgId: org._id.toString(),
      program: "academy",
      createdAt: new Date(),
    }

    const result = await db.collection("students").insertOne(doc)

    return NextResponse.json({
      success: true,
      student: { _id: result.insertedId.toString(), ...doc },
    })
  } catch (err) {
    console.error("❌ POST /api/academy/student:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// PUT — update academy student
// ─────────────────────────────────────────────
export async function PUT(req) {
  try {
    const body = await req.json()
    const email = body.email

    if (!email) return NextResponse.json({ error: "email required" }, { status: 400 })

    const db = await getDb()
    const { org, error, status } = await loadAcademyOrg(db, email)
    if (error) return NextResponse.json({ error }, { status })

    const _id = await resolveStudentId(db, org, body)
    if (!_id) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    const patch = {}
    if (body.name !== undefined) patch.name = String(body.name).trim()
    if (body.fatherName !== undefined) patch.fatherName = String(body.fatherName).trim()
    if (body.fatherOccupation !== undefined) patch.fatherOccupation = String(body.fatherOccupation).trim()
    if (body.admissionNo !== undefined) patch.admissionNo = body.admissionNo ? Number(body.admissionNo) : null
    if (body.contact !== undefined) patch.contact = String(body.contact).trim()
    if (body.subject !== undefined) patch.subject = String(body.subject).trim()
    if (body.section !== undefined) patch.section = String(body.section).trim()
    if (body.rollNo !== undefined) patch.rollNo = body.rollNo ? Number(body.rollNo) : null
    if (body.year !== undefined) patch.year = String(body.year).trim()
    if (body.courseDuration !== undefined) patch.courseDuration = String(body.courseDuration).trim()
    if (body.batchNo !== undefined) patch.batchNo = String(body.batchNo).trim()
    if (body.admissionDate !== undefined) patch.admissionDate = body.admissionDate || null
    if (body.fee !== undefined) {
      patch.fee = Number(body.fee) || 0
      patch.monthlyFee = Number(body.fee) || 0
    }
    if (body.address !== undefined) patch.address = String(body.address).trim()
    if (body.image !== undefined) patch.image = body.image || null

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
    }

    patch.updatedAt = new Date()

    const result = await db
      .collection("students")
      .updateOne(
        { _id, schoolId: org.schoolId, program: "academy" },
        { $set: patch }
      )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("❌ PUT /api/academy/student:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    const email = searchParams.get("email")

    if (!id || !email) {
      return NextResponse.json({ error: "id and email required" }, { status: 400 })
    }

    const db = await getDb()
    const { org, error, status } = await loadAcademyOrg(db, email)
    if (error) return NextResponse.json({ error }, { status })

    const _id = await resolveStudentId(db, org, { id })
    if (!_id) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
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