import { NextResponse } from "next/server"
import { getDb } from "@/utils"

export async function POST(req, { params }) {
  try {
    const { id } = params
    const db = await getDb()

    const teacher = await db.collection("teachers").findOne({ publicToken: id })
    if (!teacher) return NextResponse.json({ error: "Invalid link" }, { status: 404 })

    const data = await req.json()
    const schoolId = teacher.schoolId

    await db.collection("notifications").insertOne({
      ...data,
      schoolId,
      createdAt: new Date(),
      readStatus: false,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("notifications route:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}