import { NextResponse } from "next/server";
import { getDb } from "@/utils";

// ─────────────────────────────────────────────
// GET - Fetch students (supports ?grade=&section=&session=)
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// POST - Add a new student (with duplicate checks)
// ─────────────────────────────────────────────
export async function POST(req) {
  try {
    const data = await req.json();
    console.log("Received student data:", data);

    // ─── Basic validation ───
    if (!data.name || !data.grade) {
      return NextResponse.json(
        { error: "Name and Grade are required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const students = db.collection("students");

    // ─── Duplicate Admission No check ───
    if (
      data.admissionNo !== null &&
      data.admissionNo !== undefined &&
      data.admissionNo !== ""
    ) {
      const existingAdmission = await students.findOne({
        admissionNo: String(data.admissionNo).trim(),
      });
      if (existingAdmission) {
        return NextResponse.json(
          { error: `Admission No ${data.admissionNo} already exists` },
          { status: 409 }
        );
      }
    }

    // ─── Duplicate Roll No check (same grade + section + session) ───
    if (
      data.rollNo !== null &&
      data.rollNo !== undefined &&
      data.rollNo !== ""
    ) {
      const rollQuery = {
        grade: String(data.grade).trim(),
        rollNo: Number(data.rollNo),
      };
      if (data.section) rollQuery.section = String(data.section).trim();
      if (data.session) rollQuery.session = String(data.session).trim();

      const existingRoll = await students.findOne(rollQuery);
      if (existingRoll) {
        return NextResponse.json(
          {
            error:
              `Roll No ${data.rollNo} already exists for Grade ${data.grade}` +
              (data.section ? ` - Section ${data.section}` : "") +
              (data.session ? ` (${data.session})` : ""),
          },
          { status: 409 }
        );
      }
    }

    // ─── Auto-increment id ───
    const counter = await db.collection("counters").findOneAndUpdate(
      { _id: "student_id" },
      { $inc: { seq: 1 } },
      { returnDocument: "after", upsert: true }
    );

    const nextId = counter?.value?.seq ?? counter?.seq ?? 1;

    // ─── Build student record (all fields from the form) ───
    const newStudent = {
      id: nextId,
      name: String(data.name).trim(),
      grade: String(data.grade).trim(),
      contact: data.contact || "",
      address: data.address || "",
      fatherName: data.fatherName ? String(data.fatherName).trim() : null,
      fatherOccupation: data.fatherOccupation
        ? String(data.fatherOccupation).trim()
        : null,
      admissionNo: data.admissionNo ? String(data.admissionNo).trim() : null,
      section: data.section ? String(data.section).trim() : null,
      rollNo: data.rollNo ? Number(data.rollNo) : null,
      session: data.session ? String(data.session).trim() : null,
      admissionDate: data.admissionDate || null,
      fee: data.fee ? Number(data.fee) : 0,
      image: data.image || null,
      createdAt: new Date(),
    };

    const result = await students.insertOne(newStudent);
    console.log("✅ Student added with id:", nextId);

    return NextResponse.json({
      success: true,
      id: nextId,
      _id: result.insertedId.toString(),
    });
  } catch (err) {
    console.error("❌ POST /api/student error:", err.message);

    // Safety net: Mongo unique index error
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || "field";
      return NextResponse.json(
        { error: `Duplicate value for ${field}` },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}