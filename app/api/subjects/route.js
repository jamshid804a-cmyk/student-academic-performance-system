import { NextResponse } from "next/server";
import { getDb } from "@/utils";

// ✅ GET — list all subjects
export async function GET() {
  try {
    const db = await getDb();
    const subjects = await db
      .collection("subjects")
      .find({})
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

// ✅ POST — add a subject
export async function POST(req) {
  try {
    const data = await req.json();
    if (!data.name) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }

    const db = await getDb();
    const existing = await db.collection("subjects").findOne({ name: data.name });
    if (existing) {
      return NextResponse.json({ error: "Subject already exists" }, { status: 400 });
    }

    const result = await db.collection("subjects").insertOne({
      name: data.name.trim(),
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, id: result.insertedId.toString() });
  } catch (err) {
    console.error("❌ POST /api/subjects:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}