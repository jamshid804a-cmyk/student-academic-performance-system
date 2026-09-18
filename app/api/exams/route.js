import { NextResponse } from "next/server";
import { getDb } from "@/utils";

// ✅ GET — fetch exam records filtered by grade/section/session/month/examType
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const grade = searchParams.get("grade");
    const section = searchParams.get("section");
    const session = searchParams.get("session");
    const month = searchParams.get("month");
    const examType = searchParams.get("examType");

    const db = await getDb();

    const filter = {};
    if (grade) filter.grade = grade;
    if (section) filter.section = section;
    if (session) filter.session = session;
    if (month) filter.month = month;
    if (examType) filter.examType = examType;

    const exams = await db.collection("exams").find(filter).toArray();

    return NextResponse.json(
      exams.map((e) => ({ ...e, id: e._id.toString(), _id: undefined }))
    );
  } catch (err) {
    console.error("❌ GET /api/exams:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ✅ POST — save/update one subject's exam marks for one student
export async function POST(req) {
  try {
    const data = await req.json();
    const {
      studentId,
      grade,
      section,
      session,
      month,
      examType,
      subject,
      obtained,
      total,
    } = data;

    if (!studentId || !subject || !month || !examType) {
      return NextResponse.json(
        { error: "studentId, subject, month and examType required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const collection = db.collection("exams");

    const filter = {
      studentId: String(studentId),
      subject,
      month,
      examType,
    };

    // If both obtained and total are empty → delete
    if (
      (obtained === null || obtained === undefined || obtained === "") &&
      (total === null || total === undefined || total === "")
    ) {
      await collection.deleteOne(filter);
      return NextResponse.json({ success: true, cleared: true });
    }

    const obt = obtained === "" || obtained === null || obtained === undefined ? 0 : Number(obtained);
    const tot = total === "" || total === null || total === undefined ? 0 : Number(total);

    const percentage = tot > 0 ? Math.round((obt / tot) * 100) : 0;

    await collection.updateOne(
      filter,
      {
        $set: {
          ...filter,
          grade,
          section,
          session,
          obtained: obt,
          total: tot,
          percentage,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ POST /api/exams:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}