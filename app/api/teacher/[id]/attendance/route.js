import { NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getDb } from "@/utils"

// Build a student lookup that works with the long _id or the short numeric id
function studentIdConds(idStr) {
  const conds = [{ id: idStr }]
  if (!isNaN(Number(idStr))) conds.push({ id: Number(idStr) })
  if (ObjectId.isValid(idStr)) conds.push({ _id: new ObjectId(idStr) })
  return conds
}

// Turn school ids into both string and number forms so matching never fails
function schoolVariants(values) {
  return [...new Set(values.map((v) => String(v ?? "")).filter(Boolean))].flatMap((x) =>
    isNaN(Number(x)) ? [x] : [x, Number(x)]
  )
}

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

    // Single student history
    if (studentId) {
      const idStr = String(studentId)
      const stu = await db.collection("students").findOne({ $or: studentIdConds(idStr) })

      const ids = [idStr]
      if (stu) {
        ids.push(String(stu._id))
        if (stu.id != null) ids.push(String(stu.id))
      }
      const sIds = schoolVariants([stu?.schoolId, stu?.orgCode, orgKey, teacher.schoolId])

      const filter = { studentId: { $in: [...new Set(ids)] } }
      if (sIds.length) filter.schoolId = { $in: sIds }

      const records = await db.collection("attendance").find(filter).sort({ day: 1 }).toArray()
      return NextResponse.json(
        records.map((r) => ({ ...r, id: r._id.toString(), _id: undefined }))
      )
    }

    // 3. Build Strict Filter
    const studentFilter = { ...schoolCond, ...programCond }
    if (grade) studentFilter.grade = grade
    if (section) studentFilter.section = section
    if (session) studentFilter.session = session

    const students = await db
      .collection("students")
      .find(studentFilter)
      .sort({ rollNo: 1, _id: 1 })
      .toArray()

    if (students.length === 0) return NextResponse.json([])

    // Records may be saved under the short id (new) or the long _id (old)
    const studentIds = students.flatMap((s) =>
      [String(s._id), s.id != null ? String(s.id) : null].filter(Boolean)
    )
    const schoolIds = schoolVariants([
      ...students.map((s) => s.schoolId ?? s.orgCode),
      orgKey,
    ])
    const attFilter = { schoolId: { $in: schoolIds }, studentId: { $in: studentIds } }
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
        name: `${s.firstName || ""} ${s.lastName || ""}`.trim() || s.name,
        grade: s.grade,
        section: s.section,
        session: s.session,
        attendance:
          (s.id != null && byStudent[String(s.id)]) ||
          byStudent[String(s._id)] ||
          {},
        fcmToken: s.fcmToken || s.deviceToken || s.pushToken,
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

    const statusStr = String(teacher.status ?? "").toLowerCase()
    if (statusStr && statusStr !== "active") {
      return NextResponse.json({ error: "Teacher is inactive" }, { status: 403 })
    }

    const { studentId, day, date, status, present } = await req.json()
    if (!studentId || day === undefined || !date) {
      return NextResponse.json(
        { error: "studentId, day, date are required" },
        { status: 400 }
      )
    }

    // Find the student so we save the same IDs the website saves
    const student = await db
      .collection("students")
      .findOne({ $or: studentIdConds(String(studentId)) })
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 })

    const schoolId = student.schoolId ?? teacher.orgCode ?? teacher.schoolId
    const realStudentId = String(student.id ?? student._id)

    const finalStatus = String(
      status || (present === true ? "P" : present === false ? "A" : "P")
    ).toUpperCase()

    const filter = {
      schoolId,
      studentId: realStudentId,
      day: Number(day),
      date: String(date),
    }

    await db.collection("attendance").updateOne(
      filter,
      {
        $set: { ...filter, status: finalStatus, updatedAt: new Date() },
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