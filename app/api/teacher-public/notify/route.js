import { NextResponse } from "next/server"
import { getDb } from "@/utils"

// ─────────────────────────────────────────────
// POST — public notification via teacher token
//   Body: { token, studentId, message, type }
//   type: "attendance" | "test" | "examination" | "fee"
// ─────────────────────────────────────────────
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
    const teacher = await db.collection("teachers").findOne({ publicToken: token })
    if (!teacher) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 })
    }
    if (teacher.status && teacher.status.toLowerCase() !== "active") {
      return NextResponse.json({ error: "Teacher is inactive" }, { status: 403 })
    }

    // Make sure the student belongs to this teacher's school
    const student = await db.collection("students").findOne({
      schoolId: teacher.schoolId,
      id: Number(studentId),
    })
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Only allow the teacher to notify students in their own program
    if (teacher.program === "academy" && student.program !== "academy") {
      return NextResponse.json({ error: "Not your student" }, { status: 403 })
    }
    if (!teacher.program && student.program === "academy") {
      return NextResponse.json({ error: "Not your student" }, { status: 403 })
    }

    const finalType =
      type === "academic" ? "test" :
      type === "exam" ? "examination" :
      type || "attendance"

    const doc = {
      schoolId: teacher.schoolId,
      studentId: String(studentId),
      message,
      readStatus: false,
      blockNumber: 0,
      weekStart: 0,
      weekEnd: 0,
      type: finalType,
      program: teacher.program === "academy" ? "academy" : "school",
      teacherToken: token,
      createdAt: new Date(),
    }

    const result = await db.collection("notifications").insertOne(doc)

    // Fire push notification (best-effort, don't fail on error)
    try {
      const parent = student.contact
        ? await db.collection("parents").findOne({ phone: student.contact })
        : null
      if (parent?.pushToken) {
        await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: parent.pushToken,
            sound: "default",
            title: "New Notification",
            body: message,
            data: { type: finalType },
            channelId: `channel_${finalType}`,
          }),
        })
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