import { NextResponse } from "next/server";
import { getDb } from "@/utils";
import crypto from "crypto";

// ─────────────────────────────────────────────
// Helper: generate next Teacher ID like TCH-001
// ─────────────────────────────────────────────
async function generateTeacherId(db) {
  const last = await db
    .collection("teachers")
    .find({ teacherId: { $regex: "^TCH-" } })
    .sort({ teacherId: -1 })
    .limit(1)
    .toArray();

  if (last.length === 0) return "TCH-001";

  const lastNum = parseInt(String(last[0].teacherId).replace("TCH-", ""), 10);
  const nextNum = isNaN(lastNum) ? 1 : lastNum + 1;
  return `TCH-${String(nextNum).padStart(3, "0")}`;
}

// ─────────────────────────────────────────────
// GET — list all teachers (supports ?subject=&status=)
// ─────────────────────────────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const subject = searchParams.get("subject");
    const status = searchParams.get("status");

    const db = await getDb();

    const filter = {};
    if (subject) filter.subject = subject;
    if (status) filter.status = status;

    const teachers = await db
      .collection("teachers")
      .find(filter)
      .sort({ teacherId: 1 })
      .toArray();

    const formatted = teachers.map((t) => ({
      ...t,
      _id: t._id.toString(),
    }));

    return NextResponse.json(formatted);
  } catch (err) {
    console.error("❌ GET /api/teacher:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// POST — create a new teacher
// ─────────────────────────────────────────────
export async function POST(req) {
  try {
    const data = await req.json();
    const {
      name,
      email,
      phone,
      classes,        // [{ grade, section }]
      qualification,
      subject,
      joiningDate,
      salary,
      address,
      status,
    } = data;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const collection = db.collection("teachers");

    // Duplicate email check
    const existing = await collection.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: "A teacher with this email already exists" },
        { status: 400 }
      );
    }

    // Auto-generate Teacher ID
    const teacherId = await generateTeacherId(db);

    // Public token for the share link (32 hex chars)
    const publicToken = crypto.randomBytes(16).toString("hex");

    const doc = {
      teacherId,
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      phone: phone ? String(phone).trim() : "",
      classes: Array.isArray(classes) ? classes : [],
      qualification: qualification ? String(qualification).trim() : "",
      subject: subject ? String(subject).trim() : "",
      joiningDate: joiningDate || "",
      salary: Number(salary) || 0,
      address: address ? String(address).trim() : "",
      status: status || "Active",
      publicToken,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(doc);

    return NextResponse.json({
      success: true,
      id: result.insertedId.toString(),
      teacherId,
      publicToken,
    });
  } catch (err) {
    console.error("❌ POST /api/teacher:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}