import { NextResponse } from "next/server"
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server"
import { getDb } from "@/utils"

export async function GET(req) {
  const noCacheHeaders = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  }

  try {
    // Who is asking?
    // 1) Middleware calls this with a secret header + the email it already verified.
    // 2) Anyone else (browser) can only see THEIR OWN school, from the Kinde session.
    const { searchParams } = new URL(req.url)
    const secret = process.env.INTERNAL_API_SECRET
    const fromMiddleware =
      secret && req.headers.get("x-internal-secret") === secret

    let email = null
    if (fromMiddleware) {
      email = searchParams.get("email")
    } else {
      const { getUser } = getKindeServerSession()
      const user = await getUser()
      email = user?.email || null
    }

    if (!email) {
      return NextResponse.json(
        { success: false },
        { status: 401, headers: noCacheHeaders }
      )
    }

    const db = await getDb()
    const school = await db
      .collection("schools")
      .findOne({ email: String(email).toLowerCase().trim() })

    if (!school) {
      return NextResponse.json({ success: false }, { headers: noCacheHeaders })
    }

    // Section status
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
      (!schoolSection.expiresAt ||
        new Date(schoolSection.expiresAt).getTime() > now)
    const academyActive =
      academySection.active === true &&
      (!academySection.expiresAt ||
        new Date(academySection.expiresAt).getTime() > now)

    const pkg = school.package || "school"

    return NextResponse.json(
      {
        success: true,
        school: {
          schoolId: school.schoolId,
          schoolName: school.schoolName,
          email: school.email,
          package: pkg,

          // Legacy
          active: schoolActive || academyActive,
          expiresAt: school.expiresAt,

          // Per-section
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