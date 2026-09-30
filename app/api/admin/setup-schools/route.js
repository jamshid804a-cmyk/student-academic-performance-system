import { NextResponse } from "next/server"
import { getDb } from "@/utils"

// ⚠️ ONE-TIME SETUP ROUTE
// This creates the schools collection and tags existing records.
// Call this ONCE: GET /api/admin/setup-schools
// Then DELETE this file.

export async function GET(req) {
  try {
    const db = await getDb()

    // ─── 1. Create the first school ───
    const schools = db.collection("schools")

    let school = await schools.findOne({ schoolId: "test_school" })
    if (!school) {
      await schools.insertOne({
        schoolId: "test_school",
        email: "jamshid804a@gmail.com",
        schoolName: "Test School",
        ownerName: "Jamshid",
        active: true,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        note: "Initial test school — created during setup",
      })
      console.log("✅ Created school: test_school")
    }

    // ─── 2. Tag existing records with schoolId ───
    const collections = [
      "students",
      "attendance",
      "tests",
      "exams",
      "fees",
      "notifications",
      "teachers",
      "teacher_attendance",
    ]

    const report = {}

    for (const name of collections) {
      try {
        const col = db.collection(name)
        const total = await col.countDocuments({})
        const needsTag = await col.countDocuments({
          $or: [
            { schoolId: { $exists: false } },
            { schoolId: null },
            { schoolId: "" },
          ],
        })

        if (needsTag > 0) {
          await col.updateMany(
            {
              $or: [
                { schoolId: { $exists: false } },
                { schoolId: null },
                { schoolId: "" },
              ],
            },
            { $set: { schoolId: "test_school" } }
          )
        }

        report[name] = { total, tagged: needsTag }
      } catch (e) {
        report[name] = { error: e.message }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Setup complete. Now DELETE this file.",
      schoolId: "test_school",
      schoolEmail: "jamshid804a@gmail.com",
      collections: report,
    })
  } catch (err) {
    console.error("❌ Setup error:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}