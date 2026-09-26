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

// ─────────────────────────────────────────────
// GET one student
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// PUT — update a student (with duplicate checks)
// ─────────────────────────────────────────────
export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const data = await req.json();

    if (!data.name || !data.grade) {
      return NextResponse.json({ error: "Name and Grade required" }, { status: 400 });
    }

    const db = await getDb();
    const students = db.collection("students");

    // Find the current student first
    const query = buildIdMatchQuery(id);
    const currentStudent = await students.findOne(query);
    if (!currentStudent) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // ─── Duplicate Admission No check (excluding self) ───
    if (
      data.admissionNo !== null &&
      data.admissionNo !== undefined &&
      data.admissionNo !== ""
    ) {
      const existingAdmission = await students.findOne({
        admissionNo: String(data.admissionNo).trim(),
        _id: { $ne: currentStudent._id },
      });
      if (existingAdmission) {
        return NextResponse.json(
          { error: `Admission No ${data.admissionNo} already exists` },
          { status: 409 }
        );
      }
    }

    // ─── Duplicate Roll No check (excluding self) ───
    if (
      data.rollNo !== null &&
      data.rollNo !== undefined &&
      data.rollNo !== ""
    ) {
      const rollQuery = {
        grade: String(data.grade).trim(),
        rollNo: Number(data.rollNo),
        _id: { $ne: currentStudent._id },
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

    // ─── Build the update object (includes ALL fields) ───
    const update = {
      name: String(data.name).trim(),
      fatherName: data.fatherName ? String(data.fatherName).trim() : null,
      fatherOccupation: data.fatherOccupation
        ? String(data.fatherOccupation).trim()
        : null,
      admissionNo: data.admissionNo ? String(data.admissionNo).trim() : null,
      contact: data.contact || "",
      grade: String(data.grade).trim(),
      section: data.section ? String(data.section).trim() : null,
      rollNo: data.rollNo ? Number(data.rollNo) : null,
      session: data.session ? String(data.session).trim() : null,
      admissionDate: data.admissionDate || null,
      fee: data.fee ? Number(data.fee) : 0,
      address: data.address || "",
      image: data.image || null, // ✅ handles image update (base64 or URL)
      updatedAt: new Date(),
    };

    const result = await students.updateOne(
      { _id: currentStudent._id },
      { $set: update }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ PUT /api/student/[id]:", err.message);

    // Safety net for unique index errors
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

// ─────────────────────────────────────────────
// DELETE — remove a student
// ─────────────────────────────────────────────
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    console.log("🔍 DELETE called with raw id:", id, "| typeof:", typeof id);

    const db = await getDb();

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