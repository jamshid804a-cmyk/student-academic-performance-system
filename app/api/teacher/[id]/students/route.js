import { NextResponse } from "next/server"
import { getDb } from "@/utils"

export async function GET(req, { params }) {
  try {
    const { id } = params
    const db = await getDb()

    const teacher = await db.collection("teachers").findOne({ publicToken: id })
    if (!teacher) return NextResponse.json({ error: "Invalid link" }, { status: 404 })

    const schoolId = teacher.schoolId
    const classes = Array.isArray(teacher.classes) ? teacher.classes : []

    const schoolCond = schoolId
      ? { $or: [{ schoolId: String(schoolId) }, { schoolId: Number(schoolId) }] }
      : {}

    const orClauses = classes
      .filter((c) => c && c.grade)
      .map((c) => ({ grade: c.grade, ...(c.section ? { section: c.section } : {}) }))

    let filter
    if (orClauses.length) {
      filter = schoolId
        ? { $and: [schoolCond, { $or: orClauses }] }
        : { $or: orClauses }
    } else {
      filter = schoolCond
    }

    let students = await db.collection("students").find(filter).sort({ rollNo: 1, id: 1 }).toArray()

    if (students.length === 0 && schoolId) {
      students = await db.collection("students").find(schoolCond).sort({ rollNo: 1, id: 1 }).toArray()
    }
    if (students.length === 0 && orClauses.length) {
      students = await db.collection("students").find({ $or: orClauses }).sort({ rollNo: 1, id: 1 }).toArray()
    }

    return NextResponse.json(students.map((s) => ({ ...s, _id: s._id.toString() })))
  } catch (err) {
    console.error("students route:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}