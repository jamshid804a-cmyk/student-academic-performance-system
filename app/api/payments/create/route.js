import { NextResponse } from "next/server"
import { getDb } from "@/utils"
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server"

const OWNER_EMAIL = "jamshid804a@gmail.com"

// ─────────────────────────────────────────────
// POST — user submits a payment (TID + amount)
//   Body: { section: "school" | "academy", amount, tid, note?, senderName?, senderPhone? }
//
//   Creates a document in `payments` with status: "pending".
//   Owner later approves → section reactivated for 30 days.
// ─────────────────────────────────────────────
export async function POST(req) {
  try {
    const { getUser } = getKindeServerSession()
    const user = await getUser()
    if (!user?.email) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 })
    }

    const email = String(user.email).toLowerCase().trim()

    const body = await req.json()
    const section = String(body.section || "").trim()
    const amount = Number(body.amount) || 0
    const tid = String(body.tid || "").trim()
    const note = String(body.note || "").trim()
    const senderName = String(body.senderName || "").trim()
    const senderPhone = String(body.senderPhone || "").trim()

    if (!["school", "academy"].includes(section)) {
      return NextResponse.json({ error: "Invalid section" }, { status: 400 })
    }
    if (!tid || tid.length < 4) {
      return NextResponse.json(
        { error: "Transaction ID (TID) is required" },
        { status: 400 }
      )
    }
    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 }
      )
    }

    const db = await getDb()

    // Owner can't submit payments — they ARE the recipient
    if (email === OWNER_EMAIL.toLowerCase()) {
      return NextResponse.json(
        { error: "Owner cannot submit payments" },
        { status: 400 }
      )
    }

    // Look up the org for this user
    const org = await db.collection("schools").findOne({ email })
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 })
    }

    // Prevent duplicate pending payments for the same org + section
    const existingPending = await db.collection("payments").findOne({
      orgId: org._id.toString(),
      section,
      status: "pending",
    })
    if (existingPending) {
      return NextResponse.json(
        {
          error:
            "You already have a pending payment for this section. Wait for admin to verify.",
        },
        { status: 400 }
      )
    }

    const now = new Date()
    const doc = {
      orgId: org._id.toString(),
      schoolId: org.schoolId,
      schoolName: org.schoolName,
      email,
      section,              // "school" | "academy"
      amount,               // what they claim to have paid
      tid,                  // transaction ID from EasyPaisa/JazzCash
      note,
      senderName,
      senderPhone,
      status: "pending",    // "pending" | "approved" | "rejected"
      submittedAt: now,
      reviewedAt: null,
      reviewedBy: null,
      adminNote: "",
    }

    const result = await db.collection("payments").insertOne(doc)

    return NextResponse.json({
      success: true,
      paymentId: result.insertedId.toString(),
      message: "Payment submitted. Admin will verify shortly.",
    })
  } catch (err) {
    console.error("❌ POST /api/payments/create:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}