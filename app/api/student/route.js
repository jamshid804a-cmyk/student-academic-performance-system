import { NextResponse } from "next/server";
import { getDb } from "@/utils";

// ✅ GET - Fetch all students
export async function GET() {
  try {
    const db = await getDb();
    const students = await db
      .collection("students")
      .find({})
      .sort({ id: 1 })
      .toArray();

    const formatted = students.map((s) => ({
      ...s,
      id: typeof s.id === "number" ? s.id : null,
      _id: undefined,
    }));

    return NextResponse.json(formatted);
  } catch (err) {
    console.error("❌ GET /api/student error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ✅ POST - Add a new student
export async function POST(req) {
  try {
    const data = await req.json();
    console.log("Received student data:", data);

    if (!data.name || !data.grade) {
      return NextResponse.json(
        { error: "Name and Grade are required" },
        { status: 400 }
      );
    }

    const db = await getDb();

    // 🔢 Get the next numeric id
    const counter = await db.collection("counters").findOneAndUpdate(
      { _id: "student_id" },
      { $inc: { seq: 1 } },
      { returnDocument: "after", upsert: true }
    );

    const nextId = counter?.value?.seq ?? counter?.seq ?? 1;

    const newStudent = {
      id: nextId,
      name: data.name,
      grade: data.grade,
      contact: data.contact || "",
      address: data.address || "",
      fatherName: data.fatherName || null,
      admissionNo: data.admissionNo || null,
      section: data.section || null,
      rollNo: data.rollNo ? Number(data.rollNo) : null,
      session: data.session || null,
      fee: data.fee ? Number(data.fee) : 0,
      midMarks: 0,
      finalMarks: 0,
      gpa: "0",
      cgpa: "0",
      risk: "safe",
      createdAt: new Date(),
    };

    const result = await db.collection("students").insertOne(newStudent);
    console.log("✅ Student added with id:", nextId);

    return NextResponse.json({
      success: true,
      id: nextId,
      _id: result.insertedId.toString(),
    });
  } catch (err) {
    console.error("❌ POST /api/student error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ✅ DELETE - Remove a student (only used if id is passed as query param)
export async function DELETE(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection("students").deleteOne({ id: Number(id) });

    // 🔄 Reset counter to the highest remaining id
    const highest = await db
      .collection("students")
      .find({ id: { $type: "number" } })
      .sort({ id: -1 })
      .limit(1)
      .toArray();

    const newSeq = highest.length > 0 ? highest[0].id : 0;

    await db.collection("counters").updateOne(
      { _id: "student_id" },
      { $set: { seq: newSeq } },
      { upsert: true }
    );

    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error("❌ DELETE /api/student error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}