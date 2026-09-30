import { NextResponse } from "next/server"
import { getDb } from "@/utils"
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server"

const OWNER_EMAIL = "jamshid804a@gmail.com"

// ─────────────────────────────────────────────
// Helper: is the requester the owner?
// ─────────────────────────────────────────────
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
// GET — list all schools (with live user counts)
// ─────────────────────────────────────────────
export async function GET() {
  try {
    if (!(await isOwner())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getDb()
    const schools = await db
      .collection("schools")
      .find({})
      .sort({ createdAt: -1 })
      .toArray()

    // Get counts for each school in parallel
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
          active: s.active !== false,
          createdAt: s.createdAt,
          expiresAt: s.expiresAt,
          note: s.note || "",
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
// POST — create a new school
//   Body: { schoolName, email, ownerName, note, expiresAt? }
// ─────────────────────────────────────────────
export async function POST(req) {
  try {
    if (!(await isOwner())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await req.json()
    const { schoolName, email, ownerName, note, expiresAt } = data

    if (!schoolName || !email) {
      return NextResponse.json(
        { error: "schoolName and email are required" },
        { status: 400 }
      )
    }

    const normalizedEmail = String(email).toLowerCase().trim()

    const db = await getDb()
    const collection = db.collection("schools")

    // Duplicate check
    const existing = await collection.findOne({ email: normalizedEmail })
    if (existing) {
      return NextResponse.json(
        { error: "A school with this email already exists" },
        { status: 400 }
      )
    }

    // Generate a unique schoolId from the name
    const base = String(schoolName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 30) || "school"

    let schoolId = base
    let suffix = 1
    while (await collection.findOne({ schoolId })) {
      schoolId = `${base}_${suffix}`
      suffix++
    }

    const now = new Date()
    const exp = expiresAt ? new Date(expiresAt) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days default

    const doc = {
      schoolId,
      schoolName: String(schoolName).trim(),
      email: normalizedEmail,
      ownerName: ownerName ? String(ownerName).trim() : "",
      note: note ? String(note).trim() : "",
      active: true,
      createdAt: now,
      expiresAt: exp,
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