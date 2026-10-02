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
// GET — list all payments (owner only)
//   ?status=pending | approved | rejected  (optional)
// ─────────────────────────────────────────────
export async function GET(req) {
  try {
    if (!(await isOwner())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")

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

    // Counts for badges
    const pendingCount = await db.collection("payments").countDocuments({ status: "pending" })

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