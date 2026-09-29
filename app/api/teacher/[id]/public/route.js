import { NextResponse } from "next/server";
import { getDb } from "@/utils";

// ─────────────────────────────────────────────
// GET — public teacher info (accessible via the share link)
//
// Called like: /api/teacher/<publicToken>/public
// Returns: { teacher, students }
//   - teacher: name, subject, classes, qualification
//   - students: all students in the teacher's assigned classes
//     (needed by the public page so the teacher can mark
//      attendance / enter test & exam marks for their classes)
//
// No authentication required — the token itself is the key.
// ─────────────────────────────────────────────
export async function GET(req, { params }) {
  try {
    const { id } = params;
    const db = await getDb();

    // Find teacher by publicToken
    const teacher = await db.collection("teachers").findOne({ publicToken: id });
    if (!teacher) {
      return NextResponse.json({ error: "Invalid link" }, { status: 404 });
    }

    if (teacher.status && teacher.status.toLowerCase() !== "active") {
      return NextResponse.json({ error: "Teacher is inactive" }, { status: 403 });
    }

    // Build the student filter from the teacher's assigned classes
    const classes = Array.isArray(teacher.classes) ? teacher.classes : [];
    const orClauses = classes
      .filter((c) => c && c.grade)
      .map((c) => ({
        grade: c.grade,
        ...(c.section ? { section: c.section } : {}),
      }));

    const studentFilter =
      orClauses.length > 0 ? { $or: orClauses } : { _id: null }; // empty = no students

    const students = await db
      .collection("students")
      .find(studentFilter)
      .sort({ grade: 1, section: 1, rollNo: 1 })
      .toArray();

    const formattedStudents = students.map((s) => ({
      ...s,
      _id: s._id.toString(),
    }));

    return NextResponse.json({
      teacher: {
        _id: teacher._id.toString(),
        teacherId: teacher.teacherId,
        name: teacher.name,
        subject: teacher.subject || "",
        qualification: teacher.qualification || "",
        classes: teacher.classes || [],
        phone: teacher.phone || "",
        status: teacher.status || "Active",
      },
      students: formattedStudents,
    });
  } catch (err) {
    console.error("❌ GET /api/teacher/[id]/public:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}