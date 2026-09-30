import { NextResponse } from "next/server"
import { getDb } from "@/utils"

export async function GET(req) {
  const noCacheHeaders = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
  }

  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ success: false }, { status: 400, headers: noCacheHeaders })
    }

    const db = await getDb()
    const school = await db
      .collection("schools")
      .findOne({ email: String(email).toLowerCase().trim() })

    if (!school) {
      return NextResponse.json({ success: false }, { headers: noCacheHeaders })
    }

    return NextResponse.json(
      {
        success: true,
        school: {
          schoolId: school.schoolId,
          schoolName: school.schoolName,
          email: school.email,
          active: school.active !== false,
          expiresAt: school.expiresAt,
        },
      },
      { headers: noCacheHeaders }
    )
  } catch (err) {
    console.error("GET /api/auth/check-school error:", err.message)
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500, headers: noCacheHeaders }
    )
  }
}