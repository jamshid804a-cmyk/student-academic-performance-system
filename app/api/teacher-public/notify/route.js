import { NextResponse } from "next/server"
import { getDb } from "@/utils"

// POST — public notification via teacher token
// Body: { token, studentId, message, type }
export async function POST(req) {
  try {
    const body = await req.json()
    const { token, studentId, message, type } = body

    if (!token || !studentId || !message) {
      return NextResponse.json(
        { error: "token, studentId, message required" },
        { status: 400 }
      )
    }

    const db = await getDb()

    // 1) Find teacher by publicToken or token
    let teacher = await db.collection("teachers").findOne({ publicToken: token })
    if (!teacher) teacher = await db.collection("teachers").findOne({ token })
    if (!teacher) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 })
    }
    if (teacher.status && teacher.status.toLowerCase() !== "active") {
      return NextResponse.json({ error: "Teacher is inactive" }, { status: 403 })
    }

    const teacherProgram = teacher.program === "academy" ? "academy" : "school"

    // 2) Find student (tolerant of number/string ID and collection name)
    const idNum = Number(studentId)
    const idStr = String(studentId)
    const idConds = isNaN(idNum)
      ? [{ id: idStr }, { studentId: idStr }]
      : [{ id: idNum }, { id: idStr }, { studentId: idNum }, { studentId: idStr }]

    const schoolOr = teacher.schoolId
      ? [{ schoolId: String(teacher.schoolId) }, { schoolId: Number(teacher.schoolId) }]
      : []

    let student = null

    if (schoolOr.length) {
      student = await db.collection("students").findOne({
        $and: [{ $or: schoolOr }, { $or: idConds }],
      })
    }
    if (!student) {
      student = await db.collection("students").findOne({ $or: idConds })
    }
    if (!student) {
      if (schoolOr.length) {
        student = await db.collection("academy_students").findOne({
          $and: [{ $or: schoolOr }, { $or: idConds }],
        })
      }
      if (!student) {
        student = await db.collection("academy_students").findOne({ $or: idConds })
      }
    }

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // 3) Ownership check
    const sSchool = String(student.schoolId ?? "")
    const tSchool = String(teacher.schoolId ?? "")
    const sProgram = student.program === "academy" ? "academy" : "school"
    const tProgram = teacherProgram

    const schoolMatch = !!(sSchool && tSchool && sSchool === tSchool)

    const classMatch =
      Array.isArray(teacher.classes) &&
      teacher.classes.some((c) => {
        if (!c) return false
        const courseOrGrade = String(c.course || c.grade || "").toLowerCase()
        const sGrade = String(student.grade || "").toLowerCase()
        const sSubject = String(student.subject || "").toLowerCase()
        const sCourse = String(student.course || "").toLowerCase()
        if (
          courseOrGrade &&
          courseOrGrade !== sGrade &&
          courseOrGrade !== sSubject &&
          courseOrGrade !== sCourse
        ) {
          return false
        }
        if (c.section) {
          const cSec = String(c.section).toLowerCase()
          const sSec = String(student.section || "").toLowerCase()
          if (cSec !== sSec) return false
        }
        return true
      })

    // Allow if same school OR class matches. (Token ownership already proves
    // the teacher is legitimate; we don't block on program field mismatch.)
    const ownsStudent = schoolMatch || classMatch

    console.log("DEBUG notify ownership:", {
      teacherId: teacher.teacherId,
      tProgram,
      tSchool,
      studentId: student.id ?? student._id,
      sProgram,
      sSchool,
      sGrade: student.grade,
      sSubject: student.subject,
      sSection: student.section,
      teacherClasses: teacher.classes,
      schoolMatch,
      classMatch,
      ownsStudent,
    })

    if (!ownsStudent) {
      return NextResponse.json({ error: "Not your student" }, { status: 403 })
    }

    // 4) Normalize type
    const finalType =
      type === "academic" ? "test" :
      type === "exam" ? "examination" :
      type || "attendance"

    // 5) Save notification
    const doc = {
      schoolId: teacher.schoolId,
      studentId: String(student.id ?? student._id ?? studentId),
      message,
      readStatus: false,
      blockNumber: 0,
      weekStart: 0,
      weekEnd: 0,
      type: finalType,
      program: teacherProgram,
      teacherToken: token,
      createdAt: new Date(),
    }
    if (teacherProgram === "academy") {
      doc.orgEmail = String(teacher.orgEmail ?? teacher.email ?? "").toLowerCase()
    }

    const result = await db.collection("notifications").insertOne(doc)

    // 6) Push to parent (best-effort)
    try {
      const candidates = []
      if (student.contact) {
        candidates.push({ phone: String(student.contact) })
        candidates.push({ phone: String(student.contact).replace(/[^\d+]/g, "") })
      }
      if (student.email) candidates.push({ email: String(student.email).toLowerCase() })
      if (teacherProgram === "academy") {
        const orgEmail = String(teacher.orgEmail ?? teacher.email ?? "").toLowerCase()
        if (orgEmail) {
          candidates.push({ orgEmail })
          candidates.push({ email: orgEmail })
        }
      }

      let parent = null
      for (const c of candidates) {
        parent = await db.collection("parents").findOne(c)
        if (parent) break
      }

      if (parent?.pushToken) {
        const payload = {
          to: parent.pushToken,
          sound: "default",
          title: teacherProgram === "academy" ? "Academy Alert" : "School Alert",
          body: message,
          data: {
            type: finalType,
            program: teacherProgram,
            schoolId: String(teacher.schoolId),
            studentId: String(student.id ?? student._id ?? studentId),
          },
          channelId: `channel_${finalType}`,
        }
        const expoRes = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const expoJson = await expoRes.json().catch(() => ({}))
        console.log("EXPO PUSH RESPONSE:", JSON.stringify(expoJson))
        if (expoJson?.data?.status === "error") {
          console.error("Push error:", expoJson.data.message || expoJson.data.details)
        }
      } else {
        console.warn("No parent pushToken found for student", studentId)
      }
    } catch (e) {
      console.error("Push send failed:", e.message)
    }

    return NextResponse.json({ success: true, id: result.insertedId.toString() })
  } catch (err) {
    console.error("❌ POST /api/teacher-public/notify:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}