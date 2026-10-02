import { NextResponse } from "next/server"
import { getDb } from "@/utils"

// ─────────────────────────────────────────────
// GET — public list of academy courses for the teacher's org
//   ?token=<publicToken>
// ─────────────────────────────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json({ error: "token required" }, { status: 400 })
    }

    const db = await getDb()
    const teacher = await db.collection("teachers").findOne({ publicToken: token })
    if (!teacher) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 })
    }
    if (teacher.status && teacher.status.toLowerCase() !== "active") {
      return NextResponse.json({ error: "Teacher is inactive" }, { status: 403 })
    }

    const courses = await db
      .collection("academy_courses")
      .find({ schoolId: teacher.schoolId })
      .sort({ category: 1, name: 1 })
      .toArray()

    return NextResponse.json({
      success: true,
      courses: courses.map((c) => ({
        _id: c._id.toString(),
        name: c.name,
        category: c.category || "Other",
      })),
    })
  } catch (err) {
    console.error("❌ GET /api/teacher-public/courses:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}