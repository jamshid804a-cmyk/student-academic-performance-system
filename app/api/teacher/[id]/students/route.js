import { NextResponse } from "next/server"
import { getDb } from "@/utils"

const norm = (v) => String(v ?? "").trim().toLowerCase()

function isAllowedClass(teacher, grade, section) {
  const classes = Array.isArray(teacher.classes) ? teacher.classes : []
  return classes.some((c) => {
    if (!c) return false
    const g = c.grade || c.course
    if (norm(g) !== norm(grade)) return false
    if (!c.section) return true
    return norm(c.section) === norm(section)
  })
}

async function findTeacher(db, id) {
  return db.collection("teachers").findOne({
    $or: [{ publicToken: id }, { token: id }],
  })
}

export async function GET(req, { params }) {
  try {
    const { id } = await params
    const db = await getDb()

    const teacher = await findTeacher(db, id)
    if (!teacher) return NextResponse.json({ error: "Invalid link" }, { status: 404 })
    if (teacher.status && teacher.status.toLowerCase() !== "active") {
      return NextResponse.json({ error: "Teacher is inactive" }, { status: 403 })
    }

    const schoolId = teacher.schoolId
    const { searchParams } = new URL(req.url)
    const grade = searchParams.get("grade")
    const section = searchParams.get("section")
    const session = searchParams.get("session")

    const schoolCond = schoolId
      ? { $or: [{ schoolId: String(schoolId) }, { schoolId: Number(schoolId) }] }
      : {}

    // If grade+section provided, enforce the teacher's class restriction
    if (grade && !isAllowedClass(teacher, grade, section)) {
      return NextResponse.json([])
    }

    // Build the base filter
    const baseFilter = { ...schoolCond }
    if (grade) baseFilter.grade = grade
    if (section) baseFilter.section = section

    // 1st try: with session
    let students = []
    if (session) {
      students = await db
        .collection("students")
        .find({ ...baseFilter, session })
        .sort({ rollNo: 1 })
        .toArray()
    }

    // 2nd try: drop session
    if (students.length === 0) {
      students = await db
        .collection("students")
        .find(baseFilter)
        .sort({ rollNo: 1 })
        .toArray()
    }

    // 3rd try: drop schoolId too (in case schoolId types/values differ)
    if (students.length === 0) {
      const classOnly = {}
      if (grade) classOnly.grade = grade
      if (section) classOnly.section = section
      if (Object.keys(classOnly).length > 0) {
        students = await db
          .collection("students")
          .find(classOnly)
          .sort({ rollNo: 1 })
          .toArray()
      }
    }

    // 4th try (last resort): if the teacher has classes, use them
    if (students.length === 0) {
      const classes = Array.isArray(teacher.classes) ? teacher.classes : []
      const orClauses = classes
        .filter((c) => c && (c.grade || c.course))
        .map((c) => ({
          grade: c.grade || c.course,
          ...(c.section ? { section: c.section } : {}),
        }))
      if (orClauses.length > 0) {
        students = await db
          .collection("students")
          .find({ $or: orClauses })
          .sort({ rollNo: 1 })
          .toArray()
      }
    }

    return NextResponse.json(
      students.map((s) => ({
        ...s,
        _id: s._id.toString(),
      }))
    )
  } catch (err) {
    console.error("students route:", err.message)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}