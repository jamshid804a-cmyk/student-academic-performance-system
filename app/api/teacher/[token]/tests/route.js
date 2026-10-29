import { NextResponse } from "next/server"
import { getDb } from "@/utils"

export async function GET(req, { params }) {
  try {
    const { token } = params
    const db = await getDb()

    const teacher = await db.collection("teachers").findOne({ publicToken: token })
    if (!teacher) return NextResponse.json({ error: "Invalid link" }, { status: 404 })

    const schoolId = teacher.schoolId
    const { searchParams } = new URL(req.url)
    const grade = searchParams.get("grade")
    const section = searchParams.get("section")
    const session = searchParams.get("session")
    const month = searchParams.get("month")
    const testType = searchParams.get("testType")

    const schoolCond = schoolId
      ? { $or: [{ schoolId: String(schoolId) }, { schoolId: Number(schoolId) }] }
      : {}

    const studentFilter = { ...schoolCond }
    if (grade) studentFilter.grade = grade
    if (section) studentFilter.section = section
    if (session) studentFilter.session = session

    const students = await db.collection("students").find(studentFilter).toArray()
    if (students.length === 0) return NextResponse.json([])

    const ids = students.map((s) => String(s.id))
    const testFilter = { ...schoolCond, studentId: { $in: ids } }
    if (month) testFilter.month = month
    if (testType) testFilter.testType = testType

    const records = await db
      .collection("tests")
      .find(testFilter)
      .sort({ updatedAt: -1 })
      .toArray()

    return NextResponse.json(
      records.map((r) => ({ ...r, id: r._id.toString(), _id: undefined }))
    )
  } catch (err) {
    console.error("tests route:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req, { params }) {
  try {
    const { token } = params
    const db = await getDb()

    const teacher = await db.collection("teachers").findOne({ publicToken: token })
    if (!teacher) return NextResponse.json({ error: "Invalid link" }, { status: 404 })

    const schoolId = teacher.schoolId
    const data = await req.json()

    await db.collection("tests").updateOne(
      {
        schoolId,
        studentId: String(data.studentId),
        month: data.month,
        testType: data.testType,
      },
      {
        $set: {
          ...data,
          studentId: String(data.studentId),
          schoolId,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("tests POST:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}