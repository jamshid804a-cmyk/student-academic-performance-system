import { NextResponse } from "next/server"
import { getDb } from "@/utils"
import { ObjectId } from "mongodb"

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

// Normalize month to "MM/YYYY" form
function normalizeMonth(raw) {
  if (!raw) return ""
  let s = String(raw).trim()
  // Replace hyphens or dots with slashes
  s = s.replace(/[-.]/g, "/")
  // Ensure MM is padded
  const parts = s.split("/")
  if (parts.length === 2 && parts[0].length === 1) {
    s = `0${parts[0]}/${parts[1]}`
  }
  return s
}

// ─────────────────────────────────────────────
// GET — academy fee payments
//   ?orgEmail=...&course=X&section=A&batchNo=Batch 1&year=2025&month=MM/YYYY
// ─────────────────────────────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const orgEmail = searchParams.get("orgEmail")
    const course = searchParams.get("course")
    const section = searchParams.get("section")
    const batchNo = searchParams.get("batchNo")
    const year = searchParams.get("year")
    const month = searchParams.get("month")

    const db = await getDb()
    const { org, error, status } = await loadAcademyOrg(db, orgEmail)
    if (error) return NextResponse.json({ error }, { status })

    const filter = { schoolId: org.schoolId, program: "academy" }
    if (course) filter.subject = course
    if (section) filter.section = section
    if (batchNo) filter.batchNo = batchNo
    if (year) filter.year = year
    if (month) filter.month = normalizeMonth(month)

    const records = await db
      .collection("fees")
      .find(filter)
      .sort({ paidAt: -1 })
      .toArray()

    return NextResponse.json(
      records.map((r) => ({ ...r, _id: r._id.toString() }))
    )
  } catch (err) {
    console.error("❌ GET /api/academy/fees:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// POST — record a fee payment
// ─────────────────────────────────────────────
export async function POST(req) {
  try {
    const data = await req.json()
    const orgEmail = data.orgEmail
    const { studentId, course, section, batchNo, year, month, amount, paidDate, note } = data

    if (!orgEmail) return NextResponse.json({ error: "orgEmail required" }, { status: 400 })
    if (!studentId || !course || !month || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const db = await getDb()
    const { org, error, status } = await loadAcademyOrg(db, orgEmail)
    if (error) return NextResponse.json({ error }, { status })

    const doc = {
      schoolId: org.schoolId,
      orgId: org._id.toString(),
      program: "academy",
      studentId: String(studentId),
      course,
      section: section || "",
      batchNo: batchNo || "",
      year: year || "",
      month: normalizeMonth(month),
      amount: Number(amount),
      paidDate: paidDate || "",
      note: note || "",
      paidAt: new Date(),
      createdAt: new Date(),
    }

    const result = await db.collection("fees").insertOne(doc)

    return NextResponse.json({
      success: true,
      id: result.insertedId.toString(),
    })
  } catch (err) {
    console.error("❌ POST /api/academy/fees:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// PUT — delete all fee records for a student + month
// ─────────────────────────────────────────────
export async function PUT(req) {
  try {
    const data = await req.json()
    const orgEmail = data.orgEmail
    const { studentId, month } = data

    if (!orgEmail || !studentId || !month) {
      return NextResponse.json(
        { error: "orgEmail, studentId, month required" },
        { status: 400 }
      )
    }

    const db = await getDb()
    const { org, error, status } = await loadAcademyOrg(db, orgEmail)
    if (error) return NextResponse.json({ error }, { status })

    const result = await db.collection("fees").deleteMany({
      schoolId: org.schoolId,
      program: "academy",
      studentId: String(studentId),
      month: normalizeMonth(month),
    })

    return NextResponse.json({ success: true, deletedCount: result.deletedCount })
  } catch (err) {
    console.error("❌ PUT /api/academy/fees:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// DELETE — remove one payment by id
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
    console.error("❌ DELETE /api/academy/fees:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}