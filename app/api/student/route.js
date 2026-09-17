import { NextResponse } from "next/server";
import { db } from "@/utils";
import { STUDENTS, ATTENDANCE } from "@/utils/schema";
import { eq, sql } from "drizzle-orm";

// ✅ GET - Fetch all students
export async function GET() {
    try {
        const students = await db.select().from(STUDENTS);
        return NextResponse.json(students);
    } catch (err) {
        console.error("❌ GET /api/student error:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ✅ POST - Add a new student
export async function POST(req) {
    try {
        const data = await req.json();
        console.log("Received student data:", data);

        // Make sure name exists (required field)
        if (!data.name || !data.grade) {
            return NextResponse.json(
                { error: "Name and Grade are required" },
                { status: 400 }
            );
        }

        // Convert numeric fields safely
        const gpa = parseFloat(data.gpa) || 0;
        const cgpa = parseFloat(data.cgpa) || 0;
        const midMarks = parseFloat(data.midMarks) || 0;
        const finalMarks = parseFloat(data.finalMarks) || 0;

        const result = await db.insert(STUDENTS).values({
            name: data.name,
            grade: data.grade,
            address: data.address || "",
            contact: data.contact || "",
            midMarks: midMarks,
            finalMarks: finalMarks,
            gpa: gpa,
            cgpa: cgpa,
            risk: data.risk || "safe",
        });

        console.log("✅ Student added successfully:", data.name);
        return NextResponse.json({ success: true, result });

    } catch (err) {
        console.error("❌ POST /api/student error:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ✅ DELETE - Remove a student
export async function DELETE(req) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const id = searchParams.get('id');

        const result = await db.delete(STUDENTS)
            .where(eq(STUDENTS.id, Number(id)));

        // If all students deleted, reset auto-increment
        const remaining = await db.select().from(STUDENTS);
        if (remaining.length === 0) {
            await db.execute(sql`ALTER TABLE students AUTO_INCREMENT = 1`);
            await db.execute(sql`ALTER TABLE attendance AUTO_INCREMENT = 1`);
            console.log("✅ Auto increment reset to 1");
        }

        return NextResponse.json({ success: true, result });
    } catch (err) {
        console.error("❌ DELETE /api/student error:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}