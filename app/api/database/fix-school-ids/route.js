import { NextResponse } from "next/server";
import getClientPromise from "@/utils/mongodb";

export async function GET() {
  try {
    const client = await getClientPromise();
    const db = client.db("school_db");

    // 1. Students per school
    const studentsBySchool = await db.collection("students").aggregate([
      { $group: { _id: "$schoolId", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    // 2. Attendance per school
    const attendanceBySchool = await db.collection("attendance").aggregate([
      { $group: { _id: "$schoolId", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    // 3. Teacher attendance per school
    const teacherAttendanceBySchool = await db.collection("teacher_attendance").aggregate([
      { $group: { _id: "$schoolId", count: { $sum: 1 } } }
    ]).toArray();

    // 4. Fees per school
    const feesBySchool = await db.collection("fees").aggregate([
      { $group: { _id: "$schoolId", count: { $sum: 1 } } }
    ]).toArray();

    // 5. Student IDs referenced by test_school attendance
    const testSchoolAttendanceRefs = await db.collection("attendance")
      .distinct("studentId", { schoolId: "test_school" });

    // 6. Those students — what's their actual schoolId?
    const numericIds = testSchoolAttendanceRefs.map(Number).filter(n => !isNaN(n));
    const studentsReferenced = await db.collection("students").find({
      id: { $in: numericIds }
    }).toArray();

    return NextResponse.json({
      summary: {
        studentsBySchool,
        attendanceBySchool,
        teacherAttendanceBySchool,
        feesBySchool,
      },
      mismatch: {
        test_school_attendance_references_student_ids: testSchoolAttendanceRefs,
        those_students_actual_schoolIds: studentsReferenced.map(s => ({
          id: s.id,
          name: s.name,
          schoolId: s.schoolId,
          program: s.program,
        })),
        total_students_referenced: studentsReferenced.length,
        missing_students: numericIds.filter(id =>
          !studentsReferenced.find(s => s.id === id)
        ),
      },
    });
  } catch (e) {
    console.error("fix-school-ids failed:", e);
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
}