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

    // ─── Determine section status ───
    const now = Date.now()

    const schoolSection = school.schoolSection || {
      active: school.active !== false,
      expiresAt: school.expiresAt || null,
    }
    const academySection = school.academySection || {
      active: false,
      expiresAt: null,
    }

    const schoolActive =
      schoolSection.active === true &&
      (!schoolSection.expiresAt || new Date(schoolSection.expiresAt).getTime() > now)
    const academyActive =
      academySection.active === true &&
      (!academySection.expiresAt || new Date(academySection.expiresAt).getTime() > now)

    const pkg = school.package || "school"

    // Is ANY section usable?
    const anyActive = schoolActive || academyActive

    // Legacy: `active` reflects whether the user can access anything at all
    // (used by middleware — if false, user is blocked from /dashboard)
    return NextResponse.json(
      {
        success: true,
        school: {
          schoolId: school.schoolId,
          schoolName: school.schoolName,
          email: school.email,
          package: pkg,

          // Legacy fields (kept for backward compat)
          active: anyActive,
          expiresAt: school.expiresAt,

          // New fields
          schoolActive,
          academyActive,
          schoolExpiresAt: schoolSection.expiresAt || null,
          academyExpiresAt: academySection.expiresAt || null,
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