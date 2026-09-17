import { NextResponse } from "next/server";
import { getDb } from "@/utils";

export async function GET() {
  try {
    const db = await getDb();
    const grades = await db.collection("grades").find({}).toArray();
    return NextResponse.json(
      grades.map((g) => ({ ...g, id: g._id.toString(), _id: undefined }))
    );
  } catch (err) {
    console.error("❌ GET /api/grade:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}