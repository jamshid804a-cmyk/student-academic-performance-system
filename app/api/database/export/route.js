import { NextResponse } from "next/server";
import { BSON } from "mongodb";
import getClientPromise from "@/utils/mongodb";
import { getCurrentSchool } from "@/utils/getCurrentSchool";

const { EJSON } = BSON;

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

// These collections often have legacy docs without schoolId
const LEGACY_FALLBACK = ["tests", "exams", "subjects"];

const SCHOOL_OWN = ["schools", "school_info"];
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
    const warnings = [];

    // ── School-scoped collections ──
    for (const name of SCHOOL_SCOPED) {
      try {
        const coll = db.collection(name);

        // 1) Strict: docs with matching schoolId
        let docs = await coll.find({ schoolId }).toArray();

        // 2) Fallback for legacy tests/exams/subjects: docs with NO schoolId
        //    Only used when strict match returned 0, and only for a small
        //    set of collections where legacy data is common.
        if (docs.length === 0 && LEGACY_FALLBACK.includes(name)) {
          const legacyDocs = await coll
            .find({
              $or: [
                { schoolId: { $exists: false } },
                { schoolId: null },
                { schoolId: "" },
              ],
            })
            .toArray();

          if (legacyDocs.length > 0) {
            warnings.push(
              `${name}: ${legacyDocs.length} legacy docs without schoolId — included`
            );
            docs = legacyDocs;
          }
        }

        data[name] = docs;
        counts[name] = docs.length;
      } catch (e) {
        console.warn(`[export] ${name} failed:`, e.message);
        data[name] = [];
        counts[name] = 0;
      }
    }

    // ── School's own record ──
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

    // ── Global counters ──
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
      version: 8,
      format: "ejson",
      exportedAt: new Date().toISOString(),
      dbType: "mongodb",
      database: "school_db",
      schoolId,
      collections: Object.keys(data),
      counts,
      totalRecords,
      warnings,
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