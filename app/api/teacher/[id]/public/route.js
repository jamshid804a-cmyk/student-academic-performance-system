import { NextResponse } from "next/server"
import { getDb } from "@/utils"

// ─────────────────────────────────────────────
// GET — PUBLIC teacher info (via public link)
// Called like: /api/teacher/<publicToken>/public
// No login required — the token itself is the key.
// Program-aware: works for both school and academy teachers.
// ─────────────────────────────────────────────
export async function GET(req, { params }) {
  try {
    const { id } = params
    const db = await getDb()

    // Find teacher by publicToken (unique across all)
    const teacher = await db.collection("teachers").findOne({ publicToken: id })
    if (!teacher) {
      return NextResponse.json({ error: "Invalid link" }, { status: 404 })
    }

    if (teacher.status && teacher.status.toLowerCase() !== "active") {
      return NextResponse.json({ error: "Teacher is inactive" }, { status: 403 })
    }

    const schoolId = teacher.schoolId
    const program = teacher.program === "academy" ? "academy" : "school"
    const classes = Array.isArray(teacher.classes) ? teacher.classes : []

    // ─── Program-aware student filter ───
    let studentFilter
    if (program === "academy") {
      const orClauses = classes
        .filter((c) => c && (c.course || c.grade))
        .map((c) => {
          const courseName = c.course || c.grade
          const clause = { subject: courseName }
          if (c.section) clause.section = c.section
          if (c.batchNo) clause.batchNo = c.batchNo
          return clause
        })

      studentFilter =
        orClauses.length > 0
          ? { schoolId, program: "academy", $or: orClauses }
          : { _id: null }
    } else {
      const orClauses = classes
        .filter((c) => c && c.grade)
        .map((c) => ({
          grade: c.grade,
          ...(c.section ? { section: c.section } : {}),
        }))

      studentFilter =
        orClauses.length > 0
          ? { schoolId, $or: orClauses }
          : { _id: null }
    }

    const students = await db
      .collection("students")
      .find(studentFilter)
      .sort(program === "academy"
        ? { subject: 1, section: 1, rollNo: 1 }
        : { grade: 1, section: 1, rollNo: 1 })
      .toArray()

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