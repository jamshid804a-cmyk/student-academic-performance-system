import { NextResponse } from "next/server"
import { getDb } from "@/utils"
import { ObjectId } from "mongodb"

// ─────────────────────────────────────────────
// Default courses seeded for every academy org
// ─────────────────────────────────────────────
const DEFAULT_COURSES = [
  { name: "English Grammar Level 1", category: "Language" },
  { name: "English Grammar Level 2", category: "Language" },
  { name: "English Grammar Level 3", category: "Language" },
  { name: "English Grammar Level 4", category: "Language" },
  { name: "English Conversation - Beginner", category: "Language" },
  { name: "English Conversation - Intermediate", category: "Language" },
  { name: "English Conversation - Advanced", category: "Language" },
  { name: "DIT", category: "Computer" },
  { name: "CIT", category: "Computer" },
  { name: "MS Office", category: "Computer" },
  { name: "Graphic Design", category: "Computer" },
  { name: "Web Development", category: "Computer" },
  { name: "App Development", category: "Computer" },
  { name: "Video Editing", category: "Computer" },
  { name: "Digital Marketing", category: "Computer" },
  { name: "Short Hand", category: "Other" },
]

// ─────────────────────────────────────────────
// Ensure the org has courses seeded; if not, seed defaults.
// Returns the full list of courses for the org.
// ─────────────────────────────────────────────
async function ensureAndGetCourses(db, org) {
  const orgId = org._id.toString()
  const col = db.collection("academy_courses")

  const existingCount = await col.countDocuments({ orgId })

  if (existingCount === 0) {
    const now = new Date()
    const docs = DEFAULT_COURSES.map((c) => ({
      orgId,
      schoolId: org.schoolId,
      program: "academy",
      name: c.name,
      category: c.category || "Other",
      isDefault: true,
      createdAt: now,
    }))
    try {
      await col.insertMany(docs)
    } catch (e) {
      console.error("Failed to seed default courses:", e.message)
    }
  }

  const courses = await col
    .find({ orgId })
    .sort({ category: 1, name: 1 })
    .toArray()

  return courses.map((c) => ({
    _id: c._id.toString(),
    name: c.name,
    category: c.category || "Other",
    isDefault: Boolean(c.isDefault),
    createdAt: c.createdAt,
  }))
}

// ─────────────────────────────────────────────
// GET — list courses for the org (auto-seeds defaults on first call)
//   ?email=user@example.com  (required)
// ─────────────────────────────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ error: "email required" }, { status: 400 })
    }

    const db = await getDb()
    const org = await db
      .collection("schools")
      .findOne({ email: String(email).toLowerCase().trim() })

    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 })
    }

    // Only academy orgs (or both)
    const pkg = org.package || "school"
    if (pkg !== "academy" && pkg !== "both") {
      return NextResponse.json(
        { error: "Academy section not available for this organization" },
        { status: 400 }
      )
    }

    const courses = await ensureAndGetCourses(db, org)

    return NextResponse.json({ success: true, courses })
  } catch (err) {
    console.error("❌ GET /api/academy/courses:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// POST — add a custom course
//   Body: { email, name, category? }
// ─────────────────────────────────────────────
export async function POST(req) {
  try {
    const body = await req.json()
    const email = body.email
    const name = String(body.name || "").trim()
    const category = String(body.category || "Custom").trim() || "Custom"

    if (!email) {
      return NextResponse.json({ error: "email required" }, { status: 400 })
    }
    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: "Course name must be at least 2 characters" },
        { status: 400 }
      )
    }

    const db = await getDb()
    const org = await db
      .collection("schools")
      .findOne({ email: String(email).toLowerCase().trim() })

    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 })
    }

    const pkg = org.package || "school"
    if (pkg !== "academy" && pkg !== "both") {
      return NextResponse.json(
        { error: "Academy section not available for this organization" },
        { status: 400 }
      )
    }

    const orgId = org._id.toString()
    const col = db.collection("academy_courses")

    // Prevent duplicate names in the same org
    const existing = await col.findOne({
      orgId,
      name: { $regex: `^${name}$`, $options: "i" },
    })
    if (existing) {
      return NextResponse.json(
        { error: "A course with this name already exists" },
        { status: 400 }
      )
    }

    const doc = {
      orgId,
      schoolId: org.schoolId,
      program: "academy",
      name,
      category,
      isDefault: false,
      createdAt: new Date(),
    }

    const result = await col.insertOne(doc)

    return NextResponse.json({
      success: true,
      course: {
        _id: result.insertedId.toString(),
        name,
        category,
        isDefault: false,
        createdAt: doc.createdAt,
      },
    })
  } catch (err) {
    console.error("❌ POST /api/academy/courses:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// DELETE — remove a course
//   ?id=xxx&email=user@example.com
// ─────────────────────────────────────────────
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    const email = searchParams.get("email")

    if (!id || !email) {
      return NextResponse.json(
        { error: "id and email required" },
        { status: 400 }
      )
    }

    const db = await getDb()
    const org = await db
      .collection("schools")
      .findOne({ email: String(email).toLowerCase().trim() })

    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 })
    }

    let _id
    try {
      _id = new ObjectId(id)
    } catch {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 })
    }

    const orgId = org._id.toString()
    const result = await db
      .collection("academy_courses")
      .deleteOne({ _id, orgId })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("❌ DELETE /api/academy/courses:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}