import { NextResponse } from "next/server"
import { getDb } from "@/utils"
import { ObjectId } from "mongodb"

// ─────────────────────────────────────────────
// GET — PUBLIC teacher info (via public link)
// Called like: /api/teacher/<publicToken>/public
// No login required — the token itself is the key.
// Program-aware: works for both school and academy teachers.
// ─────────────────────────────────────────────
export async function GET(req, { params }) {
  try {
    // ✅ params must be awaited (Next.js 15+, safe on older versions too)
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: "Missing link token" }, { status: 400 })
    }

    const db = await getDb()

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

    // ✅ FIX: status may not be a string (number/boolean/object) — String() never throws.
    const statusStr = String(teacher.status ?? "").toLowerCase()
    if (statusStr && statusStr !== "active") {
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

    const sortObj =
      program === "academy"
        ? { subject: 1, section: 1, rollNo: 1 }
        : { grade: 1, section: 1, rollNo: 1 }

    // ✅ No fallbacks. If nothing matches, return an empty list.
    // A teacher with no assigned classes sees no students (never everyone).
    let students = []

    if (orClauses.length > 0) {
      const matchClass = { $or: orClauses }
      const studentFilter = idCond ? { $and: [idCond, matchClass] } : matchClass

      students = await db
        .collection("students")
        .find(studentFilter)
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
    // ✅ Log the FULL error (stack trace), not just message
    console.error("❌ GET /api/teacher/[id]/public:", err)
    // ⚠️ Remove `detail` before production if you don't want to expose internals
    return NextResponse.json(
      {
        error: "Something went wrong",
        detail: err?.message || String(err),
      },
      { status: 500 }
    )
  }
}