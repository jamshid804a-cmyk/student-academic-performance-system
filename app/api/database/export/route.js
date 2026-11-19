import { NextResponse } from "next/server";
import getClientPromise from "@/utils/mongodb";
import { getCurrentSchool } from "@/utils/getCurrentSchool";

// Collections that are scoped per-school
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

// School's own record
const SCHOOL_OWN = ["schools", "school_info"];

// Global helpers
const GLOBAL = ["counters"];

export async function GET() {
  try {
    // 1. Get current school
    const schoolResult = await getCurrentSchool();
    if (!schoolResult.success) {
      return NextResponse.json(
        { error: schoolResult.error || "Unauthorized" },
        { status: 401 }
      );
    }
    const { schoolId } = schoolResult.school;

    if (!schoolId) {
      return NextResponse.json(
        { error: "No schoolId in session" },
        { status: 400 }
      );
    }

    console.log(`[export] Starting export for schoolId=${schoolId}`);

    const client = await getClientPromise();
    const db = client.db("school_db");

    const data = {};
    const counts = {};

    // 2. School-scoped collections
    for (const name of SCHOOL_SCOPED) {
      try {
        const docs = await db.collection(name).find({ schoolId }).toArray();
        data[name] = docs;
        counts[name] = docs.length;
        console.log(`[export] ${name}: ${docs.length} docs`);
      } catch (e) {
        console.warn(`[export] ${name} failed:`, e.message);
        data[name] = [];
        counts[name] = 0;
      }
    }

    // 3. School's own record
    for (const name of SCHOOL_OWN) {
      try {
        const docs = await db
          .collection(name)
          .find({ $or: [{ schoolId }, { id: schoolId }, { _id: schoolId }] })
          .toArray();
        data[name] = docs;
        counts[name] = docs.length;
        console.log(`[export] ${name}: ${docs.length} docs`);
      } catch (e) {
        console.warn(`[export] ${name} failed:`, e.message);
        data[name] = [];
        counts[name] = 0;
      }
    }

    // 4. Global counters
    for (const name of GLOBAL) {
      try {
        const docs = await db.collection(name).find({}).toArray();
        data[name] = docs;
        counts[name] = docs.length;
      } catch (e) {
        data[name] = [];
        counts[name] = 0;
      }
    }

    const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);
    console.log(`[export] ✓ DONE. Total: ${totalRecords} records, students: ${counts.students}`);

    return NextResponse.json({
      version: 6,
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
    console.error("[export] FATAL:", error);
    return NextResponse.json(
      { error: "Export failed: " + error.message },
      { status: 500 }
    );
  }
}