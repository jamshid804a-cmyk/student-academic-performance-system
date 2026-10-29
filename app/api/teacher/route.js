import { NextResponse } from "next/server"
import { getDb } from "@/utils"
import { getCurrentSchool } from "@/utils/getCurrentSchool"
import crypto from "crypto"

// ─────────────────────────────────────────────
// Generate next Teacher ID like TCH-001 (per school, per program)
// ─────────────────────────────────────────────
async function generateTeacherId(db, schoolId, program) {
  const last = await db
    .collection("teachers")
    .find({ schoolId, program, teacherId: { $regex: "^TCH-" } })
    .sort({ teacherId: -1 })
    .limit(1)
    .toArray()

  if (last.length === 0) return "TCH-001"
  const lastNum = parseInt(String(last[0].teacherId).replace("TCH-", ""), 10)
  const nextNum = isNaN(lastNum) ? 1 : lastNum + 1
  return `TCH-${String(nextNum).padStart(3, "0")}`
}

// ─────────────────────────────────────────────
// GET — list teachers (school only by default)
//   ?program=school|academy  (default: school)
//   ?subject=&status=
// ─────────────────────────────────────────────
export async function GET(req) {
  try {
    const schoolResult = await getCurrentSchool()
    if (!schoolResult.success) {
      return NextResponse.json({ error: schoolResult.error }, { status: 401 })
    }
    const { schoolId } = schoolResult.school

    const { searchParams } = new URL(req.url)
    const program = searchParams.get("program") || "school"
    const subject = searchParams.get("subject")
    const status = searchParams.get("status")

    const db = await getDb()

    // ✅ schoolId + program is ALWAYS in the filter
    const filter = { schoolId, program }
    if (subject) filter.subject = subject
    if (status) filter.status = status

    const teachers = await db
      .collection("teachers")
      .find(filter)
      .sort({ teacherId: 1 })
      .toArray()

    return NextResponse.json(
      teachers.map((t) => ({ ...t, _id: t._id.toString() }))
    )
  } catch (err) {
    console.error("❌ GET /api/teacher:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// POST — create a new school teacher
// ─────────────────────────────────────────────
export async function POST(req) {
  try {
    const schoolResult = await getCurrentSchool()
    if (!schoolResult.success) {
      return NextResponse.json({ error: schoolResult.error }, { status: 401 })
    }
    const { schoolId } = schoolResult.school

    const data = await req.json()
    const {
      name, email, phone, classes, qualification, subject,
      joiningDate, salary, address, status,
    } = data

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      )
    }

    const db = await getDb()
    const collection = db.collection("teachers")

    // Duplicate check within same school + program
    const existing = await collection.findOne({
      schoolId,
      program: "school",
      email: String(email).trim().toLowerCase(),
    })
    if (existing) {
      return NextResponse.json(
        { error: "A teacher with this email already exists in your school" },
        { status: 400 }
      )
    }

    const teacherId = await generateTeacherId(db, schoolId, "school")
    const publicToken = crypto.randomBytes(16).toString("hex")

    const doc = {
      schoolId,
      program: "school",                 // ✅ tag program
      teacherId,
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
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
    console.error("❌ POST /api/teacher:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}