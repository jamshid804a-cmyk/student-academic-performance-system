import { NextResponse } from "next/server";
import { getDb } from "@/utils";

export async function POST(request) {
  try {
    const { phone, password } = await request.json();

    if (!phone || !password) {
      return NextResponse.json({ error: "Phone and password required" }, { status: 400 });
    }

    const db = await getDb();

    // Find student by contact number
    const student = await db.collection("students").findOne({ contact: phone });

    if (!student) {
      return NextResponse.json({ error: "No student found with this number" }, { status: 401 });
    }

    const studentId = student._id.toString();

    // Check parent exists
    const existingParent = await db.collection("parents").findOne({ studentId });

    if (!existingParent) {
      await db.collection("parents").insertOne({
        phone,
        password,
        studentId,
        createdAt: new Date(),
      });
      console.log("✅ Parent saved");
    }

    return NextResponse.json({
      success: true,
      parentId: studentId,
      studentId,
      studentName: student.name,
      studentGrade: student.grade,
      phone: student.contact,
    });
  } catch (error) {
    console.error("❌ Parent login error:", error.message);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}