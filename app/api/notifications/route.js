import { NextResponse } from "next/server";
import { getDb } from "@/utils";
import { ObjectId } from "mongodb";

// ✅ GET — fetch notifications for a student
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json({ error: "studentId required" }, { status: 400 });
    }

    const db = await getDb();

    const notifications = await db
      .collection("notifications")
      .find({ studentId: String(studentId) })
      .sort({ createdAt: 1 })
      .toArray();

    return NextResponse.json(
      notifications.map((n) => ({
        ...n,
        id: n._id.toString(),
        _id: undefined,
      }))
    );
  } catch (err) {
    console.error("❌ GET /api/notifications:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ✅ POST — save notification (attendance or academic)
export async function POST(req) {
  try {
    const data = await req.json();
    const { studentId, message, blockNumber, weekStart, weekEnd, type } = data;

    if (!studentId || !message) {
      return NextResponse.json(
        { error: "studentId and message are required" },
        { status: 400 }
      );
    }

    const isAcademic = type === "academic";
    const db = await getDb();
    const collection = db.collection("notifications");

    // Duplicate check for attendance type
    if (!isAcademic) {
      const existing = await collection.findOne({
        studentId: String(studentId),
        blockNumber: Number(blockNumber),
        weekStart: Number(weekStart),
        weekEnd: Number(weekEnd),
        type: { $ne: "academic" },
      });

      if (existing) {
        return NextResponse.json({ success: false, alreadySent: true });
      }
    }

    const result = await collection.insertOne({
      studentId: String(studentId),
      message,
      readStatus: false,
      blockNumber: isAcademic ? 0 : Number(blockNumber) || 0,
      weekStart: isAcademic ? 0 : Number(weekStart) || 0,
      weekEnd: isAcademic ? 0 : Number(weekEnd) || 0,
      type: type || "attendance",
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      id: result.insertedId.toString(),
    });
  } catch (err) {
    console.error("❌ POST /api/notifications:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ✅ PUT — mark as read
export async function PUT(req) {
  try {
    const data = await req.json();

    if (!data.id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const db = await getDb();

    let result;
    try {
      result = await db.collection("notifications").updateOne(
        { _id: new ObjectId(data.id) },
        { $set: { readStatus: true } }
      );
    } catch {
      result = await db.collection("notifications").updateOne(
        { id: data.id },
        { $set: { readStatus: true } }
      );
    }

    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error("❌ PUT /api/notifications:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ✅ DELETE — remove one notification
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const db = await getDb();

    let result;
    try {
      result = await db.collection("notifications").deleteOne({
        _id: new ObjectId(id),
      });
    } catch {
      result = await db.collection("notifications").deleteOne({ id });
    }

    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error("❌ DELETE /api/notifications:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}