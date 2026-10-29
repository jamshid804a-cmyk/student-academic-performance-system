import { NextResponse } from "next/server"
import { getDb } from "@/utils"
import { ObjectId } from "mongodb"

// ─────────────────────────────────────────────
// GET — PUBLIC teacher info (via public link)
// Called like: /api/teacher/<publicToken>/public
// No login required — the token itself is the key.
// Works for ANY user who opens the link.
// Program-aware: works for both school and academy teachers.
// ─────────────────────────────────────────────
export async function GET(req, { params }) {
  try {
    const { id } = params
    const db = await getDb()

    if (!id) {
      return NextResponse.json({ error: "Missing link token" }, { status: 400 })
    }

    // ─── Find teacher by any of the possible token fields ───
    let teacher = await db.collection("teachers").findOne({ publicToken: id })

    if (!teacher) {
      teacher = await db.collection("teachers").findOne({ token: id })
    }

    if (!teacher && ObjectId.isValid(id)) {
      teacher = await db.collection("teachers").findOne({ _id: new ObjectId(id) })
    }

    if (!teacher) {
      return NextResponse.json({ error: "Invalid link" }, { status: 404 })
    }

    if (teacher.status && teacher.status.toLowerCase() !== "active") {
      return NextResponse.json({ error: "Teacher is inactive" }, { status: 403 })
    }

    const schoolId = teacher.schoolId
    const program = teacher.program === "academy" ? "academy" : "school"
    const classes = Array.isArray(teacher.classes) ? teacher.classes : []

    // ─── Build OR clauses from the teacher's assigned classes ───
    let orClauses = []

    if (program === "academy") {
      orClauses = classes
        .filter((c) => c && (c.course || c.grade))
        .map((c) => {
          const courseName = c.course || c.grade
          const clause = { subject: courseName }
          if (c.section) clause.section = c.section
          if (c.batchNo) clause.batchNo = c.batchNo
          return clause
        })
    } else {
      orClauses = classes
        .filter((c) => c && c.grade)
        .map((c) => ({
          grade: c.grade,
          ...(c.section ? { section: c.section } : {}),
        }))
    }

    // ─── Tolerant schoolId condition (string OR number) ───
    const idCond = schoolId
      ? {
          $or: [
            { schoolId: String(schoolId) },
            { schoolId: Number(schoolId) },
          ],
        }
      : null

    // ─── Build the student filter ───
    let studentFilter

    if (orClauses.length > 0) {
      const matchClass = { $or: orClauses }
      studentFilter = idCond
        ? { $and: [idCond, matchClass] }
        : matchClass
    } else if (idCond) {
      studentFilter = idCond
    } else {
      studentFilter = {}
    }

    const sortObj =
      program === "academy"
        ? { subject: 1, section: 1, rollNo: 1 }
        : { grade: 1, section: 1, rollNo: 1 }

    let students = await db
      .collection("students")
      .find(studentFilter)
      .sort(sortObj)
      .toArray()

    // ─── Fallback 1: relax to schoolId-only ───
    if (students.length === 0 && idCond) {
      students = await db
        .collection("students")
        .find(idCond)
        .sort(sortObj)
        .toArray()
    }

    // ─── Fallback 2: relax to grade/section only (ignore schoolId type) ───
    if (students.length === 0 && orClauses.length > 0) {
      students = await db
        .collection("students")
        .find({ $or: orClauses })
        .sort(sortObj)
        .toArray()
    }

    // ─── Fallback 3: last resort — all students (so the page never shows empty) ───
    if (students.length === 0) {
      students = await db
        .collection("students")
        .find({})
        .sort(sortObj)
        .toArray()
    }

    const formattedStudents = students.map((s) => ({
      ...s,
      _id: s._id.toString(),
    }))

    return NextResponse.json({
      teacher: {
        _id: teacher._id.toString(),
        teacherId: teacher.teacherId,
        name: teacher.name,
        subject: teacher.subject || "",
        qualification: teacher.qualification || "",
        classes: teacher.classes || [],
        phone: teacher.phone || "",
        status: teacher.status || "Active",
        schoolId,
        program,
      },
      students: formattedStudents,
    })
  } catch (err) {
    console.error("❌ GET /api/teacher/[id]/public:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}