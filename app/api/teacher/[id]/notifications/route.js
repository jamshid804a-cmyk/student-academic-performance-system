import { NextResponse } from "next/server"
import { getDb } from "@/utils"
import { ObjectId } from "mongodb"
import admin from "firebase-admin"

// ✅ Initialize Firebase Admin safely (prevents crash on hot-reload)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Replace literal \n with actual newlines for Vercel
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    })
  } catch (error) {
    console.error("Firebase Admin Initialization Error:", error)
  }
}

export async function POST(req, { params }) {
  try {
    const { id } = await params // ✅ Next.js 15 fix
    const db = await getDb()

    // ✅ Match by either publicToken or token
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

    // 2. Find the student to get their FCM (Push) token
    let fcmToken = null
    if (studentId && ObjectId.isValid(studentId)) {
      const student = await db.collection("students").findOne({ 
        _id: new ObjectId(studentId) 
      })
      // Look for the token in common field names
      fcmToken = student?.fcmToken || student?.deviceToken || student?.pushToken
    }

    // 3. Send Push Notification via Firebase
    if (fcmToken) {
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
            click_action: "FLUTTER_NOTIFICATION_CLICK", // Necessary for some mobile apps
          },
        }

        await admin.messaging().send(payload)
        console.log(`✅ Push sent to ${studentId}`)
      } catch (fcmError) {
        // If the token is invalid or expired, Firebase throws an error
        console.error("❌ Firebase Send Error:", fcmError.message)
        
        // Optional: If token is invalid, you should remove it from the DB
        if (fcmError.code === "messaging/invalid-registration-token" || fcmError.code === "messaging/registration-token-not-registered") {
          await db.collection("students").updateOne(
            { _id: new ObjectId(studentId) },
            { $unset: { fcmToken: "", deviceToken: "", pushToken: "" } }
          )
        }
      }
    } else {
      console.log(`⚠️ No FCM token found for student ${studentId}. Push skipped.`)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Notifications Route Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}