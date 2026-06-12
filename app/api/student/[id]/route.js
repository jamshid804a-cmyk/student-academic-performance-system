import { NextResponse } from "next/server";
import { db } from "@/utils";
import { STUDENTS } from "@/utils/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Student ID required" },
        { status: 400 }
      );
    }

    const student = await db
      .select()
      .from(STUDENTS)
      .where(eq(STUDENTS.id, Number(id)));

    if (!student || student.length === 0) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(student[0]);

  } catch (error) {
    console.error("❌ GET /api/student/[id] error:", error.message);
    return NextResponse.json(
      { success: false, message: "Server error", error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Student ID required" },
        { status: 400 }
      );
    }

    await db.delete(STUDENTS).where(eq(STUDENTS.id, Number(id)));
    await db.execute(sql`ALTER TABLE students AUTO_INCREMENT = 1`);

    console.log(`✅ Student ${id} deleted, AUTO_INCREMENT reset`);

    return NextResponse.json({
      success: true,
      message: "Student deleted successfully",
    });

  } catch (error) {
    console.error("❌ DELETE /api/student/[id] error:", error.message);
    return NextResponse.json(
      { success: false, message: "Server error", error: error.message },
      { status: 500 }
    );
  }
}