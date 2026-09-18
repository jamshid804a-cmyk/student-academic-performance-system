import { NextResponse } from "next/server";
import { getDb } from "@/utils";
import { ObjectId } from "mongodb";

// Helper: build a query that matches the student by id in any format
function buildIdMatchQuery(id) {
  const orConditions = [];

  // Match as string id
  orConditions.push({ id: id });

  // Match as numeric id
  if (!isNaN(Number(id))) {
    orConditions.push({ id: Number(id) });
  }

  // Match as ObjectId (_id)
  if (ObjectId.isValid(id) && String(new ObjectId(id)) === id) {
    orConditions.push({ _id: new ObjectId(id) });
  }

  return { $or: orConditions };
}

// ✅ GET one student
export async function GET(req, { params }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const db = await getDb();
    const query = buildIdMatchQuery(id);
    const student = await db.collection("students").findOne(query);

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

    const query = buildIdMatchQuery(id);
    const result = await db.collection("students").updateOne(query, { $set: update });

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

    console.log("🔍 DELETE called with raw id:", id, "| typeof:", typeof id);

    const db = await getDb();

    // DEBUG: log a sample document so we can compare field types if this still fails
    const sample = await db.collection("students").findOne({});
    console.log("🔍 Sample student document in DB:", sample);

    const query = buildIdMatchQuery(id);
    console.log("🔍 Delete query being used:", JSON.stringify(query));

    const result = await db.collection("students").deleteOne(query);
    console.log("🔍 Delete result -> deletedCount:", result.deletedCount);

    if (result.deletedCount === 0) {
      console.log("❌ No matching student found for id:", id);
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