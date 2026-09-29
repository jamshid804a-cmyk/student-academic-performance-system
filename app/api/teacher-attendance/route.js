import { NextResponse } from "next/server";
import { getDb } from "@/utils";

// ─────────────────────────────────────────────
// GET — fetch teacher attendance
//   Query params:
//     month=MM/YYYY   (required)
//     teacherId=TCH-001  (optional — single teacher)
// ─────────────────────────────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const teacherId = searchParams.get("teacherId");

    if (!month) {
      return NextResponse.json({ error: "month is required" }, { status: 400 });
    }

    const db = await getDb();

    const filter = { month: String(month) };
    if (teacherId) filter.teacherId = String(teacherId);

    const records = await db
      .collection("teacher_attendance")
      .find(filter)
      .sort({ day: 1 })
      .toArray();

    return NextResponse.json(
      records.map((r) => ({ ...r, _id: r._id.toString() }))
    );
  } catch (err) {
    console.error("❌ GET /api/teacher-attendance:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// POST — save (or update) one teacher's attendance for one day
//   Body: { teacherId, month, day, status }
//     status: "P" | "A" | "L"
// ─────────────────────────────────────────────
export async function POST(req) {
  try {
    const data = await req.json();
    const { teacherId, month, day, status } = data;

    if (!teacherId || !month || day === undefined || !status) {
      return NextResponse.json(
        { error: "teacherId, month, day, status are required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const collection = db.collection("teacher_attendance");

    // Upsert: one record per teacherId + month + day
    await collection.updateOne(
      {
        teacherId: String(teacherId),
        month: String(month),
        day: Number(day),
      },
      {
        $set: {
          teacherId: String(teacherId),
          month: String(month),
          day: Number(day),
          status: String(status).toUpperCase(),
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ POST /api/teacher-attendance:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// DELETE — remove one teacher's attendance for one day
//   Query: ?teacherId=TCH-001&month=MM/YYYY&day=15
// ─────────────────────────────────────────────
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get("teacherId");
    const month = searchParams.get("month");
    const day = searchParams.get("day");

    if (!teacherId || !month || day === null) {
      return NextResponse.json(
        { error: "teacherId, month, day are required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    await db.collection("teacher_attendance").deleteOne({
      teacherId: String(teacherId),
      month: String(month),
      day: Number(day),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ DELETE /api/teacher-attendance:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}