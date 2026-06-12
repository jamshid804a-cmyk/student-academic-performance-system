import { db } from "@/utils";
import { ATTENDANCE, STUDENTS } from "@/utils/schema";
import { eq, and, like, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(req) {
    try {
        const searchParams = new URL(req.url).searchParams;

        const grade = searchParams.get("grade");
        const month = searchParams.get("month");

        if (!grade || !month) {
            return NextResponse.json(
                { error: "grade and month are required" },
                { status: 400 }
            );
        }

        const students = await db
            .select()
            .from(STUDENTS)
            .where(eq(STUDENTS.grade, grade));

        const attendance = await db
            .select()
            .from(ATTENDANCE)
            .where(like(ATTENDANCE.date, "%" + month + "%"));

        const attendanceMap = new Map();

        attendance.forEach((a) => {
            const sid = Number(a.studentId);

            if (!attendanceMap.has(sid)) {
                attendanceMap.set(sid, []);
            }

            attendanceMap.get(sid).push(a);
        });

        const result = students.flatMap((student) => {
            const studentAttendance =
                attendanceMap.get(Number(student.id));

            if (
                studentAttendance &&
                studentAttendance.length > 0
            ) {
                return studentAttendance.map((a) => ({
                    name: student.name,

                    present:
                        a.present === 1 ||
                        a.present === true ||
                        a.present === "1",

                    day: Number(a.day),

                    date: a.date,

                    grade: student.grade,

                    studentId: Number(student.id),
                }));
            }

            return [
                {
                    name: student.name,
                    present: false,
                    day: null,
                    date: null,
                    grade: student.grade,
                    studentId: Number(student.id),
                },
            ];
        });

        return NextResponse.json(result);

    } catch (err) {

        console.error(
            "GET /api/attendance error:",
            err.message
        );

        return NextResponse.json(
            { error: err.message },
            { status: 500 }
        );
    }
}

export async function POST(req) {
    try {

        const data = await req.json();

        if (
            !data.studentId ||
            !data.day ||
            !data.date
        ) {
            return NextResponse.json(
                {
                    error:
                        "studentId, day and date are required",
                },
                { status: 400 }
            );
        }

        const existing = await db
            .select()
            .from(ATTENDANCE)
            .where(
                and(
                    eq(
                        ATTENDANCE.studentId,
                        Number(data.studentId)
                    ),

                    eq(
                        ATTENDANCE.day,
                        Number(data.day)
                    ),

                    eq(
                        ATTENDANCE.date,
                        data.date
                    )
                )
            );

        // ✅ Update existing record
        if (existing.length > 0) {

            const result = await db
                .update(ATTENDANCE)
                .set({
                    present: data.present ? 1 : 0,
                })
                .where(
                    and(
                        eq(
                            ATTENDANCE.studentId,
                            Number(data.studentId)
                        ),

                        eq(
                            ATTENDANCE.day,
                            Number(data.day)
                        ),

                        eq(
                            ATTENDANCE.date,
                            data.date
                        )
                    )
                );

            return NextResponse.json(result);
        }

        // ✅ Insert new record
        const result = await db
            .insert(ATTENDANCE)
            .values({
                studentId: Number(data.studentId),

                day: Number(data.day),

                date: data.date,

                present: data.present ? 1 : 0,
            });

        return NextResponse.json(result);

    } catch (err) {

        console.error(
            "POST /api/attendance error:",
            err.message
        );

        return NextResponse.json(
            { error: err.message },
            { status: 500 }
        );
    }
}

export async function DELETE(req) {
    try {

        const searchParams = new URL(req.url).searchParams;

        const studentId =
            searchParams.get("studentId");

        const day =
            searchParams.get("day");

        const month =
            searchParams.get("month");

        if (!studentId || !day || !month) {

            return NextResponse.json(
                {
                    error:
                        "studentId, day and month are required",
                },
                { status: 400 }
            );
        }

        // ✅ Delete attendance record
        await db
            .delete(ATTENDANCE)
            .where(
                and(
                    eq(
                        ATTENDANCE.studentId,
                        Number(studentId)
                    ),

                    eq(
                        ATTENDANCE.day,
                        Number(day)
                    ),

                    eq(
                        ATTENDANCE.date,
                        month
                    )
                )
            );

        // ✅ Check remaining rows
        const remaining = await db
            .select()
            .from(ATTENDANCE);

        // ✅ Reset ID permanently when table empty
        if (remaining.length === 0) {

            await db.execute(
                sql`TRUNCATE TABLE attendance`
            );

            console.log(
                "✅ Attendance table reset successfully"
            );
        }

        return NextResponse.json({
            success: true,
        });

    } catch (err) {

        console.error(
            "DELETE /api/attendance error:",
            err.message
        );

        return NextResponse.json(
            { error: err.message },
            { status: 500 }
        );
    }
}