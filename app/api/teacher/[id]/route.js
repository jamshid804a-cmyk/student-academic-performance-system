import { NextResponse } from "next/server";
import { getDb } from "@/utils";
import { ObjectId } from "mongodb";
import crypto from "crypto";

// ─────────────────────────────────────────────
// GET — fetch a single teacher by _id OR teacherId OR publicToken
// ─────────────────────────────────────────────
export async function GET(req, { params }) {
  try {
    const { id } = params;
    const db = await getDb();

    let teacher = null;
    try {
      teacher = await db.collection("teachers").findOne({ _id: new ObjectId(id) });
    } catch {
      // not a valid ObjectId, try other fields
    }

    if (!teacher) {
      teacher = await db.collection("teachers").findOne({ teacherId: id });
    }
    if (!teacher) {
      teacher = await db.collection("teachers").findOne({ publicToken: id });
    }

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...teacher,
      _id: teacher._id.toString(),
    });
  } catch (err) {
    console.error("❌ GET /api/teacher/[id]:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// PUT — update a teacher
// ─────────────────────────────────────────────
export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const data = await req.json();
    const db = await getDb();

    let _id;
    try {
      _id = new ObjectId(id);
    } catch {
      // not a valid ObjectId — try to find by teacherId
      const byTid = await db.collection("teachers").findOne({ teacherId: id });
      if (!byTid) {
        return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
      }
      _id = byTid._id;
    }

    // Whitelist of updatable fields — do NOT let the client change teacherId or publicToken
    const allowed = [
      "name", "email", "phone", "classes", "qualification",
      "subject", "joiningDate", "salary", "address", "status",
    ];
    const patch = {};
    for (const key of allowed) {
      if (data[key] !== undefined) patch[key] = data[key];
    }
    if (patch.email) patch.email = String(patch.email).trim().toLowerCase();
    if (patch.salary !== undefined) patch.salary = Number(patch.salary) || 0;
    patch.updatedAt = new Date();

    await db.collection("teachers").updateOne({ _id }, { $set: patch });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ PUT /api/teacher/[id]:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// DELETE — remove a teacher
// ─────────────────────────────────────────────
export async function DELETE(req, { params }) {
  try {
    const { id } = params;
    const db = await getDb();

    let _id;
    try {
      _id = new ObjectId(id);
    } catch {
      const byTid = await db.collection("teachers").findOne({ teacherId: id });
      if (!byTid) {
        return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
      }
      _id = byTid._id;
    }

    await db.collection("teachers").deleteOne({ _id });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ DELETE /api/teacher/[id]:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// PATCH — regenerate the public token (used by the 🔗 button)
// ─────────────────────────────────────────────
export async function PATCH(req, { params }) {
  try {
    const { id } = params;
    const db = await getDb();

    let _id;
    try {
      _id = new ObjectId(id);
    } catch {
      const byTid = await db.collection("teachers").findOne({ teacherId: id });
      if (!byTid) {
        return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
      }
      _id = byTid._id;
    }

    const newToken = crypto.randomBytes(16).toString("hex");
    await db.collection("teachers").updateOne(
      { _id },
      { $set: { publicToken: newToken, updatedAt: new Date() } }
    );

    return NextResponse.json({ success: true, publicToken: newToken });
  } catch (err) {
    console.error("❌ PATCH /api/teacher/[id]:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}