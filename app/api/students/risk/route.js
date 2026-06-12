import { NextResponse } from "next/server";
import { db } from "@/utils";
import { STUDENTS } from "@/utils/schema";

export async function GET() {
    try {
        const allStudents = await db.select().from(STUDENTS);
        
        // Filter risk students (handles both numbers and strings)
        const riskStudents = allStudents.filter(student => {
            const cgpa = parseFloat(student.cgpa) || 0;
            const gpa = parseFloat(student.gpa) || 0;
            return cgpa < 2.5 || gpa < 2.5;
        });

        const formattedStudents = riskStudents.map((student) => ({
            ...student,
            risk: "at-risk",
        }));

        return NextResponse.json({
            success: true,
            data: formattedStudents,
        });

    } catch (error) {
        console.error("❌ Risk API Error:", error.message);
        return NextResponse.json(
            { success: false, message: "Failed to fetch risk students" },
            { status: 500 }
        );
    }
}