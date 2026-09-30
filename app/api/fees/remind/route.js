import { NextResponse } from "next/server"
import { getDb } from "@/utils"
import { getCurrentSchool } from "@/utils/getCurrentSchool"

// ─────────────────────────────────────────────
// POST — send a fee reminder to parents
//   Body: { studentIds: [1, 2, 3], month: "MM/YYYY", grade }
// ─────────────────────────────────────────────
export async function POST(req) {
  try {
    const schoolResult = await getCurrentSchool()
    if (!schoolResult.success) {
      return NextResponse.json({ error: schoolResult.error }, { status: 401 })
    }
    const { schoolId } = schoolResult.school

    const body = await req.json()
    const { studentIds, month, grade } = body

    if (!Array.isArray(studentIds) || studentIds.length === 0 || !month) {
      return NextResponse.json(
        { error: "studentIds and month are required" },
        { status: 400 }
      )
    }

    const db = await getDb()
    const notifications = db.collection("notifications")

    // Fetch students in one query (school-scoped)
    const students = await db
      .collection("students")
      .find({ schoolId, id: { $in: studentIds.map((n) => Number(n)) } })
      .toArray()

    const monthLabel = month.split("/")[0]
    const monthNames = {
      "01": "January", "02": "February", "03": "March", "04": "April",
      "05": "May", "06": "June", "07": "July", "08": "August",
      "09": "September", "10": "October", "11": "November", "12": "December",
    }
    const readableMonth = monthNames[monthLabel] || month

    let sentCount = 0

    for (const s of students) {
      const message = `Dear Parent, this is a friendly reminder that the school fee for ${readableMonth} is still pending. Kindly visit the school to clear the outstanding balance. Thank you.`

      await notifications.insertOne({
        schoolId,
        studentId: String(s.id),
        message,
        readStatus: false,
        blockNumber: 0,
        weekStart: 0,
        weekEnd: 0,
        type: "fee",
        createdAt: new Date(),
      })
      sentCount++
    }

    return NextResponse.json({ success: true, sentCount })
  } catch (err) {
    console.error("❌ POST /api/fees/remind:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}