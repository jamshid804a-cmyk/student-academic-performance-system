import { NextResponse } from "next/server";
import getClientPromise from "@/utils/mongodb";
import { getCurrentSchool } from "@/utils/getCurrentSchool";

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("key") !== "cleanup2026") {
      return NextResponse.json(
        { error: "Provide ?key=cleanup2026" },
        { status: 401 }
      );
    }

    const schoolResult = await getCurrentSchool();
    if (!schoolResult.success) {
      return NextResponse.json(
        { error: schoolResult.error || "Unauthorized" },
        { status: 401 }
      );
    }
    const { schoolId } = schoolResult.school;

    const client = await getClientPromise();
    const db = client.db("school_db");

    const collections = [
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
    ];

    const deleted = {};
    for (const name of collections) {
      const res = await db.collection(name).deleteMany({ schoolId });
      deleted[name] = res.deletedCount;
    }

    return NextResponse.json({
      success: true,
      schoolId,
      deleted,
      message: "Non-student collections cleared. Students kept.",
    });
  } catch (e) {
    console.error("cleanup error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}