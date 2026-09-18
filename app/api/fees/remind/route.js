import { NextResponse } from "next/server";
import { getDb } from "@/utils";

// POST — send fee reminder to parents
// body: { studentIds: ["34","35"], month: "09/2026", grade }
export async function POST(req) {
  try {
    const { studentIds, month, grade } = await req.json();

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: "studentIds required" }, { status: 400 });
    }

    const db = await getDb();
    const notifications = db.collection("notifications");

    const docs = studentIds.map((id) => ({
      studentId: String(id),
      message: `Dear Parent, the fee for ${month} (${grade || ""}) is still pending. Kindly pay at your earliest convenience.`,
      readStatus: false,
      blockNumber: 0,
      weekStart: 0,
      weekEnd: 0,
      type: "fee",
      createdAt: new Date(),
    }));

    await notifications.insertMany(docs);

    return NextResponse.json({ success: true, sent: docs.length });
  } catch (err) {
    console.error("❌ POST /api/fees/remind:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}