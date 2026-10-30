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
      console.error("Firebase Admin Initialization Error:", error)
    }
  }
}

export async function POST(req, { params }) {
  try {
    const { id } = await params
    const db = await getDb()

    const teacher = await db.collection("teachers").findOne({
      $or: [{ publicToken: id }, { token: id }],
    })
    
    if (!teacher) {
      return NextResponse.json({ error: "Invalid link" }, { status: 404 })
    }

    const data = await req.json()
    const { studentId, message, type } = data
    const schoolId = teacher.orgCode || teacher.schoolId

    // 1. Save the notification to the database
    await db.collection("notifications").insertOne({
      ...data,
      schoolId,
      createdAt: new Date(),
      readStatus: false,
    })

    // 2. FORCE DB LOOKUP FOR TOKEN
    // We ignore the frontend payload and find the token directly
    let fcmToken = null
    if (studentId && ObjectId.isValid(studentId)) {
      const student = await db.collection("students").findOne({ 
        _id: new ObjectId(studentId) 
      })
      if (student) {
        fcmToken = student.fcmToken || student.deviceToken || student.pushToken
      }
    }

    // 3. Send Push Notification
    if (fcmToken) {
      initFirebase()
      try {
        const payload = {
          token: fcmToken,
          notification: {
            title: "New Notification from School",
            body: message || "You have a new update.",
          },
          data: {
            studentId: String(studentId),
            type: String(type || "general"),
            click_action: "FLUTTER_NOTIFICATION_CLICK",
          },
        }
        await getMessaging().send(payload)
        console.log(`✅ PUSH SENT SUCCESSFULLY TO: ${studentId}`)
      } catch (fcmError) {
        console.error("❌ FIREBASE SEND ERROR:", fcmError.message)
      }
    } else {
      console.log(`⚠️ SKIPPED: Student ${studentId} has NO fcmToken saved in the database.`)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Notifications Route Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}