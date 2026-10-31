import { NextResponse } from "next/server"
import { getDb } from "@/utils"
import { ObjectId } from "mongodb"
import { getApps, initializeApp, cert } from "firebase-admin/app"
import { getMessaging } from "firebase-admin/messaging"

function initFirebase() {
  if (getApps().length === 0) {
    try {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
      })
    } catch (error) {
      console.error("Firebase init error:", error)
    }
  }
}

const isExpoToken = (t) => /^Expo(nent)?PushToken\[/.test(String(t || ""))

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
    const { fcmToken: clientToken, studentId, message, type } = data

    if (!studentId || !message) {
      return NextResponse.json({ error: "studentId and message required" }, { status: 400 })
    }

    const schoolId = teacher.orgCode || teacher.schoolId
    const idStr = String(studentId)

    // 1. Save notification (without the token)
    const { fcmToken: _omit, ...safeData } = data
    await db.collection("notifications").insertOne({
      ...safeData,
      studentId: idStr,
      schoolId,
      createdAt: new Date(),
      readStatus: false,
    })
    console.log("STEP 1: notification saved for", idStr)

    // 2. Find student (by _id or id/studentId fields)
    const conds = [{ id: idStr }, { studentId: idStr }]
    if (!isNaN(Number(idStr))) conds.push({ id: Number(idStr) }, { studentId: Number(idStr) })
    if (ObjectId.isValid(idStr)) conds.push({ _id: new ObjectId(idStr) })

    const student = await db.collection("students").findOne({ $or: conds })
    console.log("STEP 2: student found?", !!student)

    // 3. Collect every possible token
    const tokens = new Set()
    if (clientToken) tokens.add(String(clientToken))
    if (student) {
      ;[student.fcmToken, student.deviceToken, student.pushToken].forEach((t) => t && tokens.add(String(t)))

      // parent token (Expo)
      const candidates = []
      if (student.contact) {
        const raw = String(student.contact)
        const digits = raw.replace(/\D/g, "")
        candidates.push({ phone: raw }, { phone: digits }, { phone: "+" + digits })
        if (digits.length >= 10) candidates.push({ phone: { $regex: digits.slice(-10) + "$" } })
      }
      if (student.email) candidates.push({ email: String(student.email).toLowerCase() })

      for (const c of candidates) {
        const parent = await db.collection("parents").findOne(c)
        if (parent) {
          ;[parent.pushToken, parent.fcmToken].forEach((t) => t && tokens.add(String(t)))
          break
        }
      }
    }
    console.log("STEP 3: tokens found:", tokens.size)

    // 4. Send: Expo tokens via Expo, others via Firebase
    const title = "Attendance Alert"
    const dataPayload = { studentId: idStr, type: String(type || "attendance") }

    for (const tok of tokens) {
      try {
        if (isExpoToken(tok)) {
          const r = await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: tok,
              sound: "default",
              title,
              body: message,
              data: dataPayload,
              channelId: `channel_${dataPayload.type}`,
            }),
          })
          console.log("EXPO RESPONSE:", JSON.stringify(await r.json().catch(() => ({}))))
        } else {
          initFirebase()
          await getMessaging().send({
            token: tok,
            notification: { title, body: message },
            data: dataPayload,
          })
          console.log("FIREBASE SENT OK")
        }
      } catch (e) {
        console.error("PUSH ERROR:", e.message)
      }
    }

    if (tokens.size === 0) console.warn("SKIPPED: no token found for student", idStr)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("SERVER CRASH:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}