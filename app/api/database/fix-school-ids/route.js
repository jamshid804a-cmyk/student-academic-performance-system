import { NextResponse } from "next/server";
import getClientPromise from "@/utils/mongodb";

// GET — diagnostic
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("key") !== "fix2026") {
      return NextResponse.json({ error: "Provide ?key=fix2026" }, { status: 401 });
    }

    const client = await getClientPromise();
    const db = client.db("school_db");

    const studentsBySchool = await db.collection("students").aggregate([
      { $group: { _id: "$schoolId", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    const attendanceBySchool = await db.collection("attendance").aggregate([
      { $group: { _id: "$schoolId", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    return NextResponse.json({ studentsBySchool, attendanceBySchool });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST — fix: reassign students to correct school based on attendance
export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    const action = searchParams.get("action");

    if (key !== "fix2026") {
      return NextResponse.json({ error: "Provide ?key=fix2026" }, { status: 401 });
    }

    const client = await getClientPromise();
    const db = client.db("school_db");

    // DRY RUN — show what would happen, do NOT modify
    if (action === "dry") {
      const testAttRefs = await db.collection("attendance")
        .distinct("studentId", { schoolId: "test_school" });
      const numericIds = testAttRefs.map(Number).filter(n => !isNaN(n));

      const affected = await db.collection("students").find({
        id: { $in: numericIds },
        schoolId: { $ne: "test_school" }
      }).toArray();

      return NextResponse.json({
        mode: "DRY RUN — no changes made",
        studentsToRetag: affected.map(s => ({
          id: s.id, name: s.name, currentSchoolId: s.schoolId, newSchoolId: "test_school"
        })),
        count: affected.length,
      });
    }

    // APPLY — retag students from alkhyer_model_school → test_school
    if (action === "apply") {
      const testAttRefs = await db.collection("attendance")
        .distinct("studentId", { schoolId: "test_school" });
      const numericIds = testAttRefs.map(Number).filter(n => !isNaN(n));

      const result = await db.collection("students").updateMany(
        { id: { $in: numericIds }, schoolId: { $ne: "test_school" } },
        { $set: { schoolId: "test_school" } }
      );

      const after = await db.collection("students").aggregate([
        { $group: { _id: "$schoolId", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]).toArray();

      return NextResponse.json({
        success: true,
        message: `Re-tagged ${result.modifiedCount} students to test_school`,
        modifiedCount: result.modifiedCount,
        studentsBySchoolAfter: after,
      });
    }

    return NextResponse.json({
      error: "Use ?action=dry or ?action=apply",
      examples: [
        "/api/database/fix-school-ids?key=fix2026&action=dry",
        "/api/database/fix-school-ids?key=fix2026&action=apply"
      ]
    }, { status: 400 });
  } catch (e) {
    console.error("fix error:", e);
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
}