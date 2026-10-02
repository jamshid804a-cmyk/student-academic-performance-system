import { NextResponse } from "next/server"
import { getDb } from "@/utils"

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

// ─────────────────────────────────────────────
// GET — tests for the academy
//   ?orgEmail=...&course=X&section=A&year=2025&month=MM/YYYY&testType=Monthly
// ─────────────────────────────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const orgEmail = searchParams.get("orgEmail")
    const course = searchParams.get("course")
    const section = searchParams.get("section")
    const year = searchParams.get("year")
    const month = searchParams.get("month")
    const testType = searchParams.get("testType")

    const db = await getDb()
    const { org, error, status } = await loadAcademyOrg(db, orgEmail)
    if (error) return NextResponse.json({ error }, { status })

    const filter = { schoolId: org.schoolId, program: "academy" }
    if (course) filter.subject = course
    if (section) filter.section = section
    if (year) filter.year = year
    if (month) filter.month = month
    if (testType) filter.testType = testType

    const tests = await db
      .collection("tests")
      .find(filter)
      .toArray()

    return NextResponse.json(
      tests.map((t) => ({ ...t, _id: t._id.toString() }))
    )
  } catch (err) {
    console.error("❌ GET /api/academy/tests:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// POST — save a test mark
//   Body: { orgEmail, studentId, course, section, year, month, testType, subject, obtained, total }
// ─────────────────────────────────────────────
export async function POST(req) {
  try {
    const data = await req.json()
    const orgEmail = data.orgEmail
    const { studentId, course, section, year, month, testType, subject, obtained, total } = data

    if (!orgEmail) return NextResponse.json({ error: "orgEmail required" }, { status: 400 })
    if (!studentId || !course || !month || !testType || !subject) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const db = await getDb()
    const { org, error, status } = await loadAcademyOrg(db, orgEmail)
    if (error) return NextResponse.json({ error }, { status })

    const obt = Number(obtained) || 0
    const tot = Number(total) || 0
    const percentage = tot > 0 ? Math.round((obt / tot) * 100) : 0

    await db.collection("tests").updateOne(
      {
        schoolId: org.schoolId,
        program: "academy",
        studentId: String(studentId),
        subject,
        month,
        testType,
      },
      {
        $set: {
          schoolId: org.schoolId,
          orgId: org._id.toString(),
          program: "academy",
          studentId: String(studentId),
          course,
          section: section || "",
          year: year || "",
          month,
          testType,
          subject,
          obtained: obt,
          total: tot,
          percentage,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("❌ POST /api/academy/tests:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// DELETE — remove all marks for a subject across students
//   ?orgEmail=...&subject=Maths&month=MM/YYYY&testType=Monthly
// ─────────────────────────────────────────────
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url)
    const orgEmail = searchParams.get("orgEmail")
    const studentId = searchParams.get("studentId")
    const subject = searchParams.get("subject")
    const month = searchParams.get("month")
    const testType = searchParams.get("testType")

    if (!orgEmail || !subject) {
      return NextResponse.json({ error: "orgEmail and subject required" }, { status: 400 })
    }

    const db = await getDb()
    const { org, error, status } = await loadAcademyOrg(db, orgEmail)
    if (error) return NextResponse.json({ error }, { status })

    const filter = {
      schoolId: org.schoolId,
      program: "academy",
      subject,
    }
    if (studentId) filter.studentId = String(studentId)
    if (month) filter.month = month
    if (testType) filter.testType = testType

    const result = await db.collection("tests").deleteMany(filter)

    return NextResponse.json({ success: true, deletedCount: result.deletedCount })
  } catch (err) {
    console.error("❌ DELETE /api/academy/tests:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}