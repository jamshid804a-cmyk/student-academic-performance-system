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
      console.log("🚨 ERROR: Teacher link is invalid.")
      return NextResponse.json({ error: "Invalid link" }, { status: 404 })
    }

    const data = await req.json()
    const { studentId, message, type } = data
    
    console.log(`🚨 STEP 1: Received request from frontend.`)
    console.log(`🚨 Type: ${type} | Student ID: ${studentId}`)

    const schoolId = teacher.orgCode || teacher.schoolId

    // 1. Save the notification to the database
    await db.collection("notifications").insertOne({
      ...data,
      schoolId,
      createdAt: new Date(),
      readStatus: false,
    })
    console.log(`🚨 STEP 2: Notification saved to database.`)

    // 2. FORCE DB LOOKUP FOR TOKEN
    let fcmToken = null
    if (studentId && ObjectId.isValid(studentId)) {
      console.log(`🚨 STEP 3: Searching for student in MongoDB...`)
      const student = await db.collection("students").findOne({ 
        _id: new ObjectId(studentId) 
      })
      
      if (student) {
        fcmToken = student.fcmToken || student.deviceToken || student.pushToken
        console.log(`🚨 STEP 4: Student found. FCM Token exists? ${fcmToken ? "YES" : "NO"}`)
      } else {
        console.log(`🚨 STEP 4 ERROR: Student NOT found in MongoDB with ID: ${studentId}`)
      }
    } else {
      console.log(`🚨 STEP 3 ERROR: Invalid or missing studentId.`)
    }

    // 3. Send Push Notification
    if (fcmToken) {
      console.log(`🚨 STEP 5: Initializing Firebase...`)
      initFirebase()
      
      try {
        console.log(`🚨 STEP 6: Sending notification via Firebase...`)
        const payload = {
          token: fcmToken,
          notification: {
            title: "New Notification from School",
            body: message || "You have a new update.",
          },
          data: {
            studentId: String(studentId),
            type: String(type || "general"),
          },
        }
        await getMessaging().send(payload)
        console.log(`✅ SUCCESS: Push sent to ${studentId}`)
      } catch (fcmError) {
        console.error("🚨 FIREBASE ERROR:", fcmError.message)
      }
    } else {
      console.log(`⚠️ SKIPPED: No token found to send.`)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("🚨 SERVER CRASH:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}