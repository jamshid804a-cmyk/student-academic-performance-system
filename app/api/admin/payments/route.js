import { NextResponse } from "next/server"
import { getDb } from "@/utils"

const OWNER_EMAIL = "jamshid804a@gmail.com"

function isOwnerEmail(email) {
  if (!email) return false
  return String(email).toLowerCase().trim() === OWNER_EMAIL.toLowerCase()
}

// ─────────────────────────────────────────────
// GET — list all payments (owner only)
//   ?email=jamshid804a@gmail.com   (required)
//   ?status=pending|approved|rejected  (optional)
//
//   NOTE: We pass owner email as a query param because the Kinde
//   server-side session is unreliable in this deployment. The email
//   is checked against the hardcoded owner email. Do not expose this
//   endpoint publicly.
// ─────────────────────────────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get("email")
    const status = searchParams.get("status")

    if (!isOwnerEmail(email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getDb()
    const filter = {}
    if (status && ["pending", "approved", "rejected"].includes(status)) {
      filter.status = status
    }

    const payments = await db
      .collection("payments")
      .find(filter)
      .sort({ submittedAt: -1 })
      .limit(200)
      .toArray()

    const withData = payments.map((p) => ({
      _id: p._id.toString(),
      orgId: p.orgId,
      schoolId: p.schoolId,
      schoolName: p.schoolName,
      email: p.email,
      section: p.section,
      amount: p.amount,
      tid: p.tid,
      note: p.note || "",
      senderName: p.senderName || "",
      senderPhone: p.senderPhone || "",
      status: p.status,
      submittedAt: p.submittedAt,
      reviewedAt: p.reviewedAt,
      reviewedBy: p.reviewedBy,
      adminNote: p.adminNote || "",
    }))

    const pendingCount = await db
      .collection("payments")
      .countDocuments({ status: "pending" })

    return NextResponse.json({
      success: true,
      payments: withData,
      pendingCount,
    })
  } catch (err) {
    console.error("❌ GET /api/admin/payments:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}