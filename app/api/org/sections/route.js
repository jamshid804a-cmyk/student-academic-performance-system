import { NextResponse } from "next/server"
import { getDb } from "@/utils"
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server"

const OWNER_EMAIL = "jamshid804a@gmail.com"

// ─────────────────────────────────────────────
// GET — returns the current user's org package + section status
//   Used by: sidebar, layout redirect, no-section page, pay page.
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
        schoolSection: {
          active: true,
          expired: false,
          needsPayment: false,
          expiresAt: null,
          price: 0,
          priceNote: "",
        },
        academySection: {
          active: true,
          expired: false,
          needsPayment: false,
          expiresAt: null,
          price: 0,
          priceNote: "",
        },
      })
    }

    const db = await getDb()
    const org = await db.collection("schools").findOne({ email })
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 })
    }

    const pkg = org.package || "school"
    const now = Date.now()

    // ─── SCHOOL section ───
    const rawSchool = org.schoolSection || {
      active: org.active !== false,
      expiresAt: org.expiresAt || null,
      price: 0,
      priceNote: "",
    }
    const schoolExpired =
      rawSchool.expiresAt && new Date(rawSchool.expiresAt).getTime() <= now
    const schoolActive =
      rawSchool.active === true && !schoolExpired

    // ─── ACADEMY section ───
    const rawAcademy = org.academySection || {
      active: false,
      expiresAt: null,
      price: 0,
      priceNote: "",
    }
    const academyExpired =
      rawAcademy.expiresAt && new Date(rawAcademy.expiresAt).getTime() <= now
    const academyActive =
      rawAcademy.active === true && !academyExpired

    // ─── needsPayment logic ───
    // School: admin handles manually → never routes to pay page
    const schoolNeedsPayment = false

    // Academy: if not active (expired, suspended, or never activated)
    const academyNeedsPayment = !academyActive

    return NextResponse.json({
      success: true,
      isOwner: false,
      package: pkg,
      schoolName: org.schoolName || "Organization",
      schoolSection: {
        active: schoolActive,
        expired: Boolean(schoolExpired),
        needsPayment: schoolNeedsPayment,
        expiresAt: rawSchool.expiresAt || null,
        price: Number(rawSchool.price) || 0,
        priceNote: rawSchool.priceNote || "",
      },
      academySection: {
        active: academyActive,
        expired: Boolean(academyExpired),
        needsPayment: academyNeedsPayment,
        expiresAt: rawAcademy.expiresAt || null,
        price: Number(rawAcademy.price) || 0,
        priceNote: rawAcademy.priceNote || "",
      },
    })
  } catch (err) {
    console.error("❌ GET /api/org/sections:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}