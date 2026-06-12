import { NextResponse } from "next/server";
import { db } from "@/utils";
import { STUDENTS, PARENTS } from "@/utils/schema";
import { eq } from "drizzle-orm";

export async function POST(request) {
  try {
    const { phone, password } = await request.json();

    if (!phone || !password) {
      return NextResponse.json(
        { error: "Phone and password required" },
        { status: 400 }
      );
    }

    // Find student by contact number
    const students = await db
      .select()
      .from(STUDENTS)
      .where(eq(STUDENTS.contact, phone));

    if (students.length === 0) {
      return NextResponse.json(
        { error: "No student found with this number" },
        { status: 401 }
      );
    }

    const student = students[0];

    // ✅ Check if parent already exists
    const existingParent = await db
      .select()
      .from(PARENTS)
      .where(eq(PARENTS.studentId, student.id));

    // ✅ Save parent if not already saved
    if (existingParent.length === 0) {
      await db.insert(PARENTS).values({
        phone: phone,
        password: password,
        studentId: student.id,
      });
      console.log("✅ Parent saved to database");
    }

    return NextResponse.json({
      success: true,
      parentId: student.id,
      studentId: student.id,
      studentName: student.name,
      studentGrade: student.grade,
      phone: student.contact,
    });

  } catch (error) {
    console.error("❌ Login Error:", error.message);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}