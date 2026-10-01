import { NextResponse } from "next/server"
import { getDb } from "@/utils"
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server"

const OWNER_EMAIL = "jamshid804a@gmail.com"

// ─────────────────────────────────────────────
// GET — returns the current user's org package + section status
//   Used by the sidebar, no-section page, and pay page.
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
        schoolName: "SAPSYSYSTEM",
        schoolSection: { active: true, expiresAt: null, price: 0, priceNote: "" },
        academySection: { active: true, expiresAt: null, price: 0, priceNote: "" },
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
      price: 0,
      priceNote: "",
    }
    const academySection = org.academySection || {
      active: false,
      expiresAt: null,
      price: 0,
      priceNote: "",
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
      schoolName: org.schoolName || "Organization",
      schoolSection: {
        active: schoolActive,
        expiresAt: schoolSection.expiresAt || null,
        price: Number(schoolSection.price) || 0,
        priceNote: schoolSection.priceNote || "",
      },
      academySection: {
        active: academyActive,
        expiresAt: academySection.expiresAt || null,
        price: Number(academySection.price) || 0,
        priceNote: academySection.priceNote || "",
      },
    })
  } catch (err) {
    console.error("❌ GET /api/org/sections:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}