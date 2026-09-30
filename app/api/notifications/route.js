import { NextResponse } from "next/server"
import { getDb } from "@/utils"
import { ObjectId } from "mongodb"
import { getCurrentSchool } from "@/utils/getCurrentSchool"

// ─────────────────────────────────────────────
// Push notification helper
// ─────────────────────────────────────────────
async function sendPushNotification(db, schoolId, studentId, type, message) {
  try {
    const student = await db
      .collection("students")
      .findOne({ schoolId, id: Number(studentId) })

    if (!student?.contact) {
      console.log("⚠️ No student/contact found for push:", studentId)
      return
    }

    const parent = await db
      .collection("parents")
      .findOne({ phone: student.contact })

    if (!parent?.pushToken) {
      console.log("⚠️ No pushToken for parent phone:", student.contact)
      return
    }

    // Map legacy types just in case
    const pushType =
      type === "exam" ? "examination" :
      type === "academic" ? "test" :
      type || "attendance"

    const pushRes = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: parent.pushToken,
        sound: "default",
        title: "New Notification",
        body: message,
        data: { type: pushType },
        channelId: `channel_${pushType}`,
      }),
    })

    const pushData = await pushRes.json()
    console.log("📲 Push result:", JSON.stringify(pushData))
  } catch (e) {
    console.error("❌ Push send failed:", e.message)
  }
}

// ─────────────────────────────────────────────
// GET — notifications for a student (school-scoped)
// ─────────────────────────────────────────────
export async function GET(req) {
  try {
    const schoolResult = await getCurrentSchool()
    if (!schoolResult.success) {
      return NextResponse.json(
        { error: schoolResult.error || "Unauthorized" },
        { status: 401 }
      )
    }
    const { schoolId } = schoolResult.school

    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get("studentId")

    if (!studentId) {
      return NextResponse.json({ error: "studentId required" }, { status: 400 })
    }

    const db = await getDb()

    const notifications = await db
      .collection("notifications")
      .find({ schoolId, studentId: String(studentId) })
      .sort({ createdAt: -1 })
      .toArray()

    return NextResponse.json(
      notifications.map((n) => ({
        ...n,
        id: n._id.toString(),
        _id: undefined,
      }))
    )
  } catch (err) {
    console.error("❌ GET /api/notifications:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// POST — save notification (tagged with schoolId)
//   type: "attendance" | "test" | "examination" | "fee"
// ─────────────────────────────────────────────
export async function POST(req) {
  try {
    const schoolResult = await getCurrentSchool()
    if (!schoolResult.success) {
      return NextResponse.json(
        { error: schoolResult.error || "Unauthorized" },
        { status: 401 }
      )
    }
    const { schoolId } = schoolResult.school

    const data = await req.json()
    const { studentId, message, blockNumber, weekStart, weekEnd, type } = data

    if (!studentId || !message) {
      return NextResponse.json(
        { error: "studentId and message are required" },
        { status: 400 }
      )
    }

    // Normalize legacy "academic" → "test" so the app can pick the right sound
    const finalType =
      type === "academic" ? "test" :
      type === "exam" ? "examination" :
      type || "attendance"

    const db = await getDb()
    const collection = db.collection("notifications")

    // Duplicate check ONLY for attendance (weekly block logic)
    if (finalType === "attendance") {
      const existing = await collection.findOne({
        schoolId,
        studentId: String(studentId),
        blockNumber: Number(blockNumber),
        weekStart: Number(weekStart),
        weekEnd: Number(weekEnd),
        type: "attendance",
      })
      if (existing) {
        return NextResponse.json({ success: false, alreadySent: true })
      }
    }

    const result = await collection.insertOne({
      schoolId,                          // ✅ NEW
      studentId: String(studentId),
      message,
      readStatus: false,
      blockNumber: Number(blockNumber) || 0,
      weekStart: Number(weekStart) || 0,
      weekEnd: Number(weekEnd) || 0,
      type: finalType,
      createdAt: new Date(),
    })

    // Fire the push in the background
    sendPushNotification(db, schoolId, studentId, finalType, message)

    return NextResponse.json({
      success: true,
      id: result.insertedId.toString(),
    })
  } catch (err) {
    console.error("❌ POST /api/notifications:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// PUT — mark as read (school-scoped)
// ─────────────────────────────────────────────
export async function PUT(req) {
  try {
    const schoolResult = await getCurrentSchool()
    if (!schoolResult.success) {
      return NextResponse.json(
        { error: schoolResult.error || "Unauthorized" },
        { status: 401 }
      )
    }
    const { schoolId } = schoolResult.school

    const data = await req.json()
    if (!data.id) {
      return NextResponse.json({ error: "id required" }, { status: 400 })
    }

    const db = await getDb()

    let result
    try {
      result = await db.collection("notifications").updateOne(
        { _id: new ObjectId(data.id), schoolId },
        { $set: { readStatus: true } }
      )
    } catch {
      result = await db.collection("notifications").updateOne(
        { id: data.id, schoolId },
        { $set: { readStatus: true } }
      )
    }

    return NextResponse.json({ success: true, result })
  } catch (err) {
    console.error("❌ PUT /api/notifications:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// DELETE — remove one notification (school-scoped)
// ─────────────────────────────────────────────
export async function DELETE(req) {
  try {
    const schoolResult = await getCurrentSchool()
    if (!schoolResult.success) {
      return NextResponse.json(
        { error: schoolResult.error || "Unauthorized" },
        { status: 401 }
      )
    }
    const { schoolId } = schoolResult.school

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 })
    }

    const db = await getDb()

    let result
    try {
      result = await db.collection("notifications").deleteOne({
        _id: new ObjectId(id),
        schoolId,
      })
    } catch {
      result = await db.collection("notifications").deleteOne({ id, schoolId })
    }

    return NextResponse.json({ success: true, result })
  } catch (err) {
    console.error("❌ DELETE /api/notifications:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}