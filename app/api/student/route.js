import { NextResponse } from "next/server";
import { getDb } from "@/utils";
import { ObjectId } from "mongodb";

// ✅ GET - Fetch all students
export async function GET() {
    try {
        const db = await getDb();
        const students = await db.collection("students").find({}).toArray();

        // Convert MongoDB _id to id for frontend compatibility
        const formatted = students.map((s) => ({
            ...s,
            id: s._id.toString(),
            _id: undefined,
        }));

        return NextResponse.json(formatted);
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

        if (!data.name || !data.grade) {
            return NextResponse.json(
                { error: "Name and Grade are required" },
                { status: 400 }
            );
        }

        const db = await getDb();

        const newStudent = {
            name: data.name,
            grade: data.grade,
            address: data.address || "",
            contact: data.contact || "",
            fatherName: data.fatherName || null,
            admissionNo: data.admissionNo || null,
            section: data.section || null,
            rollNo: data.rollNo ? Number(data.rollNo) : null,
            session: data.session || null,
            fee: data.fee ? Number(data.fee) : 0,
            midMarks: Number(data.midMarks) || 0,
            finalMarks: Number(data.finalMarks) || 0,
            gpa: String(data.gpa || "0"),
            cgpa: String(data.cgpa || "0"),
            risk: data.risk || "safe",
            createdAt: new Date(),
        };

        const result = await db.collection("students").insertOne(newStudent);

        console.log("✅ Student added:", data.name);

        return NextResponse.json({
            success: true,
            id: result.insertedId.toString(),
        });

    } catch (err) {
        console.error("❌ POST /api/student error:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ✅ DELETE - Remove a student
export async function DELETE(req) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "Student id is required" },
                { status: 400 }
            );
        }

        const db = await getDb();

        // Try MongoDB ObjectId first
        let result;
        try {
            result = await db.collection("students").deleteOne({
                _id: new ObjectId(id),
            });
        } catch {
            // Fallback: maybe id is a number or a custom id field
            result = await db.collection("students").deleteOne({
                id: id,
            });
        }

        return NextResponse.json({ success: true, result });
    } catch (err) {
        console.error("❌ DELETE /api/student error:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}