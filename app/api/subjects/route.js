import { NextResponse } from "next/server";
import { getDb } from "@/utils";

// ✅ GET — list subjects for ONE student
// ?studentId=1
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json({ error: "studentId required" }, { status: 400 });
    }

    const db = await getDb();
    const subjects = await db
      .collection("subjects")
      .find({ studentId: String(studentId) })
      .sort({ name: 1 })
      .toArray();

    return NextResponse.json(
      subjects.map((s) => ({ ...s, id: s._id.toString(), _id: undefined }))
    );
  } catch (err) {
    console.error("❌ GET /api/subjects:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ✅ POST — add a subject for ONE student
export async function POST(req) {
  try {
    const data = await req.json();
    if (!data.name || !data.studentId) {
      return NextResponse.json(
        { error: "name and studentId required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const existing = await db.collection("subjects").findOne({
      name: data.name.trim(),
      studentId: String(data.studentId),
    });
    if (existing) {
      return NextResponse.json({ error: "Subject already exists" }, { status: 400 });
    }

    const result = await db.collection("subjects").insertOne({
      name: data.name.trim(),
      studentId: String(data.studentId),
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, id: result.insertedId.toString() });
  } catch (err) {
    console.error("❌ POST /api/subjects:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}