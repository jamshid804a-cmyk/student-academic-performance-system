import { NextResponse } from "next/server";
import { getDb } from "@/utils";

// ✅ GET - Fetch students (supports ?grade=&section=&session=)
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const grade = searchParams.get("grade");
    const section = searchParams.get("section");
    const session = searchParams.get("session");

    const db = await getDb();

    const filter = {};
    if (grade) filter.grade = grade;
    if (section) filter.section = section;
    if (session) filter.session = session;

    const students = await db
      .collection("students")
      .find(filter)
      .sort({ id: 1 })
      .toArray();

    const formatted = students.map((s) => ({
      ...s,
      id: s.id ?? null,
      _id: s._id.toString(),
    }));

    return NextResponse.json(formatted);
  } catch (err) {
    console.error("❌ GET /api/student error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ✅ POST - Add a new student (unchanged)
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