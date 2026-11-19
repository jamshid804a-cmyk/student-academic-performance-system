import { NextResponse } from "next/server";
import getClientPromise from "@/utils/mongodb";

// ─────────────────────────────────────────────
// GET — diagnostic only (shows counts)
// ─────────────────────────────────────────────
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("key") !== "fix2026") {
      return NextResponse.json(
        { error: "Provide ?key=fix2026 in URL" },
        { status: 401 }
      );
    }

    const client = await getClientPromise();
    const db = client.db("school_db");

    const studentsBySchool = await db
      .collection("students")
      .aggregate([
        { $group: { _id: "$schoolId", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray();

    const attendanceBySchool = await db
      .collection("attendance")
      .aggregate([
        { $group: { _id: "$schoolId", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray();

    const teachersBySchool = await db
      .collection("teachers")
      .aggregate([
        { $group: { _id: "$schoolId", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray();

    const feesBySchool = await db
      .collection("fees")
      .aggregate([
        { $group: { _id: "$schoolId", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray();

    return NextResponse.json({
      mode: "GET — diagnostic only, no changes",
      studentsBySchool,
      attendanceBySchool,
      teachersBySchool,
      feesBySchool,
    });
  } catch (e) {
    console.error("GET fix error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// POST — fix (dry-run or apply)
// ─────────────────────────────────────────────
export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    const action = searchParams.get("action");

    if (key !== "fix2026") {
      return NextResponse.json(
        { error: "Provide ?key=fix2026 in URL" },
        { status: 401 }
      );
    }

    const client = await getClientPromise();
    const db = client.db("school_db");

    // ═══════════════════════════════════════════
    // DRY RUN — preview what would change
    // ═══════════════════════════════════════════
    if (action === "dry") {
      // 1. Student IDs referenced by test_school attendance
      const testAttRefs = await db
        .collection("attendance")
        .distinct("studentId", { schoolId: "test_school" });

      const numericIds = testAttRefs
        .map((x) => Number(x))
        .filter((n) => !isNaN(n));

      // 2. Those students whose schoolId is NOT test_school
      const studentsToRetag = await db
        .collection("students")
        .find({
          id: { $in: numericIds },
          schoolId: { $ne: "test_school" },
        })
        .toArray();

      return NextResponse.json({
        mode: "DRY RUN — no changes made",
        hint: "If this looks correct, run ?action=apply",
        testSchoolAttendanceReferences: testAttRefs,
        studentsToRetag: studentsToRetag.map((s) => ({
          id: s.id,
          name: s.name,
          currentSchoolId: s.schoolId,
          newSchoolId: "test_school",
        })),
        count: studentsToRetag.length,
      });
    }

    // ═══════════════════════════════════════════
    // APPLY — actually retag students
    // ═══════════════════════════════════════════
    if (action === "apply") {
      // 1. Student IDs referenced by test_school attendance
      const testAttRefs = await db
        .collection("attendance")
        .distinct("studentId", { schoolId: "test_school" });

      const numericIds = testAttRefs
        .map((x) => Number(x))
        .filter((n) => !isNaN(n));

      // 2. Update those students to test_school
      const result = await db.collection("students").updateMany(
        {
          id: { $in: numericIds },
          schoolId: { $ne: "test_school" },
        },
        { $set: { schoolId: "test_school" } }
      );

      // 3. Also update those students in teacher_attendance, fees, exams, tests
      //    just in case they reference the same students
      const teacherAttUpdate = await db.collection("teacher_attendance").updateMany(
        { schoolId: "alkhyer_model_school" },
        { $set: { schoolId: "alkhyer_model_school" } }
      );

      // 4. Get counts after update
      const after = await db
        .collection("students")
        .aggregate([
          { $group: { _id: "$schoolId", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ])
        .toArray();

      return NextResponse.json({
        success: true,
        message: `Re-tagged ${result.modifiedCount} students to test_school`,
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
        studentsBySchoolAfter: after,
      });
    }

    return NextResponse.json(
      {
        error: "Specify an action",
        usage: {
          dryRun:
            "/api/database/fix-school-ids?key=fix2026&action=dry (POST)",
          apply:
            "/api/database/fix-school-ids?key=fix2026&action=apply (POST)",
        },
      },
      { status: 400 }
    );
  } catch (e) {
    console.error("POST fix error:", e);
    return NextResponse.json(
      { error: e.message, stack: e.stack },
      { status: 500 }
    );
  }
}