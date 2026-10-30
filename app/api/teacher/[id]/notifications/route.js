import { NextResponse } from "next/server"
import { getDb } from "@/utils"
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
    // ✅ Grab the token sent directly from RiskBox
    const { studentId, message, type, fcmToken } = data 
    
    console.log(`🔍 RECEIVED NOTIFICATION | Type: ${type} | Student ID: ${studentId} | Has Token: ${!!fcmToken}`)

    const schoolId = teacher.orgCode || teacher.schoolId

    // 1. Save the notification to the database
    await db.collection("notifications").insertOne({
      studentId,
      message,
      type,
      blockNumber: data.blockNumber,
      weekStart: data.weekStart,
      weekEnd: data.weekEnd,
      schoolId,
      createdAt: new Date(),
      readStatus: false,
    })

    // 2. Send Push Notification via Firebase
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
      console.log(`⚠️ PUSH SKIPPED: No FCM token found in payload for student ${studentId}`)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Notifications Route Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}