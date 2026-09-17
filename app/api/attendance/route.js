import { NextResponse } from "next/server";
import { getDb } from "@/utils";

// GET — fetch students + attendance for a grade/month
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const grade = searchParams.get("grade");
    const month = searchParams.get("month");

    if (!grade || !month) {
      return NextResponse.json({ error: "grade and month are required" }, { status: 400 });
    }

    const db = await getDb();

    const students = await db.collection("students").find({ grade }).toArray();
    const attendance = await db
      .collection("attendance")
      .find({ date: { $regex: month } })
      .toArray();

    const attendanceMap = new Map();
    attendance.forEach((a) => {
      const sid = String(a.studentId);
      if (!attendanceMap.has(sid)) attendanceMap.set(sid, []);
      attendanceMap.get(sid).push(a);
    });

    const result = students.flatMap((student) => {
      const sid = student._id.toString();
      const list = attendanceMap.get(sid);

      if (list && list.length > 0) {
        return list.map((a) => ({
          name: student.name,
          present: a.present === true || a.present === 1 || a.present === "1",
          day: Number(a.day),
          date: a.date,
          grade: student.grade,
          studentId: sid,
        }));
      }

      return [{
        name: student.name,
        present: false,
        day: null,
        date: null,
        grade: student.grade,
        studentId: sid,
      }];
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("❌ GET /api/attendance:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — mark attendance
export async function POST(req) {
  try {
    const data = await req.json();

    if (!data.studentId || !data.day || !data.date) {
      return NextResponse.json({ error: "studentId, day and date are required" }, { status: 400 });
    }

    const db = await getDb();
    const collection = db.collection("attendance");

    const filter = {
      studentId: String(data.studentId),
      day: Number(data.day),
      date: data.date,
    };

    const existing = await collection.findOne(filter);

    if (existing) {
      await collection.updateOne(filter, { $set: { present: !!data.present } });
      return NextResponse.json({ success: true, updated: true });
    }

    const result = await collection.insertOne({
      ...filter,
      present: !!data.present,
    });

    return NextResponse.json({ success: true, id: result.insertedId.toString() });
  } catch (err) {
    console.error("❌ POST /api/attendance:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — remove one attendance
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const day = searchParams.get("day");
    const month = searchParams.get("month");

    if (!studentId || !day || !month) {
      return NextResponse.json({ error: "studentId, day and month required" }, { status: 400 });
    }

    const db = await getDb();
    await db.collection("attendance").deleteOne({
      studentId: String(studentId),
      day: Number(day),
      date: month,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ DELETE /api/attendance:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}