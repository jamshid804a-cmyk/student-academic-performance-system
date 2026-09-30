import { NextResponse } from "next/server"
import { getDb } from "@/utils"
import { getCurrentSchool } from "@/utils/getCurrentSchool"

const OWNER_EMAIL = "jamshid804a@gmail.com"

async function resolveSchoolId() {
  const result = await getCurrentSchool()

  if (result.success && result.school?.schoolId) {
    return result.school.schoolId
  }

  if (result.email && result.email.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
    return "owner_school"
  }

  return null
}

const DEFAULTS = {
  name: "SAPSYSYSTEM",
  address: "",
  principal: "",
  email: "",
  contact: "",
  logo: "",
}

export async function GET() {
  try {
    const schoolId = await resolveSchoolId()
    if (!schoolId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getDb()
    const info = await db.collection("school_info").findOne({ schoolId })

    if (!info) {
      return NextResponse.json({ ...DEFAULTS, schoolId })
    }

    return NextResponse.json({
      schoolId,
      name: info.name || DEFAULTS.name,
      address: info.address || "",
      principal: info.principal || "",
      email: info.email || "",
      contact: info.contact || "",
      logo: info.logo || "",
    })
  } catch (err) {
    console.error("GET /api/school error:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const schoolId = await resolveSchoolId()
    if (!schoolId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await req.json()
    const db = await getDb()

    await db.collection("school_info").updateOne(
      { schoolId },
      {
        $set: {
          schoolId,
          name: data.name || "",
          address: data.address || "",
          principal: data.principal || "",
          email: data.email || "",
          contact: data.contact || "",
          logo: data.logo || "",
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("POST /api/school error:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
