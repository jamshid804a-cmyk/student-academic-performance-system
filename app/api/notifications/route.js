import { NextResponse } from "next/server";
import { db } from "@/utils";
import { NOTIFICATIONS } from "@/utils/schema";
import { eq, and } from "drizzle-orm";

// GET - fetch notifications for parent app
export async function GET(req) {
  const searchParams = req.nextUrl.searchParams;
  const studentId = searchParams.get("studentId");

  if (!studentId) {
    return NextResponse.json({ error: "studentId required" }, { status: 400 });
  }

  const notifications = await db
    .select()
    .from(NOTIFICATIONS)
    .where(eq(NOTIFICATIONS.studentId, Number(studentId)))
    .orderBy(NOTIFICATIONS.createdAt);

  return NextResponse.json(notifications);
}

// POST - save notification (handles both attendance and academic types)
export async function POST(req) {
  const data = await req.json();
  const { studentId, message, blockNumber, weekStart, weekEnd, type } = data;

  const isAcademic = type === "academic";

  // For attendance: check duplicate by block+week
  // For academic: check duplicate by studentId + type (only one per student)
  if (!isAcademic) {
    const existing = await db
      .select()
      .from(NOTIFICATIONS)
      .where(
        and(
          eq(NOTIFICATIONS.studentId, Number(studentId)),
          eq(NOTIFICATIONS.blockNumber, Number(blockNumber)),
          eq(NOTIFICATIONS.weekStart, Number(weekStart)),
          eq(NOTIFICATIONS.weekEnd, Number(weekEnd))
        )
      );

    if (existing.length > 0) {
      return NextResponse.json({ success: false, alreadySent: true });
    }
  }

  // Insert notification
  const result = await db.insert(NOTIFICATIONS).values({
    studentId: Number(studentId),
    message,
    readStatus: false,
    // For academic notifications, set block/week to 0
    blockNumber: isAcademic ? 0 : Number(blockNumber),
    weekStart: isAcademic ? 0 : Number(weekStart),
    weekEnd: isAcademic ? 0 : Number(weekEnd),
    type: type || "attendance",   // ← store the type
  });

  return NextResponse.json({ success: true, result });
}

// PUT - mark notification as read (used by parent app)
export async function PUT(req) {
  const data = await req.json();

  const result = await db
    .update(NOTIFICATIONS)
    .set({ readStatus: true })
    .where(eq(NOTIFICATIONS.id, Number(data.id)));

  return NextResponse.json({ success: true, result });
}

// DELETE - remove a notification
export async function DELETE(req) {
  const searchParams = req.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  await db.delete(NOTIFICATIONS).where(eq(NOTIFICATIONS.id, Number(id)));

  return NextResponse.json({ success: true });
}