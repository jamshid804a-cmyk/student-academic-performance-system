import { NextResponse } from "next/server"
import { getDb } from "@/utils"

const norm = (v) => String(v ?? "").trim().toLowerCase()

function isAllowedClass(teacher, grade, section) {
  const classes = Array.isArray(teacher.classes) ? teacher.classes : []
  return classes.some((c) => {
    if (!c) return false
    const g = typeof c === "string" ? c : (c.grade || c.course)
    if (norm(g) !== norm(grade)) return false
    if (typeof c === "string") return true
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

    const statusStr = String(teacher.status ?? "").toLowerCase()
    if (statusStr && statusStr !== "active") {
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

    if (grade && !isAllowedClass(teacher, grade, section)) {
      return NextResponse.json([])
    }

    const baseFilter = { ...schoolCond }
    if (grade) baseFilter.grade = grade
    if (section) baseFilter.section = section

    let students = []
    if (session) {
      students = await db
        .collection("students")
        .find({ ...baseFilter, session })
        .sort({ rollNo: 1 })
        .toArray()
    }

    if (students.length === 0) {
      students = await db
        .collection("students")
        .find(baseFilter)
        .sort({ rollNo: 1 })
        .toArray()
    }

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

    if (students.length === 0) {
      const classes = Array.isArray(teacher.classes) ? teacher.classes : []
      const orClauses = classes
        .filter((c) => c && (typeof c === "string" || c.grade || c.course))
        .map((c) =>
          typeof c === "string"
            ? { grade: c }
            : { grade: c.grade || c.course, ...(c.section ? { section: c.section } : {}) }
        )
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
    console.error("students route:", err)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}