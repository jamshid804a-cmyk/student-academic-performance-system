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
// GET — one-time migration: tag everything with program: "school"
//   and set package: "school" on every organization.
//
//   ⚠️ Run this ONCE. Then delete the file.
//
//   Usage: GET /api/admin/migrate-program
// ─────────────────────────────────────────────
export async function GET() {
  try {
    if (!(await isOwner())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getDb()

    const dataCollections = [
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

    // ─── Tag every data record with program: "school" ───
    for (const name of dataCollections) {
      try {
        const col = db.collection(name)
        const total = await col.countDocuments({})
        const needsTag = await col.countDocuments({
          $or: [
            { program: { $exists: false } },
            { program: null },
            { program: "" },
          ],
        })

        if (needsTag > 0) {
          await col.updateMany(
            {
              $or: [
                { program: { $exists: false } },
                { program: null },
                { program: "" },
              ],
            },
            { $set: { program: "school" } }
          )
        }

        report[name] = { total, tagged: needsTag }
      } catch (e) {
        report[name] = { error: e.message }
      }
    }

    // ─── Set package: "school" on every organization ───
    try {
      const schoolsCol = db.collection("schools")
      const totalSchools = await schoolsCol.countDocuments({})
      const needsPkg = await schoolsCol.countDocuments({
        $or: [
          { package: { $exists: false } },
          { package: null },
          { package: "" },
        ],
      })

      if (needsPkg > 0) {
        await schoolsCol.updateMany(
          {
            $or: [
              { package: { $exists: false } },
              { package: null },
              { package: "" },
            ],
          },
          {
            $set: {
              package: "school",
              // Also add empty academySection placeholder so we know the shape
              academySection: {
                active: false,
                expiresAt: null,
                price: 0,
                priceNote: "",
              },
            },
          }
        )
      }

      report.schools = { total: totalSchools, tagged: needsPkg }
    } catch (e) {
      report.schools = { error: e.message }
    }

    return NextResponse.json({
      success: true,
      message: "Migration complete. Now DELETE this file.",
      report,
    })
  } catch (err) {
    console.error("❌ Migration error:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}