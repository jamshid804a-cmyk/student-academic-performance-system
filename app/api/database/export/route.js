import { NextResponse } from "next/server";
import { BSON } from "mongodb";
import getClientPromise from "@/utils/mongodb";
import { getCurrentSchool } from "@/utils/getCurrentSchool";

// If `BSON.EJSON` is undefined on your driver version, run `npm i bson`
// and use: import { EJSON } from "bson";
const { EJSON } = BSON;

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

// Global helpers (exported for reference only; never restored)
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

    if (!schoolId) {
      return NextResponse.json({ error: "No schoolId in session" }, { status: 400 });
    }

    const client = await getClientPromise();
    const db = client.db("school_db");

    const data = {};
    const counts = {};

    for (const name of SCHOOL_SCOPED) {
      try {
        const docs = await db.collection(name).find({ schoolId }).toArray();
        data[name] = docs;
        counts[name] = docs.length;
      } catch (e) {
        console.warn(`[export] ${name} failed:`, e.message);
        data[name] = [];
        counts[name] = 0;
      }
    }

    for (const name of SCHOOL_OWN) {
      try {
        const docs = await db
          .collection(name)
          .find({ $or: [{ schoolId }, { id: schoolId }, { _id: schoolId }] })
          .toArray();
        data[name] = docs;
        counts[name] = docs.length;
      } catch (e) {
        console.warn(`[export] ${name} failed:`, e.message);
        data[name] = [];
        counts[name] = 0;
      }
    }

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

    return NextResponse.json({
      version: 7,
      format: "ejson", // tells the import route that ObjectId/Date are encoded
      exportedAt: new Date().toISOString(),
      dbType: "mongodb",
      database: "school_db",
      schoolId,
      collections: Object.keys(data),
      counts,
      totalRecords,
      // ObjectId -> {"$oid": "..."}, Date -> {"$date": "..."}
      data: EJSON.serialize(data, { relaxed: true }),
    });
  } catch (error) {
    console.error("[export] FATAL:", error);
    return NextResponse.json(
      { error: "Export failed: " + error.message },
      { status: 500 }
    );
  }
}