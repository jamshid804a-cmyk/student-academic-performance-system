import { NextResponse } from "next/server"
import { getDb } from "@/utils"

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

    // 1) Find teacher by public token (or legacy "token" field)
    let teacher = await db.collection("teachers").findOne({ publicToken: token })
    if (!teacher) teacher = await db.collection("teachers").findOne({ token })
    if (!teacher) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 })
    }
    if (teacher.status && teacher.status.toLowerCase() !== "active") {
      return NextResponse.json({ error: "Teacher is inactive" }, { status: 403 })
    }

    const teacherProgram = teacher.program === "academy" ? "academy" : "school"

    // 2) Find student — tolerant of number/string ID, schoolId, and collection name
    const idNum = Number(studentId)
    const idStr = String(studentId)
    const idConds = isNaN(idNum)
      ? [{ id: idStr }, { studentId: idStr }]
      : [{ id: idNum }, { id: idStr }, { studentId: idNum }, { studentId: idStr }]

    const schoolOr = teacher.schoolId
      ? [{ schoolId: String(teacher.schoolId) }, { schoolId: Number(teacher.schoolId) }]
      : []

    let student = null

    // Try "students" collection first
    if (schoolOr.length) {
      student = await db.collection("students").findOne({
        $and: [{ $or: schoolOr }, { $or: idConds }],
      })
    }
    if (!student) {
      student = await db.collection("students").findOne({ $or: idConds })
    }
    // Try "academy_students" if not found (some setups store academy students separately)
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

    // 3) Ownership check — LOOSER for academy
    const sSchool = String(student.schoolId ?? "")
    const tSchool = String(teacher.schoolId ?? "")
    const sOrg = String(student.orgEmail ?? student.email ?? "").toLowerCase()
    const tOrg = String(teacher.orgEmail ?? teacher.email ?? "").toLowerCase()
    const sProgram = student.program === "academy" ? "academy" : "school"
    const tProgram = teacherProgram

    const schoolMatch = sSchool && tSchool && sSchool === tSchool
    const orgMatch = sOrg && tOrg && sOrg === tOrg

    // Class match — student's grade (or subject for academy) + section matches teacher's classes
    const classMatch =
      Array.isArray(teacher.classes) &&
      teacher.classes.some((c) => {
        if (!c) return false
        const g = String((c.grade || c.course || "")).toLowerCase()
        const sGrade = String(student.grade || "").toLowerCase()
        const sSubject = String(student.subject || "").toLowerCase()
        if (g && g !== sGrade && g !== sSubject) return false
        if (c.section) {
          const cSec = String(c.section).toLowerCase()
          const sSec = String(student.section || "").toLowerCase()
          if (cSec !== sSec) return false
        }
        return true
      })

    const programOk = sProgram === tProgram

    // ✅ Academy: just needs program + class match (schoolId may differ)
    const academyOk = tProgram === "academy" && classMatch
    // ✅ School: needs program + (schoolId OR class match)
    const schoolOk = tProgram === "school" && (schoolMatch || classMatch)

    console.log("DEBUG notify ownership:", {
      teacherId: teacher.teacherId,
      tProgram,
      tSchool,
      tOrg,
      studentId: student.id ?? student._id,
      sProgram,
      sSchool,
      sOrg,
      sGrade: student.grade,
      sSubject: student.subject,
      sSection: student.section,
      teacherClasses: teacher.classes,
      schoolMatch,
      orgMatch,
      classMatch,
      programOk,
      academyOk,
      schoolOk,
    })

    if (!programOk || (!academyOk && !schoolOk)) {
      return NextResponse.json({ error: "Not your student" }, { status: 403 })
    }

    // 4) Normalize notification type
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
      if (sOrg) candidates.push({ email: sOrg })
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