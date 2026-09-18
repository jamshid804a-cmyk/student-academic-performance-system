import { NextResponse } from "next/server";
import { getDb } from "@/utils";
import { ObjectId } from "mongodb";

// ✅ GET one student
export async function GET(req, { params }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const db = await getDb();

    // Try numeric id first, then ObjectId
    let student = await db.collection("students").findOne({ id: Number(id) });

    if (!student) {
      try {
        student = await db.collection("students").findOne({ _id: new ObjectId(id) });
      } catch {
        // ignore
      }
    }

    if (!student) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...student,
      id: student.id,
      _id: undefined,
    });
  } catch (err) {
    console.error("❌ GET /api/student/[id]:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ✅ PUT — update a student
export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const data = await req.json();

    if (!data.name || !data.grade) {
      return NextResponse.json({ error: "Name and Grade required" }, { status: 400 });
    }

    const db = await getDb();

    const update = {
      name: data.name,
      fatherName: data.fatherName || null,
      admissionNo: data.admissionNo || null,
      contact: data.contact || "",
      grade: data.grade,
      section: data.section || null,
      rollNo: data.rollNo ? Number(data.rollNo) : null,
      session: data.session || null,
      fee: data.fee ? Number(data.fee) : 0,
      address: data.address || "",
      updatedAt: new Date(),
    };

    // Try numeric id first
    let result = await db
      .collection("students")
      .updateOne({ id: Number(id) }, { $set: update });

    // Fallback to ObjectId
    if (result.matchedCount === 0) {
      try {
        result = await db
          .collection("students")
          .updateOne({ _id: new ObjectId(id) }, { $set: update });
      } catch {
        // ignore
      }
    }

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ PUT /api/student/[id]:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ✅ DELETE — remove a student
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const db = await getDb();

    let result = { deletedCount: 0 };

    // 1. Try numeric id
    if (!isNaN(Number(id))) {
      result = await db.collection("students").deleteOne({ id: Number(id) });
    }

    // 2. Fallback to ObjectId
    if (result.deletedCount === 0) {
      try {
        result = await db
          .collection("students")
          .deleteOne({ _id: new ObjectId(id) });
      } catch {
        // ignore invalid ObjectId
      }
    }

    // 3. Fallback to string id
    if (result.deletedCount === 0) {
      result = await db.collection("students").deleteOne({ id: id });
    }

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

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

    return NextResponse.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error("❌ DELETE /api/student/[id]:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}