import { NextResponse } from "next/server";
import { getDb } from "@/utils";

// ✅ GET — returns students of the grade/section/session with their attendance for the month
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const grade = searchParams.get("grade");
    const section = searchParams.get("section");
    const session = searchParams.get("session");
    const month = searchParams.get("month"); // "09/2026"

    if (!grade || !month) {
      return NextResponse.json(
        { error: "grade and month are required" },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Build student filter
    const studentFilter = { grade };
    if (section) studentFilter.section = section;
    if (session) studentFilter.session = session;

    const students = await db
      .collection("students")
      .find(studentFilter)
      .sort({ rollNo: 1, name: 1 })
      .toArray();

    // Build attendance filter
    const attendance = await db
      .collection("attendance")
      .find({ date: month })
      .toArray();

    // Map attendance by studentId -> { day: status }
    const attendanceMap = {};
    attendance.forEach((a) => {
      const sid = String(a.studentId);
      if (!attendanceMap[sid]) attendanceMap[sid] = {};
      attendanceMap[sid][String(a.day)] = a.status || (a.present ? "P" : "A");
    });

    const result = students.map((s) => {
      const sid = s.id != null ? String(s.id) : s._id.toString();
      return {
        studentId: sid,
        rollNo: s.rollNo ?? "",
        name: s.name,
        grade: s.grade,
        section: s.section || "",
        session: s.session || "",
        attendance: attendanceMap[sid] || {},
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("❌ GET /api/attendance error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ✅ POST — set status for one student on one day (upsert)
export async function POST(req) {
  try {
    const data = await req.json();
    const { studentId, day, date, status } = data;

    if (!studentId || !day || !date) {
      return NextResponse.json(
        { error: "studentId, day and date are required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const collection = db.collection("attendance");

    const filter = {
      studentId: String(studentId),
      day: Number(day),
      date,
    };

    // If status is null/empty → delete record (so cell shows nothing)
    if (!status) {
      await collection.deleteOne(filter);
      return NextResponse.json({ success: true, cleared: true });
    }

    // Validate status
    const valid = ["P", "A", "L"];
    if (!valid.includes(status)) {
      return NextResponse.json(
        { error: "status must be P, A, L or null" },
        { status: 400 }
      );
    }

    // Upsert
    await collection.updateOne(
      filter,
      { $set: { ...filter, status, updatedAt: new Date() } },
      { upsert: true }
    );

    return NextResponse.json({ success: true, status });
  } catch (err) {
    console.error("❌ POST /api/attendance error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ✅ DELETE — remove a record
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const day = searchParams.get("day");
    const month = searchParams.get("month");

    if (!studentId || !day || !month) {
      return NextResponse.json(
        { error: "studentId, day and month are required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    await db.collection("attendance").deleteOne({
      studentId: String(studentId),
      day: Number(day),
      date: month,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ DELETE /api/attendance error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}