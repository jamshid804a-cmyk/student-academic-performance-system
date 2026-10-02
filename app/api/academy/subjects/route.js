import { NextResponse } from "next/server"
import { getDb } from "@/utils"

// ─────────────────────────────────────────────
// GET — academy subjects
//   ?orgEmail=...          → all subjects for the org
//   ?orgEmail=...&studentId=1 → subjects for one student
// ─────────────────────────────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const orgEmail = searchParams.get("orgEmail")
    const studentId = searchParams.get("studentId")

    if (!orgEmail) {
      return NextResponse.json({ error: "orgEmail required" }, { status: 400 })
    }

    const db = await getDb()
    const org = await db
      .collection("schools")
      .findOne({ email: String(orgEmail).toLowerCase().trim() })
    if (!org) return NextResponse.json({ error: "No organization" }, { status: 404 })

    const pkg = org.package || "school"
    if (pkg !== "academy" && pkg !== "both") {
      return NextResponse.json(
        { error: "Academy section not available" },
        { status: 400 }
      )
    }

    const filter = { schoolId: org.schoolId, program: "academy" }
    if (studentId) filter.studentId = String(studentId)

    const subjects = await db
      .collection("subjects")
      .find(filter)
      .sort({ name: 1 })
      .toArray()

    return NextResponse.json(
      subjects.map((s) => ({ ...s, id: s._id.toString(), _id: undefined }))
    )
  } catch (err) {
    console.error("❌ GET /api/academy/subjects:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// POST — add a subject for one student
//   Body: { orgEmail, studentId, name }
// ─────────────────────────────────────────────
export async function POST(req) {
  try {
    const data = await req.json()
    const { orgEmail, studentId, name } = data

    if (!orgEmail || !studentId || !name) {
      return NextResponse.json(
        { error: "orgEmail, studentId, name required" },
        { status: 400 }
      )
    }

    const db = await getDb()
    const org = await db
      .collection("schools")
      .findOne({ email: String(orgEmail).toLowerCase().trim() })
    if (!org) return NextResponse.json({ error: "No organization" }, { status: 404 })

    const existing = await db.collection("subjects").findOne({
      schoolId: org.schoolId,
      program: "academy",
      studentId: String(studentId),
      name: String(name).trim(),
    })
    if (existing) {
      return NextResponse.json({ error: "Subject already exists" }, { status: 400 })
    }

    const doc = {
      schoolId: org.schoolId,
      orgId: org._id.toString(),
      program: "academy",
      studentId: String(studentId),
      name: String(name).trim(),
      createdAt: new Date(),
    }

    const result = await db.collection("subjects").insertOne(doc)

    return NextResponse.json({
      success: true,
      id: result.insertedId.toString(),
    })
  } catch (err) {
    console.error("❌ POST /api/academy/subjects:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}