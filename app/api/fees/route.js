import { NextResponse } from "next/server";
import { getDb } from "@/utils";

// ✅ GET — list all fee payments for a month/class
// ?grade=5th&section=A&session=2025-2026&month=09/2026
// month is optional — if omitted, returns all months for that class
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const grade = searchParams.get("grade");
    const section = searchParams.get("section");
    const session = searchParams.get("session");
    const month = searchParams.get("month");

    const db = await getDb();

    const filter = {};
    if (grade) filter.grade = grade;
    if (section) filter.section = section;
    if (session) filter.session = session;
    if (month) filter.month = month;

    const payments = await db
      .collection("fees")
      .find(filter)
      .sort({ paidAt: -1 })
      .toArray();

    return NextResponse.json(
      payments.map((p) => ({ ...p, id: p._id.toString(), _id: undefined }))
    );
  } catch (err) {
    console.error("❌ GET /api/fees:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ✅ POST — record a fee payment
export async function POST(req) {
  try {
    const data = await req.json();
    const {
      studentId,
      grade,
      section,
      session,
      month,
      amount,
      paidDate,     // "01/04/2026"
      note,
    } = data;

    if (!studentId || !month || !amount || !paidDate) {
      return NextResponse.json(
        { error: "studentId, month, amount and paidDate required" },
        { status: 400 }
      );
    }

    const db = await getDb();

    await db.collection("fees").insertOne({
      studentId: String(studentId),
      grade,
      section,
      session,
      month,
      amount: Number(amount),
      paidDate,
      note: note || "",
      paidAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ POST /api/fees:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ✅ PUT — delete fee records for a specific student
// If `month` is provided → only that month is deleted
// If `month` is omitted → all records for the session are deleted
export async function PUT(req) {
  try {
    const data = await req.json();
    const { studentId, session, month } = data;

    if (!studentId) {
      return NextResponse.json({ error: "studentId required" }, { status: 400 });
    }

    const db = await getDb();
    const filter = { studentId: String(studentId) };
    if (session) filter.session = session;
    if (month) filter.month = month;

    const result = await db.collection("fees").deleteMany(filter);

    return NextResponse.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error("❌ PUT /api/fees (delete):", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ✅ DELETE — remove a SINGLE payment record by id
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const db = await getDb();
    const { ObjectId } = await import("mongodb");

    let result;
    try {
      result = await db.collection("fees").deleteOne({ _id: new ObjectId(id) });
    } catch {
      result = await db.collection("fees").deleteOne({ id });
    }

    return NextResponse.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error("❌ DELETE /api/fees:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}