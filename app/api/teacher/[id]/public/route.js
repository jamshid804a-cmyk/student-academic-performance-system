import { NextResponse } from "next/server"
import { getDb } from "@/utils"
import { ObjectId } from "mongodb"

export async function GET(req, { params }) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "Missing link token" }, { status: 400 })
    }

    const db = await getDb()

    let teacher = await db.collection("teachers").findOne({ publicToken: id })
    if (!teacher) teacher = await db.collection("teachers").findOne({ token: id })
    if (!teacher && ObjectId.isValid(id)) {
      teacher = await db.collection("teachers").findOne({ _id: new ObjectId(id) })
    }

    if (!teacher) {
      return NextResponse.json({ error: "Invalid link" }, { status: 404 })
    }

    const statusStr = String(teacher.status ?? "").toLowerCase()
    if (statusStr && statusStr !== "active") {
      return NextResponse.json({ error: "Teacher is inactive" }, { status: 403 })
    }

    const schoolId = teacher.schoolId
    const program = teacher.program === "academy" ? "academy" : "school"
    const classes = Array.isArray(teacher.classes) ? teacher.classes : []

    const orgKey =
      typeof teacher.orgCode === "string" && teacher.orgCode.trim()
        ? teacher.orgCode.trim()
        : null

    const schoolCond = orgKey
      ? { $or: [{ schoolId: orgKey }, { orgCode: orgKey }] }
      : schoolId
      ? {
          $or: [
            { schoolId: String(schoolId) },
            { schoolId: Number(schoolId) },
            { orgCode: String(schoolId) },
          ],
        }
      : null

    const programCond =
      program === "academy"
        ? { program: "academy" }
        : {
            $and: [
              { grade: { $exists: true, $nin: [null, ""] } },
              { $or: [{ program: "school" }, { program: { $exists: false } }, { program: null }] },
            ],
          }

    let orClauses = []

    if (program === "academy") {
      orClauses = classes
        .filter((c) => c && (typeof c === "string" || c.course || c.grade))
        .map((c) => {
          if (typeof c === "string") return { subject: c }
          const courseName = c.course || c.grade
          const clause = { subject: courseName }
          if (c.section) clause.section = c.section
          if (c.batchNo) clause.batchNo = c.batchNo
          return clause
        })
    } else {
      orClauses = classes
        .filter((c) => c && (typeof c === "string" || c.grade))
        .map((c) => {
          if (typeof c === "string") return { grade: c }
          return { grade: c.grade, ...(c.section ? { section: c.section } : {}) }
        })
    }

    const sortObj =
      program === "academy"
        ? { subject: 1, section: 1, rollNo: 1 }
        : { grade: 1, section: 1, rollNo: 1 }

    let students = []

    if (orClauses.length > 0) {
      const matchClass = { $or: orClauses }
      const parts = [matchClass, programCond]
      if (schoolCond) parts.push(schoolCond)
      const studentFilter = { $and: parts }

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
        orgCode: teacher.orgCode || "",
        program,
      },
      students: formattedStudents,
    })
  } catch (err) {
    console.error("❌ GET /api/teacher/[id]/public:", err)
    return NextResponse.json(
      { error: "Something went wrong", detail: err?.message || String(err) },
      { status: 500 }
    )
  }
}