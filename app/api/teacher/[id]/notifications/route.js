import { NextResponse } from "next/server"
import { getDb } from "@/utils"
import { ObjectId } from "mongodb"

async function sendPush(db, student, schoolId, studentId, type, message, program) {
  try {
    if (!student?.contact) {
      console.log("⚠️ No contact on student:", studentId)
      return
    }
    const raw = String(student.contact)
    const digits = raw.replace(/\D/g, "")
    const candidates = [{ phone: raw }, { phone: digits }, { phone: "+" + digits }]
    if (digits.length >= 10) candidates.push({ phone: { $regex: digits.slice(-10) + "$" } })

    let parent = null
    for (const c of candidates) {
      parent = await db.collection("parents").findOne(c)
      if (parent) break
    }
    if (!parent?.pushToken) {
      console.log("⚠️ No pushToken for parent phone:", student.contact)
      return
    }

    const r = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        to: parent.pushToken,
        sound: "default",
        title: program === "academy" ? "Academy Alert" : "School Alert",
        body: message,
        data: {
          type,
          program: program || "school",
          schoolId: String(schoolId),
          studentId: String(studentId),
        },
        channelId: `channel_${type}`,
      }),
    })
    console.log("EXPO RESPONSE:", JSON.stringify(await r.json().catch(() => ({}))))
  } catch (e) {
    console.error("❌ Push send failed:", e.message)
  }
}

export async function POST(req, { params }) {
  try {
    const { id } = await params
    const db = await getDb()

    const teacher = await db.collection("teachers").findOne({
      $or: [{ publicToken: id }, { token: id }],
    })
    if (!teacher) return NextResponse.json({ error: "Invalid link" }, { status: 404 })

    const statusStr = String(teacher.status ?? "").toLowerCase()
    if (statusStr && statusStr !== "active") {
      return NextResponse.json({ error: "Teacher is inactive" }, { status: 403 })
    }

    const data = await req.json()
    const { studentId, message, blockNumber, weekStart, weekEnd, type } = data
    if (!studentId || !message) {
      return NextResponse.json({ error: "studentId and message are required" }, { status: 400 })
    }

    const orgId = teacher.orgCode || teacher.schoolId
    const idStr = String(studentId)

    // Find student by _id OR numeric id
    const conds = [{ id: idStr }, { studentId: idStr }]
    if (!isNaN(Number(idStr))) conds.push({ id: Number(idStr) }, { studentId: Number(idStr) })
    if (ObjectId.isValid(idStr)) conds.push({ _id: new ObjectId(idStr) })

    const student = await db.collection("students").findOne({ $or: conds })
    if (!student) {
      console.log("STEP ERROR: student not found for", idStr)
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Same school check
    const sSchool = String(student.schoolId ?? student.orgCode ?? "")
    if (orgId && sSchool && sSchool !== String(orgId)) {
      return NextResponse.json({ error: "Not your student" }, { status: 403 })
    }

    // Use the SAME ids the admin route saves
    const actualStudentId = String(student.id ?? student._id)
    const schoolId = student.schoolId ?? orgId
    const program = student.program || "school"

    const finalType =
      type === "academic" ? "test" :
      type === "exam" ? "examination" :
      type || "attendance"

    const collection = db.collection("notifications")

    if (finalType === "attendance") {
      const existing = await collection.findOne({
        schoolId,
        studentId: actualStudentId,
        blockNumber: Number(blockNumber),
        weekStart: Number(weekStart),
        weekEnd: Number(weekEnd),
        type: "attendance",
      })
      if (existing) return NextResponse.json({ success: false, alreadySent: true })
    }

    const result = await collection.insertOne({
      schoolId,
      studentId: actualStudentId,
      message,
      readStatus: false,
      blockNumber: Number(blockNumber) || 0,
      weekStart: Number(weekStart) || 0,
      weekEnd: Number(weekEnd) || 0,
      type: finalType,
      program,
      createdAt: new Date(),
    })
    console.log("STEP 1: saved for studentId", actualStudentId, "schoolId", schoolId)

    await sendPush(db, student, schoolId, actualStudentId, finalType, message, program)

    return NextResponse.json({ success: true, id: result.insertedId.toString() })
  } catch (err) {
    console.error("❌ POST teacher notifications:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}