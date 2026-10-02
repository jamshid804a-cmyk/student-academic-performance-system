import { NextResponse } from "next/server"
import { getDb } from "@/utils"

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
// GET — academy teacher attendance
//   ?email=...&month=MM/YYYY&teacherId=ATCH-001
// ─────────────────────────────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get("email")
    const month = searchParams.get("month")
    const teacherId = searchParams.get("teacherId")

    if (!month) {
      return NextResponse.json({ error: "month is required" }, { status: 400 })
    }

    const db = await getDb()
    const { org, error, status } = await loadAcademyOrg(db, email)
    if (error) return NextResponse.json({ error }, { status })

    const filter = { schoolId: org.schoolId, program: "academy", month: String(month) }
    if (teacherId) filter.teacherId = String(teacherId)

    const records = await db
      .collection("teacher_attendance")
      .find(filter)
      .sort({ day: 1 })
      .toArray()

    return NextResponse.json(
      records.map((r) => ({ ...r, _id: r._id.toString() }))
    )
  } catch (err) {
    console.error("❌ GET /api/academy/teacher-attendance:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// POST — save one teacher's attendance
// ─────────────────────────────────────────────
export async function POST(req) {
  try {
    const data = await req.json()
    const { email, teacherId, month, day, status } = data

    if (!email || !teacherId || !month || day === undefined || !status) {
      return NextResponse.json(
        { error: "email, teacherId, month, day, status are required" },
        { status: 400 }
      )
    }

    const db = await getDb()
    const { org, error, status: errStatus } = await loadAcademyOrg(db, email)
    if (error) return NextResponse.json({ error }, { status: errStatus })

    await db.collection("teacher_attendance").updateOne(
      {
        schoolId: org.schoolId,
        program: "academy",
        teacherId: String(teacherId),
        month: String(month),
        day: Number(day),
      },
      {
        $set: {
          schoolId: org.schoolId,
          orgId: org._id.toString(),
          program: "academy",
          teacherId: String(teacherId),
          month: String(month),
          day: Number(day),
          status: String(status).toUpperCase(),
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("❌ POST /api/academy/teacher-attendance:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// DELETE — remove one day's teacher attendance
// ─────────────────────────────────────────────
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get("email")
    const teacherId = searchParams.get("teacherId")
    const month = searchParams.get("month")
    const day = searchParams.get("day")

    if (!email || !teacherId || !month || day === null) {
      return NextResponse.json(
        { error: "email, teacherId, month, day are required" },
        { status: 400 }
      )
    }

    const db = await getDb()
    const { org, error, status } = await loadAcademyOrg(db, email)
    if (error) return NextResponse.json({ error }, { status })

    await db.collection("teacher_attendance").deleteOne({
      schoolId: org.schoolId,
      program: "academy",
      teacherId: String(teacherId),
      month: String(month),
      day: Number(day),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("❌ DELETE /api/academy/teacher-attendance:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}