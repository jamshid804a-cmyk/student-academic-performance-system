import { NextResponse } from "next/server"
import { getDb } from "@/utils"

export async function GET(req, { params }) {
  try {
    const { token } = params
    const db = await getDb()
    const teacher = await db.collection("teachers").findOne({ publicToken: token })
    if (!teacher) return NextResponse.json({ error: "Invalid link" }, { status: 404 })

    const schoolId = teacher.schoolId
    const schoolCond = schoolId
      ? { $or: [{ schoolId: String(schoolId) }, { schoolId: Number(schoolId) }] }
      : {}

    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get("studentId")

    const filter = { ...schoolCond }
    if (studentId) filter.studentId = String(studentId)

    const subjects = await db.collection("subjects").find(filter).toArray()
    return NextResponse.json(subjects.map((s) => ({ ...s, _id: s._id.toString() })))
  } catch (err) {
    console.error("subjects route:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}