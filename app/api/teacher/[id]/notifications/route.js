import { NextResponse } from "next/server"
import { getDb } from "@/utils"
import { ObjectId } from "mongodb"
// ✅ Correct modular imports for firebase-admin
import { getApps, initializeApp, cert } from "firebase-admin/app"
import { getMessaging } from "firebase-admin/messaging"

// ✅ Initialize Firebase lazily so it doesn't crash the Vercel build
function initFirebase() {
  if (getApps().length === 0) {
    try {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Replace \n with actual newlines for Vercel
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

    // 2. Safely find the student to get their FCM (Push) token
    let fcmToken = null
    let actualStudentId = studentId

    if (studentId) {
      let query = {}
      
      // Check if the ID is a valid MongoDB ObjectId
      if (ObjectId.isValid(studentId)) {
        query = { _id: new ObjectId(studentId) }
      } else {
        // Fallback: if Attendance sends a custom ID, check common ID fields
        query = { $or: [{ id: String(studentId) }, { studentId: String(studentId) }] }
      }

      const student = await db.collection("students").findOne(query)
      
      if (student) {
        fcmToken = student?.fcmToken || student?.deviceToken || student?.pushToken
        actualStudentId = student._id.toString() 
      }
    }

    // 3. Send Push Notification via Firebase
    if (fcmToken) {
      initFirebase() // Initialize Firebase only when we actually need to send
      
      try {
        const payload = {
          token: fcmToken,
          notification: {
            title: "New Notification from School",
            body: message || "You have a new update.",
          },
          data: {
            studentId: String(actualStudentId),
            type: String(type || "general"),
            click_action: "FLUTTER_NOTIFICATION_CLICK",
          },
        }

        await getMessaging().send(payload)
        console.log(`✅ Push sent to ${actualStudentId}`)
      } catch (fcmError) {
        console.error("❌ Firebase Send Error:", fcmError.message)
        
        // Clean up invalid tokens automatically
        if (fcmError.code === "messaging/invalid-registration-token" || fcmError.code === "messaging/registration-token-not-registered") {
          await db.collection("students").updateOne(
            { _id: new ObjectId(actualStudentId) },
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