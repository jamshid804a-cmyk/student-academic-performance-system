import { NextResponse } from "next/server";
import { getDb } from "@/utils";

// ✅ GET — flat list of attendance records for a month/class
// ?grade=5th&section=A&session=2025-2026&month=01/2026
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const grade = searchParams.get("grade");
    const section = searchParams.get("section");
    const session = searchParams.get("session");
    const month = searchParams.get("month");

    if (!grade || !month) {
      return NextResponse.json(
        { error: "grade and month are required" },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Students of this class
    const studentFilter = { grade };
    if (section) studentFilter.section = section;
    if (session) studentFilter.session = session;

    const students = await db
      .collection("students")
      .find(studentFilter)
      .toArray();

    // Map studentId -> name/grade for convenience
    const studentsById = {};
    students.forEach((s) => {
      const sid = s.id != null ? String(s.id) : s._id.toString();
      studentsById[sid] = { name: s.name, grade: s.grade };
    });

    // Attendance records for this month
    const attendance = await db
      .collection("attendance")
      .find({ date: month })
      .toArray();

    const flat = attendance
      .filter((a) => studentsById[String(a.studentId)]) // only records for this class
      .map((a) => ({
        studentId: String(a.studentId),
        name: studentsById[String(a.studentId)].name,
        grade: studentsById[String(a.studentId)].grade,
        day: Number(a.day),
        date: a.date,
        status: a.status || (a.present ? "P" : "A"),
      }));

    return NextResponse.json(flat);
  } catch (err) {
    console.error("❌ GET /api/attendance/flat error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}