import { NextResponse } from "next/server";
import { getDb } from "@/utils";
import { ObjectId } from "mongodb";

// ✅ Sends a real push notification with sound to the parent's phone
async function sendPushNotification(db, studentId, type, message) {
  try {
    const student = await db
      .collection("students")
      .findOne({ id: Number(studentId) });

    if (!student?.contact) {
      console.log("⚠️ No student/contact found for push, studentId:", studentId);
      return;
    }

    const parent = await db
      .collection("parents")
      .findOne({ phone: student.contact });

    if (!parent?.pushToken) {
      console.log("⚠️ No pushToken found for parent phone:", student.contact);
      return;
    }

    const pushType = type === "academic" ? "test" : type || "attendance";

    const pushRes = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: parent.pushToken,
        sound: "default",
        title: "New Notification",
        body: message,
        data: { type: pushType },
        channelId: `channel_${pushType}`,
      }),
    });

    const pushData = await pushRes.json();
    console.log("📲 Push result:", JSON.stringify(pushData));
  } catch (e) {
    console.error("❌ Push send failed:", e.message);
  }
}

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

// ✅ POST — save notification (attendance, academic, or fee)
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

    // ✅ Duplicate check ONLY for attendance (not academic, not fee)
    if (type === "attendance") {
      const existing = await collection.findOne({
        studentId: String(studentId),
        blockNumber: Number(blockNumber),
        weekStart: Number(weekStart),
        weekEnd: Number(weekEnd),
        type: "attendance",
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

    // ✅ Fire the real push notification (fire-and-forget, doesn't block response)
    sendPushNotification(db, studentId, type || "attendance", message);

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