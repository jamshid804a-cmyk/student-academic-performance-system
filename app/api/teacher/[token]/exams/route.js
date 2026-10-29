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
    const examType = searchParams.get("examType")

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
    const examFilter = { ...schoolCond, studentId: { $in: ids } }
    if (month) examFilter.month = month
    if (examType) examFilter.examType = examType

    const records = await db
      .collection("exams")
      .find(examFilter)
      .sort({ updatedAt: -1 })
      .toArray()

    return NextResponse.json(
      records.map((r) => ({ ...r, id: r._id.toString(), _id: undefined }))
    )
  } catch (err) {
    console.error("exams route:", err.message)
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

    await db.collection("exams").updateOne(
      {
        schoolId,
        studentId: String(data.studentId),
        month: data.month,
        examType: data.examType,
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
    console.error("exams POST:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}