import { NextResponse } from "next/server"
import { getDb } from "@/utils"
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server"

const OWNER_EMAIL = "jamshid804a@gmail.com"

async function isOwner() {
  try {
    const { getUser } = getKindeServerSession()
    const user = await getUser()
    if (!user?.email) return false
    return String(user.email).toLowerCase().trim() === OWNER_EMAIL.toLowerCase()
  } catch {
    return false
  }
}

// ─────────────────────────────────────────────
// GET — list all organizations
//   ?package=school | academy | both   (optional filter)
// ─────────────────────────────────────────────
export async function GET(req) {
  try {
    if (!(await isOwner())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const pkg = searchParams.get("package")

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
          db.collection("students").countDocuments({ schoolId: s.schoolId }),
          db.collection("teachers").countDocuments({ schoolId: s.schoolId }),
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
          // New shape: each section has active + expiresAt + price + note
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
          // Legacy fields kept for compatibility
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
// POST — create a new organization
//   Body: { schoolName, email, ownerName, note, package }
//     package: "school" | "academy" | "both"
// ─────────────────────────────────────────────
export async function POST(req) {
  try {
    if (!(await isOwner())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await req.json()
    const { schoolName, email, ownerName, note, package: pkg } = data

    if (!schoolName || !email) {
      return NextResponse.json(
        { error: "schoolName and email are required" },
        { status: 400 }
      )
    }

    const validPackages = ["school", "academy", "both"]
    const chosenPackage = validPackages.includes(pkg) ? pkg : "school"

    const normalizedEmail = String(email).toLowerCase().trim()

    const db = await getDb()
    const collection = db.collection("schools")

    const existing = await collection.findOne({ email: normalizedEmail })
    if (existing) {
      return NextResponse.json(
        { error: "An organization with this email already exists" },
        { status: 400 }
      )
    }

    // Generate a unique schoolId from the name
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
    const exp = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days

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
        price: 0,          // you set it later per academy
        priceNote: "",
      },

      // Legacy fields — mirror school section
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