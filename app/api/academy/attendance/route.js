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
// GET — academy attendance
//   ?email=...&studentId=1  → records for one student
//   ?email=...&course=X&month=MM/YYYY&section=A&year=2025  → class-wide
// ─────────────────────────────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get("email")
    const studentId = searchParams.get("studentId")
    const course = searchParams.get("course")
    const month = searchParams.get("month")
    const section = searchParams.get("section")
    const year = searchParams.get("year")

    const db = await getDb()
    const { org, error, status } = await loadAcademyOrg(db, email)
    if (error) return NextResponse.json({ error }, { status })

    if (studentId) {
      const records = await db
        .collection("attendance")
        .find({
          schoolId: org.schoolId,
          program: "academy",
          studentId: String(studentId),
        })
        .sort({ day: 1 })
        .toArray()

      return NextResponse.json(
        records.map((r) => ({ ...r, id: r._id.toString(), _id: undefined }))
      )
    }

    // Class-wide: fetch students first
    const studentFilter = { schoolId: org.schoolId, program: "academy" }
    if (course) studentFilter.subject = course
    if (section) studentFilter.section = section
    if (year) studentFilter.year = year

    const students = await db
      .collection("students")
      .find(studentFilter)
      .sort({ rollNo: 1, id: 1 })
      .toArray()

    if (students.length === 0) return NextResponse.json([])

    const studentIds = students.map((s) => String(s.id))

    const attFilter = {
      schoolId: org.schoolId,
      program: "academy",
      studentId: { $in: studentIds },
    }
    if (month) attFilter.date = month

    const records = await db
      .collection("attendance")
      .find(attFilter)
      .toArray()

    const byStudent = {}
    records.forEach((r) => {
      const sid = String(r.studentId)
      if (!byStudent[sid]) byStudent[sid] = {}
      byStudent[sid][String(r.day)] = r.status || (r.present ? "P" : "A")
    })

    const response = students.map((s) => ({
      studentId: s.id,
      name: s.name,
      course: s.subject,
      section: s.section,
      year: s.year,
      rollNo: s.rollNo ?? null,
      attendance: byStudent[String(s.id)] || {},
    }))

    return NextResponse.json(response)
  } catch (err) {
    console.error("❌ GET /api/academy/attendance:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// POST — save one attendance record
//   Body: { email, studentId, day, date: "MM/YYYY", status: "P"|"A"|"L" }
// ─────────────────────────────────────────────
export async function POST(req) {
  try {
    const body = await req.json()
    const email = body.email
    const studentId = body.studentId
    const day = body.day
    const date = body.date
    const status = body.status

    if (!email || !studentId || !day || !date) {
      return NextResponse.json(
        { error: "email, studentId, day, date required" },
        { status: 400 }
      )
    }

    if (!["P", "A", "L", null, ""].includes(status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 })
    }

    const db = await getDb()
    const { org, error, status: errStatus } = await loadAcademyOrg(db, email)
    if (error) return NextResponse.json({ error }, { status: errStatus })

    // Empty status → delete record
    if (!status) {
      await db.collection("attendance").deleteOne({
        schoolId: org.schoolId,
        program: "academy",
        studentId: String(studentId),
        day: Number(day),
        date,
      })
      return NextResponse.json({ success: true, deleted: true })
    }

    // Upsert record
    await db.collection("attendance").updateOne(
      {
        schoolId: org.schoolId,
        program: "academy",
        studentId: String(studentId),
        day: Number(day),
        date,
      },
      {
        $set: {
          studentId: String(studentId),
          day: Number(day),
          date,
          status,
          present: status === "P",
          schoolId: org.schoolId,
          orgId: org._id.toString(),
          program: "academy",
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("❌ POST /api/academy/attendance:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// DELETE — remove one attendance record
//   ?email=...&studentId=1&day=15&date=MM/YYYY
// ─────────────────────────────────────────────
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get("email")
    const studentId = searchParams.get("studentId")
    const day = searchParams.get("day")
    const date = searchParams.get("date")

    if (!email || !studentId || !day || !date) {
      return NextResponse.json(
        { error: "email, studentId, day, date required" },
        { status: 400 }
      )
    }

    const db = await getDb()
    const { org, error, status } = await loadAcademyOrg(db, email)
    if (error) return NextResponse.json({ error }, { status })

    await db.collection("attendance").deleteOne({
      schoolId: org.schoolId,
      program: "academy",
      studentId: String(studentId),
      day: Number(day),
      date,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("❌ DELETE /api/academy/attendance:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}