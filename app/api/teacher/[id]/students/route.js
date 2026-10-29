import { NextResponse } from "next/server"
import { getDb } from "@/utils"

const norm = (v) => String(v ?? "").trim().toLowerCase()

// Is the requested grade/section one of the teacher's assigned classes?
function isAllowedClass(teacher, grade, section) {
  const classes = Array.isArray(teacher.classes) ? teacher.classes : []
  return classes.some((c) => {
    if (!c) return false
    const g = c.grade || c.course
    if (norm(g) !== norm(grade)) return false
    // if the teacher's class has no section, any section of that grade is allowed
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
    const studentId = searchParams.get("studentId")
    const grade = searchParams.get("grade")
    const month = searchParams.get("month")
    const section = searchParams.get("section")
    const session = searchParams.get("session")

    const schoolCond = schoolId
      ? { $or: [{ schoolId: String(schoolId) }, { schoolId: Number(schoolId) }] }
      : {}

    if (studentId) {
      const records = await db
        .collection("attendance")
        .find({ ...schoolCond, studentId: String(studentId) })
        .sort({ day: 1 })
        .toArray()
      return NextResponse.json(
        records.map((r) => ({ ...r, id: r._id.toString(), _id: undefined }))
      )
    }

    // Teacher can only open their own assigned classes
    if (!grade || !isAllowedClass(teacher, grade, section)) {
      return NextResponse.json([])
    }

    const baseFilter = { ...schoolCond, grade }
    if (section) baseFilter.section = section

    // 1st try: with session. If nothing found, try again without session
    // (a session text mismatch was hiding the students on the phone)
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
    if (students.length === 0) return NextResponse.json([])

    const sid = (s) => String(s.id ?? s._id)
    const studentIds = students.map(sid)
    const attFilter = { ...schoolCond, studentId: { $in: studentIds } }
    if (month) attFilter.date = month

    const records = await db.collection("attendance").find(attFilter).toArray()

    const byStudent = {}
    records.forEach((r) => {
      const key = String(r.studentId)
      if (!byStudent[key]) byStudent[key] = {}
      byStudent[key][String(r.day)] = r.status || (r.present ? "P" : "A")
    })

    return NextResponse.json(
      students.map((s) => ({
        studentId: s.id ?? s._id.toString(),
        rollNo: s.rollNo,
        name: s.name,
        grade: s.grade,
        section: s.section,
        session: s.session,
        attendance: byStudent[sid(s)] || {},
      }))
    )
  } catch (err) {
    console.error("attendance route:", err.message)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}

export async function POST(req, { params }) {
  try {
    const { id } = await params
    const db = await getDb()

    const teacher = await findTeacher(db, id)
    if (!teacher) return NextResponse.json({ error: "Invalid link" }, { status: 404 })
    if (teacher.status && teacher.status.toLowerCase() !== "active") {
      return NextResponse.json({ error: "Teacher is inactive" }, { status: 403 })
    }

    const schoolId = teacher.schoolId
    const data = await req.json()
    const { studentId, day, date, status, present } = data

    if (!studentId || day === undefined || !date) {
      return NextResponse.json(
        { error: "studentId, day, date are required" },
        { status: 400 }
      )
    }

    const finalStatus =
      status || (present === true ? "P" : present === false ? "A" : "P")

    await db.collection("attendance").updateOne(
      { schoolId, studentId: String(studentId), day: Number(day), date: String(date) },
      {
        $set: {
          schoolId,
          studentId: String(studentId),
          day: Number(day),
          date: String(date),
          status: String(finalStatus).toUpperCase(),
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("attendance POST:", err.message)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}