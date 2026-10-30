import { NextResponse } from "next/server"
import { getDb } from "@/utils"

export async function GET(req, { params }) {
  try {
    const { id } = await params
    const db = await getDb()

    const teacher = await db.collection("teachers").findOne({
      $or: [{ publicToken: id }, { token: id }]
    })
    
    if (!teacher) return NextResponse.json({ error: "Invalid link" }, { status: 404 })
    
    const statusStr = String(teacher.status ?? "").toLowerCase()
    if (statusStr && statusStr !== "active") {
      return NextResponse.json({ error: "Teacher is inactive" }, { status: 403 })
    }

    const teacherProgram = teacher.program === "academy" ? "academy" : "school"
    const orgKey = typeof teacher.orgCode === "string" && teacher.orgCode.trim() ? teacher.orgCode.trim() : null

    // 1. Match School/Org
    const schoolCond = orgKey
      ? { $or: [{ schoolId: orgKey }, { orgCode: orgKey }] }
      : teacher.schoolId
      ? { $or: [{ schoolId: String(teacher.schoolId) }, { schoolId: Number(teacher.schoolId) }, { orgCode: String(teacher.schoolId) }] }
      : {}

    // 2. Match Program (School vs Academy)
    const programCond =
      teacherProgram === "academy"
        ? { program: "academy" }
        : {
            $and: [
              { grade: { $exists: true, $nin: [null, ""] } },
              { $or: [{ program: "school" }, { program: { $exists: false } }, { program: null }] },
            ],
          }

    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get("studentId")
    const grade = searchParams.get("grade")
    const month = searchParams.get("month")
    const section = searchParams.get("section")
    const session = searchParams.get("session")

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

    // 3. Build Strict Filter
    const studentFilter = { ...schoolCond, ...programCond }
    if (grade) studentFilter.grade = grade
    if (section) studentFilter.section = section
    if (session) studentFilter.session = session

    // Fetch only the correct students
    const students = await db
      .collection("students")
      .find(studentFilter)
      .sort({ rollNo: 1, _id: 1 })
      .toArray()
      
    if (students.length === 0) return NextResponse.json([])

    const studentIds = students.map((s) => String(s._id))
    const attFilter = { ...schoolCond, studentId: { $in: studentIds } }
    if (month) attFilter.date = month

    const records = await db.collection("attendance").find(attFilter).toArray()

    const byStudent = {}
    records.forEach((r) => {
      const sid = String(r.studentId)
      if (!byStudent[sid]) byStudent[sid] = {}
      byStudent[sid][String(r.day)] = r.status || (r.present ? "P" : "A")
    })

    return NextResponse.json(
      students.map((s) => ({
        studentId: s._id.toString(),
        rollNo: s.rollNo,
        name: `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.name,
        grade: s.grade,
        section: s.section,
        session: s.session,
        attendance: byStudent[s._id.toString()] || {},
      }))
    )
  } catch (err) {
    console.error("attendance route:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req, { params }) {
  try {
    const { id } = await params
    const db = await getDb()

    const teacher = await db.collection("teachers").findOne({
      $or: [{ publicToken: id }, { token: id }]
    })
    if (!teacher) return NextResponse.json({ error: "Invalid link" }, { status: 404 })

    const schoolId = teacher.orgCode || teacher.schoolId
    const data = await req.json()
    const { studentId, day, date, status, present } = data

    if (!studentId || day === undefined || !date) {
      return NextResponse.json(
        { error: "studentId, day, date are required" },
        { status: 400 }
      )
    }

    const finalStatus = status || (present === true ? "P" : present === false ? "A" : "P")

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
    console.error("attendance POST:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}