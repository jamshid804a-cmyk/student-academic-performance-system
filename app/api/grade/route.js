import { db } from "@/utils";
import { GRADES } from "@/utils/schema";
import { NextResponse } from "next/server";

const DEFAULT_GRADES = [
    { grade: "1st Semester" },
    { grade: "2nd Semester" },
    { grade: "3rd Semester" },
    { grade: "4th Semester" },
    { grade: "5th Semester" },
    { grade: "6th Semester" },
    { grade: "7th Semester" },
    { grade: "8th Semester" },
];

export async function GET() {
    try {
        const result = await db.select().from(GRADES);

        // ✅ If DB is empty, insert default grades first then return
        if (!result || result.length === 0) {
            await db.insert(GRADES).values(DEFAULT_GRADES);
            const seeded = await db.select().from(GRADES);
            return NextResponse.json(seeded);
        }

        return NextResponse.json(result);

    } catch (error) {
        console.error("GRADE API ERROR:", error);
        return NextResponse.json(
            { error: "Failed to fetch grades" },
            { status: 500 }
        );
    }
}

export async function POST(req) {
    try {
        const { grade } = await req.json();

        if (!grade) {
            return NextResponse.json(
                { error: "Grade is required" },
                { status: 400 }
            );
        }

        const result = await db.insert(GRADES).values({ grade });
        return NextResponse.json(result);

    } catch (error) {
        console.error("GRADE POST ERROR:", error);
        return NextResponse.json(
            { error: "Failed to add grade" },
            { status: 500 }
        );
    }
}