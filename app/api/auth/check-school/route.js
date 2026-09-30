import { NextResponse } from "next/server"
import { getDb } from "@/utils"

// ─────────────────────────────────────────────
// GET — check if a school exists and is active
// Called from middleware.ts: /api/auth/check-school?email=...
// ─────────────────────────────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ success: false }, { status: 400 })
    }

    const db = await getDb()
    const school = await db
      .collection("schools")
      .findOne({ email: String(email).toLowerCase().trim() })

    if (!school) {
      return NextResponse.json({ success: false })
    }

    return NextResponse.json({
      success: true,
      school: {
        schoolId: school.schoolId,
        schoolName: school.schoolName,
        email: school.email,
        active: school.active !== false,   // treat missing as active
        expiresAt: school.expiresAt,
      },
    })
  } catch (err) {
    console.error("❌ GET /api/auth/check-school:", err.message)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}