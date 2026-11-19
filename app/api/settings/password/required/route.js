import { NextResponse } from "next/server";
import getClientPromise from "@/utils/mongodb";
import { getCurrentSchool } from "@/utils/getCurrentSchool";

export async function GET() {
  try {
    const schoolResult = await getCurrentSchool();
    if (!schoolResult.success) {
      return NextResponse.json({ required: false });
    }
    const { schoolId } = schoolResult.school;

    const client = await getClientPromise();
    const db = client.db("school_db");
    const settings = await db
      .collection("school_settings")
      .findOne({ schoolId, key: "password" });

    return NextResponse.json({
      required: !!settings?.enabled && !!settings?.hash,
      schoolId,
    });
  } catch (err) {
    return NextResponse.json({ required: false, error: err.message });
  }
}