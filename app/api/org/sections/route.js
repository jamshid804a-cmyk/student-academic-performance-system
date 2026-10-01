import { NextResponse } from "next/server"
import { getDb } from "@/utils"
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server"

const OWNER_EMAIL = "jamshid804a@gmail.com"

// ─────────────────────────────────────────────
// GET — returns the current user's org package + section status
//   Used by the sidebar to decide which section switcher to show.
// ─────────────────────────────────────────────
export async function GET() {
  try {
    const { getUser } = getKindeServerSession()
    const user = await getUser()
    if (!user?.email) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 })
    }

    const email = String(user.email).toLowerCase().trim()

    // Owner: full access, treat as "both" so they can preview everything
    if (email === OWNER_EMAIL.toLowerCase()) {
      return NextResponse.json({
        success: true,
        isOwner: true,
        package: "both",
        schoolSection: { active: true, expiresAt: null },
        academySection: { active: true, expiresAt: null },
      })
    }

    const db = await getDb()
    const org = await db.collection("schools").findOne({ email })
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 })
    }

    const pkg = org.package || "school"
    const schoolSection = org.schoolSection || {
      active: org.active !== false,
      expiresAt: org.expiresAt || null,
    }
    const academySection = org.academySection || {
      active: false,
      expiresAt: null,
    }

    // Auto-expire if expiresAt has passed
    const now = Date.now()
    const schoolActive =
      schoolSection.active === true &&
      (!schoolSection.expiresAt || new Date(schoolSection.expiresAt).getTime() > now)
    const academyActive =
      academySection.active === true &&
      (!academySection.expiresAt || new Date(academySection.expiresAt).getTime() > now)

    return NextResponse.json({
      success: true,
      isOwner: false,
      package: pkg,
      schoolSection: {
        active: schoolActive,
        expiresAt: schoolSection.expiresAt || null,
      },
      academySection: {
        active: academyActive,
        expiresAt: academySection.expiresAt || null,
      },
    })
  } catch (err) {
    console.error("❌ GET /api/org/sections:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}