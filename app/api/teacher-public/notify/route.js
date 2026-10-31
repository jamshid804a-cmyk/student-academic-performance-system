import { NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getDb } from "@/utils"

export async function POST(req) {
  try {
    const body = await req.json()
    const { token, studentId, message, type } = body

    if (!token || !studentId || !message) {
      return NextResponse.json({ error: "token, studentId, message required" }, { status: 400 })
    }

    const db = await getDb()

    let teacher = await db.collection("teachers").findOne({ publicToken: token })
    if (!teacher) teacher = await db.collection("teachers").findOne({ token })
    if (!teacher) return NextResponse.json({ error: "Invalid token" }, { status: 403 })
    if (teacher.status && teacher.status.toLowerCase() !== "active") {
      return NextResponse.json({ error: "Teacher is inactive" }, { status: 403 })
    }

    const orgId = teacher.orgCode || teacher.schoolId
    const teacherProgram = teacher.program === "academy" ? "academy" : "school"

    // Find student
    const idNum = Number(studentId)
    const idStr = String(studentId)
    const idConds = isNaN(idNum)
      ? [{ id: idStr }, { studentId: idStr }]
      : [{ id: idNum }, { id: idStr }, { studentId: idNum }, { studentId: idStr }]
    if (ObjectId.isValid(idStr)) idConds.push({ _id: new ObjectId(idStr) })

    const schoolOr = orgId
      ? [{ schoolId: String(orgId) }, { schoolId: Number(orgId) }, { orgCode: String(orgId) }]
      : []

    let student = null
    for (const col of ["students", "academy_students"]) {
      if (!student && schoolOr.length) {
        student = await db.collection(col).findOne({ $and: [{ $or: schoolOr }, { $or: idConds }] })
      }
      if (!student) {
        student = await db.collection(col).findOne({ $or: idConds })
      }
      if (student) break
    }
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 })

    // Ownership check
    const sSchool = String(student.schoolId ?? student.orgCode ?? "")
    const tSchool = String(orgId ?? "")
    const schoolMatch = !!(sSchool && tSchool && sSchool === tSchool)

    const classMatch =
      Array.isArray(teacher.classes) &&
      teacher.classes.some((c) => {
        if (!c) return false
        const courseOrGrade = String(c.course || c.grade || "").toLowerCase()
        const sGrade = String(student.grade || "").toLowerCase()
        const sSubject = String(student.subject || "").toLowerCase()
        const sCourse = String(student.course || "").toLowerCase()
        if (courseOrGrade && courseOrGrade !== sGrade && courseOrGrade !== sSubject && courseOrGrade !== sCourse) {
          return false
        }
        if (c.section) {
          if (String(c.section).toLowerCase() !== String(student.section || "").toLowerCase()) return false
        }
        return true
      })

    if (!(schoolMatch || classMatch)) {
      return NextResponse.json({ error: "Not your student" }, { status: 403 })
    }

    const finalType =
      type === "academic" ? "test" :
      type === "exam" ? "examination" :
      type || "attendance"

    const realStudentId = String(student.id ?? student._id ?? studentId)

    // Save notification
    const doc = {
      schoolId: orgId,
      studentId: realStudentId,
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

    // Push to parent
    try {
      const candidates = []
      if (student.contact) {
        const raw = String(student.contact)
        const digits = raw.replace(/\D/g, "")
        candidates.push({ phone: raw }, { phone: digits }, { phone: "+" + digits })
        if (digits.length >= 10) {
          candidates.push({ phone: { $regex: digits.slice(-10) + "$" } })
        }
      }
      if (student.email) candidates.push({ email: String(student.email).toLowerCase() })

      let parent = null
      for (const c of candidates) {
        parent = await db.collection("parents").findOne(c)
        if (parent) break
      }

      const tok = parent?.pushToken
      if (tok && /^Expo(nent)?PushToken\[/.test(tok)) {
        const payload = {
          to: tok,
          sound: "default",
          title: teacherProgram === "academy" ? "Academy Alert" : "School Alert",
          body: message,
          data: {
            type: finalType,
            program: teacherProgram,
            schoolId: String(orgId),
            studentId: realStudentId,
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
      } else {
        console.warn("No valid parent Expo token:", { found: !!parent, tok })
      }
    } catch (e) {
      console.error("Push send failed:", e.message)
    }

    return NextResponse.json({ success: true, id: result.insertedId.toString() })
  } catch (err) {
    console.error("POST /api/teacher-public/notify:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}