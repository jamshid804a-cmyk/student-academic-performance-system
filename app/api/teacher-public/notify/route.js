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

    // 1) Find teacher by public token (also accept "token" field)
    let teacher = await db.collection("teachers").findOne({ publicToken: token })
    if (!teacher) teacher = await db.collection("teachers").findOne({ token })
    if (!teacher) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 })
    }
    if (teacher.status && teacher.status.toLowerCase() !== "active") {
      return NextResponse.json({ error: "Teacher is inactive" }, { status: 403 })
    }

    const teacherProgram = teacher.program === "academy" ? "academy" : "school"

    // 2) Find student in BOTH collections, tolerate number/string ID and schoolId
    const idNum = Number(studentId)
    const idStr = String(studentId)
    const idOr = isNaN(idNum)
      ? [{ id: idStr }]
      : [{ id: idNum }, { id: idStr }]
    const sidOr = isNaN(idNum) ? [{ studentId: idStr }] : [{ studentId: idNum }, { studentId: idStr }]

    const idConds = []
    for (const c of idOr) idConds.push(c)
    for (const c of sidOr) idConds.push(c)

    // Try: teacher's schoolId + studentId, then just studentId (fallback)
    const schoolOr = teacher.schoolId
      ? [
          { schoolId: String(teacher.schoolId) },
          { schoolId: Number(teacher.schoolId) },
        ]
      : []

    let student = null

    // try "students" collection
    if (schoolOr.length) {
      student = await db.collection("students").findOne({
        $and: [{ $or: schoolOr }, { $or: idConds }],
      })
    }
    if (!student) {
      student = await db.collection("students").findOne({ $or: idConds })
    }

    // try "academy_students" collection (academy students may live here)
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

    // 3) Ownership check that passes for BOTH programs
    const sSchool = String(student.schoolId ?? "")
    const tSchool = String(teacher.schoolId ?? "")
    const sOrg = String(student.orgEmail ?? student.email ?? "").toLowerCase()
    const tOrg = String(teacher.orgEmail ?? teacher.email ?? "").toLowerCase()
    const sProgram = student.program === "academy" ? "academy" : "school"
    const tProgram = teacherProgram

    // program must match; plus at least one of school/org must match OR program+class match
    if (sProgram !== tProgram) {
      return NextResponse.json({ error: "Not your student" }, { status: 403 })
    }

    const schoolMatch = sSchool && tSchool && sSchool === tSchool
    const orgMatch = sOrg && tOrg && sOrg === tOrg
    const classMatch =
      Array.isArray(teacher.classes) &&
      teacher.classes.some((c) => {
        if (!c) return false
        const g = c.grade || c.course
        if (String(g || "").toLowerCase() !== String(student.grade || "").toLowerCase() &&
            String(g || "").toLowerCase() !== String(student.subject || "").toLowerCase()) return false
        if (c.section && String(c.section).toLowerCase() !== String(student.section || "").toLowerCase()) return false
        return true
      })

    if (!schoolMatch && !orgMatch && !classMatch) {
      return NextResponse.json({ error: "Not your student" }, { status: 403 })
    }

    // 4) Normalize type
    const finalType =
      type === "academic" ? "test" :
      type === "exam" ? "examination" :
      type || "attendance"

    // 5) Save notification (tagged with schoolId + program + orgEmail if present)
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

    // 6) Push (best effort). Look up the parent the same way the parent app logs in.
    try {
      // Try by phone (contact), orgEmail, or email — whichever the parent record has
      const candidates = []
      if (student.contact) candidates.push({ phone: String(student.contact) })
      if (student.contact) {
        const normalized = String(student.contact).replace(/[^\d+]/g, "")
        candidates.push({ phone: normalized })
      }
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