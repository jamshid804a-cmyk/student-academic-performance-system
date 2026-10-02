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
// GET — list fee records
//   ?email=user@example.com
//   &month=2026-10    (optional)
//   &studentId=xxx    (optional)
// ─────────────────────────────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get("email")
    const month = searchParams.get("month")
    const studentId = searchParams.get("studentId")

    const db = await getDb()
    const { org, error, status } = await loadAcademyOrg(db, email)
    if (error) {
      return NextResponse.json({ error }, { status })
    }

    const filter = { schoolId: org.schoolId, program: "academy" }
    if (month) filter.month = month
    if (studentId) filter.studentId = studentId

    const fees = await db
      .collection("fees")
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray()

    return NextResponse.json({
      success: true,
      fees: fees.map((f) => ({
        _id: f._id.toString(),
        studentId: f.studentId || "",
        studentName: f.studentName || "",
        month: f.month || "",
        amount: Number(f.amount) || 0,
        status: f.status || "unpaid",
        paidAt: f.paidAt || null,
        createdAt: f.createdAt,
      })),
    })
  } catch (err) {
    console.error("❌ GET /api/academy/fee:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// POST — record a fee payment
//   Body: { email, studentId, month, amount, status? }
// ─────────────────────────────────────────────
export async function POST(req) {
  try {
    const body = await req.json()
    const email = body.email
    const studentId = String(body.studentId || "").trim()
    const month = String(body.month || "").trim()
    const amount = Number(body.amount) || 0
    const status = ["paid", "unpaid", "partial"].includes(body.status)
      ? body.status
      : "paid"

    if (!studentId) {
      return NextResponse.json(
        { error: "studentId required" },
        { status: 400 }
      )
    }
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: "month must be YYYY-MM format" },
        { status: 400 }
      )
    }
    if (amount <= 0) {
      return NextResponse.json(
        { error: "amount must be greater than 0" },
        { status: 400 }
      )
    }

    const db = await getDb()
    const { org, error, status: errStatus } = await loadAcademyOrg(db, email)
    if (error) {
      return NextResponse.json({ error }, { status: errStatus })
    }

    // Look up student (must be an academy student of this org)
    let studentOid
    try {
      studentOid = new ObjectId(studentId)
    } catch {
      return NextResponse.json({ error: "Invalid studentId" }, { status: 400 })
    }

    const student = await db.collection("students").findOne({
      _id: studentOid,
      schoolId: org.schoolId,
      program: "academy",
    })
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Check for duplicate fee for same student + month
    const existing = await db.collection("fees").findOne({
      schoolId: org.schoolId,
      program: "academy",
      studentId,
      month,
    })
    if (existing) {
      return NextResponse.json(
        { error: `Fee for ${month} already recorded for this student` },
        { status: 400 }
      )
    }

    const now = new Date()
    const doc = {
      studentId,
      studentName: student.name || "",
      month,
      amount,
      status,
      paidAt: status === "paid" ? now : null,
      schoolId: org.schoolId,
      orgId: org._id.toString(),
      program: "academy",
      createdAt: now,
    }

    const result = await db.collection("fees").insertOne(doc)

    return NextResponse.json({
      success: true,
      fee: { _id: result.insertedId.toString(), ...doc },
    })
  } catch (err) {
    console.error("❌ POST /api/academy/fee:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// DELETE — remove a fee record
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

    const result = await db.collection("fees").deleteOne({
      _id,
      schoolId: org.schoolId,
      program: "academy",
    })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Fee record not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("❌ DELETE /api/academy/fee:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}