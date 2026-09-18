import { NextResponse } from "next/server";
import { getDb } from "@/utils";
import { ObjectId } from "mongodb";

// ✅ DELETE — remove a subject
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    const db = await getDb();

    let result;
    try {
      result = await db.collection("subjects").deleteOne({ _id: new ObjectId(id) });
    } catch {
      result = await db.collection("subjects").deleteOne({ id });
    }

    return NextResponse.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error("❌ DELETE /api/subjects/[id]:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}