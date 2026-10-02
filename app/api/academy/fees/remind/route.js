import { NextResponse } from "next/server"
import { getDb } from "@/utils"

// ─────────────────────────────────────────────
// POST — send fee reminder to parents (academy)
//   Body: { orgEmail, studentIds: [1,2,3], month: "MM/YYYY", course }
// ─────────────────────────────────────────────
export async function POST(req) {
  try {
    const body = await req.json()
    const { orgEmail, studentIds, month, course } = body

    if (!orgEmail) {
      return NextResponse.json({ error: "orgEmail required" }, { status: 400 })
    }
    if (!Array.isArray(studentIds) || studentIds.length === 0 || !month) {
      return NextResponse.json(
        { error: "studentIds and month are required" },
        { status: 400 }
      )
    }

    const db = await getDb()
    const org = await db
      .collection("schools")
      .findOne({ email: String(orgEmail).toLowerCase().trim() })
    if (!org) return NextResponse.json({ error: "No organization" }, { status: 404 })

    const pkg = org.package || "school"
    if (pkg !== "academy" && pkg !== "both") {
      return NextResponse.json(
        { error: "Academy section not available" },
        { status: 400 }
      )
    }

    const notifications = db.collection("notifications")

    // Fetch academy students matching the ids
    const students = await db
      .collection("students")
      .find({
        schoolId: org.schoolId,
        program: "academy",
        id: { $in: studentIds.map((n) => Number(n)) },
      })
      .toArray()

    const monthLabel = String(month).split("/")[0]
    const monthNames = {
      "01": "January", "02": "February", "03": "March", "04": "April",
      "05": "May", "06": "June", "07": "July", "08": "August",
      "09": "September", "10": "October", "11": "November", "12": "December",
    }
    const readableMonth = monthNames[monthLabel] || month

    let sentCount = 0

    for (const s of students) {
      const message = `Dear Parent, this is a friendly reminder that the academy fee for ${readableMonth} is still pending. Kindly visit the academy to clear the outstanding balance. Thank you.`

      await notifications.insertOne({
        schoolId: org.schoolId,
        studentId: String(s.id),
        message,
        readStatus: false,
        blockNumber: 0,
        weekStart: 0,
        weekEnd: 0,
        type: "fee",
        program: "academy",
        createdAt: new Date(),
      })
      sentCount++
    }

    return NextResponse.json({ success: true, sentCount })
  } catch (err) {
    console.error("❌ POST /api/academy/fees/remind:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}