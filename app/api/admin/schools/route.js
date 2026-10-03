import { NextResponse } from "next/server"
import { getDb } from "@/utils"

const OWNER_EMAIL = "jamshid804a@gmail.com"

function isOwnerEmail(email) {
  if (!email) return false
  return String(email).toLowerCase().trim() === OWNER_EMAIL.toLowerCase()
}

// ─────────────────────────────────────────────
// GET — list all organizations
//   ?email=jamshid804a@gmail.com   (required — owner only)
//   ?package=school|academy|both   (optional)
// ─────────────────────────────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get("email")
    const pkg = searchParams.get("package")

    if (!isOwnerEmail(email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getDb()
    const filter = {}
    if (pkg === "school" || pkg === "academy" || pkg === "both") {
      filter.package = pkg
    }

    const schools = await db
      .collection("schools")
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray()

    const withCounts = await Promise.all(
      schools.map(async (s) => {
        const [students, teachers, notifications] = await Promise.all([
          db.collection("students").countDocuments({ schoolId: s.schoolId, program: { $ne: "academy" } }),
          db.collection("teachers").countDocuments({ schoolId: s.schoolId, program: { $ne: "academy" } }),
          db.collection("notifications").countDocuments({ schoolId: s.schoolId }),
        ])
        return {
          _id: s._id.toString(),
          schoolId: s.schoolId,
          schoolName: s.schoolName,
          email: s.email,
          ownerName: s.ownerName || "",
          note: s.note || "",
          package: s.package || "school",
          schoolSection: s.schoolSection || {
            active: s.active !== false,
            expiresAt: s.expiresAt,
            price: 0,
            priceNote: "",
          },
          academySection: s.academySection || {
            active: false,
            expiresAt: null,
            price: 0,
            priceNote: "",
          },
          active: s.active !== false,
          createdAt: s.createdAt,
          expiresAt: s.expiresAt,
          counts: { students, teachers, notifications },
        }
      })
    )

    return NextResponse.json({ success: true, schools: withCounts })
  } catch (err) {
    console.error("❌ GET /api/admin/schools:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// POST — create org
//   Body: { email (owner), schoolName, email(newOrg), ownerName, note, package }
// ─────────────────────────────────────────────
export async function POST(req) {
  try {
    const data = await req.json()
    const ownerEmail = data.ownerEmail
    const schoolName = data.schoolName
    const newOrgEmail = data.email
    const ownerName = data.ownerName
    const note = data.note
    const pkg = data.package

    if (!isOwnerEmail(ownerEmail)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!schoolName || !newOrgEmail) {
      return NextResponse.json(
        { error: "schoolName and email are required" },
        { status: 400 }
      )
    }

    const validPackages = ["school", "academy", "both"]
    const chosenPackage = validPackages.includes(pkg) ? pkg : "school"

    const normalizedEmail = String(newOrgEmail).toLowerCase().trim()

    const db = await getDb()
    const collection = db.collection("schools")

    const existing = await collection.findOne({ email: normalizedEmail })
    if (existing) {
      return NextResponse.json(
        { error: "An organization with this email already exists" },
        { status: 400 }
      )
    }

    const base = String(schoolName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 30) || "org"

    let schoolId = base
    let suffix = 1
    while (await collection.findOne({ schoolId })) {
      schoolId = `${base}_${suffix}`
      suffix++
    }

    const now = new Date()
    const exp = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const schoolActive = chosenPackage === "school" || chosenPackage === "both"
    const academyActive = chosenPackage === "academy" || chosenPackage === "both"

    const doc = {
      schoolId,
      schoolName: String(schoolName).trim(),
      email: normalizedEmail,
      ownerName: ownerName ? String(ownerName).trim() : "",
      note: note ? String(note).trim() : "",
      package: chosenPackage,
      schoolSection: {
        active: schoolActive,
        expiresAt: schoolActive ? exp : null,
        price: 0,
        priceNote: "",
      },
      academySection: {
        active: academyActive,
        expiresAt: academyActive ? exp : null,
        price: 0,
        priceNote: "",
      },
      active: schoolActive,
      expiresAt: schoolActive ? exp : null,
      createdAt: now,
      updatedAt: now,
    }

    const result = await collection.insertOne(doc)

    return NextResponse.json({
      success: true,
      id: result.insertedId.toString(),
      schoolId,
    })
  } catch (err) {
    console.error("❌ POST /api/admin/schools:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}