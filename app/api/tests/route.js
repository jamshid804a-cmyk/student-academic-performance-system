import { NextResponse } from "next/server";
import { getDb } from "@/utils";

// ✅ GET — fetch tests filtered by grade/section/session/month/testType
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const grade = searchParams.get("grade");
    const section = searchParams.get("section");
    const session = searchParams.get("session");
    const month = searchParams.get("month");
    const testType = searchParams.get("testType");

    const db = await getDb();

    const filter = {};
    if (grade) filter.grade = grade;
    if (section) filter.section = section;
    if (session) filter.session = session;
    if (month) filter.month = month;
    if (testType) filter.testType = testType;

    const tests = await db.collection("tests").find(filter).toArray();

    return NextResponse.json(
      tests.map((t) => ({ ...t, id: t._id.toString(), _id: undefined }))
    );
  } catch (err) {
    console.error("❌ GET /api/tests:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ✅ POST — save/update marks for one student for one subject
export async function POST(req) {
  try {
    const data = await req.json();
    const {
      studentId,
      grade,
      section,
      session,
      month,
      testType,
      subject,
      marks,
      totalMarks = 100,
    } = data;

    if (!studentId || !subject || !month || !testType) {
      return NextResponse.json(
        { error: "studentId, subject, month and testType required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const collection = db.collection("tests");

    const filter = {
      studentId: String(studentId),
      subject,
      month,
      testType,
    };

    // If marks are empty → remove the record
    if (marks === null || marks === undefined || marks === "") {
      await collection.deleteOne(filter);
      return NextResponse.json({ success: true, cleared: true });
    }

    const numericMarks = Number(marks);

    await collection.updateOne(
      filter,
      {
        $set: {
          ...filter,
          grade,
          section,
          session,
          marks: numericMarks,
          totalMarks: Number(totalMarks),
          percentage: Math.round((numericMarks / Number(totalMarks)) * 100),
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ POST /api/tests:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}