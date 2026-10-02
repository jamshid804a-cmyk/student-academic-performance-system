import { NextResponse } from "next/server"
import { getDb } from "@/utils"
import { ObjectId } from "mongodb"

const OWNER_EMAIL = "jamshid804a@gmail.com"

function isOwnerEmail(email) {
  if (!email) return false
  return String(email).toLowerCase().trim() === OWNER_EMAIL.toLowerCase()
}

// ─────────────────────────────────────────────
// PATCH — approve or reject a payment (owner only)
//   Body: { email, action: "approve" | "reject", adminNote? }
// ─────────────────────────────────────────────
export async function PATCH(req, { params }) {
  try {
    const body = await req.json()
    const email = body.email
    const action = body.action
    const adminNote = body.adminNote || ""

    if (!isOwnerEmail(email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "action must be 'approve' or 'reject'" },
        { status: 400 }
      )
    }

    const db = await getDb()

    let _id
    try {
      _id = new ObjectId(params.id)
    } catch {
      return NextResponse.json({ error: "Invalid payment id" }, { status: 400 })
    }

    const payment = await db.collection("payments").findOne({ _id })
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    if (payment.status !== "pending") {
      return NextResponse.json(
        { error: `Payment is already ${payment.status}` },
        { status: 400 }
      )
    }

    const now = new Date()

    // ─── REJECT ───
    if (action === "reject") {
      await db.collection("payments").updateOne(
        { _id },
        {
          $set: {
            status: "rejected",
            reviewedAt: now,
            reviewedBy: email,
            adminNote,
          },
        }
      )
      return NextResponse.json({ success: true, action: "rejected" })
    }

    // ─── APPROVE ───
    // Extend the section by 30 days from now
    const section = payment.section // "school" | "academy"
    const extendDays = 30
    const newExpiresAt = new Date(now.getTime() + extendDays * 24 * 60 * 60 * 1000)

    // Find the org
    let orgId
    try {
      orgId = new ObjectId(payment.orgId)
    } catch {
      return NextResponse.json({ error: "Invalid orgId on payment" }, { status: 500 })
    }

    const org = await db.collection("schools").findOne({ _id: orgId })
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    // Build patch for the section
    const sectionKey = section === "school" ? "schoolSection" : "academySection"
    const patch = {
      [`${sectionKey}.active`]: true,
      [`${sectionKey}.expiresAt`]: newExpiresAt,
      updatedAt: now,
    }

    // Legacy mirror for school
    if (section === "school") {
      patch.active = true
      patch.expiresAt = newExpiresAt
    }

    // Update the org
    await db.collection("schools").updateOne({ _id: orgId }, { $set: patch })

    // Mark payment as approved
    await db.collection("payments").updateOne(
      { _id },
      {
        $set: {
          status: "approved",
          reviewedAt: now,
          reviewedBy: email,
          adminNote,
          newExpiresAt,
        },
      }
    )

    return NextResponse.json({
      success: true,
      action: "approved",
      section,
      newExpiresAt,
    })
  } catch (err) {
    console.error("❌ PATCH /api/admin/payments/[id]:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}