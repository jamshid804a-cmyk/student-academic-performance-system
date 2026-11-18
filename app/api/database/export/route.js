import { NextResponse } from "next/server";
import getClientPromise from "@/utils/mongodb";
import { getCurrentSchool } from "@/utils/getCurrentSchool";

// Collections that are scoped per-school (have a schoolId field)
const SCHOOL_SCOPED = [
  "students",
  "teachers",
  "attendance",
  "teacher_attendance",
  "fees",
  "fee",
  "payments",
  "exams",
  "tests",
  "subjects",
  "parents",
  "notifications",
  "academy_courses",
];

// Collections that are global but should be limited to this school
const SCHOOL_OWN = ["schools", "school_info"];

// Collections that are global helpers — include only if needed
const GLOBAL = ["counters"];

export async function GET() {
  try {
    const schoolResult = await getCurrentSchool();
    if (!schoolResult.success) {
      return NextResponse.json(
        { error: schoolResult.error || "Unauthorized" },
        { status: 401 }
      );
    }
    const { schoolId } = schoolResult.school;

    const client = await getClientPromise();
    const db = client.db("school_db");

    const data = {};
    const counts = {};

    // 1. School-scoped collections — filter by schoolId
    for (const name of SCHOOL_SCOPED) {
      const docs = await db.collection(name).find({ schoolId }).toArray();
      data[name] = docs;
      counts[name] = docs.length;
    }

    // 2. This school's own record(s)
    for (const name of SCHOOL_OWN) {
      // Try both `schoolId` and `id` matching — schemas vary
      const docs = await db
        .collection(name)
        .find({ $or: [{ schoolId }, { id: schoolId }] })
        .toArray();
      data[name] = docs;
      counts[name] = docs.length;
    }

    // 3. Global counters (optional — helps restore sequences)
    for (const name of GLOBAL) {
      const docs = await db.collection(name).find({}).toArray();
      data[name] = docs;
      counts[name] = docs.length;
    }

    const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);

    return NextResponse.json({
      version: 5,
      exportedAt: new Date().toISOString(),
      dbType: "mongodb",
      database: "school_db",
      schoolId,
      collections: Object.keys(data),
      counts,
      totalRecords,
      data,
    });
  } catch (error) {
    console.error("Export failed:", error);
    return NextResponse.json(
      { error: "Export failed: " + error.message },
      { status: 500 }
    );
  }
}