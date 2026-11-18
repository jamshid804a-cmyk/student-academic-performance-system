import { NextResponse } from "next/server";
import getClientPromise from "@/utils/mongodb";
import { getCurrentSchool } from "@/utils/getCurrentSchool";
import bcrypt from "bcryptjs"; // run: npm i bcryptjs

// GET — is password enabled for this school?
export async function GET() {
  try {
    const schoolResult = await getCurrentSchool();
    if (!schoolResult.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { schoolId } = schoolResult.school;

    const client = await getClientPromise();
    const db = client.db("school_db");
    const record = await db
      .collection("school_settings")
      .findOne({ schoolId, key: "password" });

    return NextResponse.json({
      schoolId,
      passwordEnabled: !!record?.enabled,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — enable/disable password protection
export async function POST(req) {
  try {
    const schoolResult = await getCurrentSchool();
    if (!schoolResult.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { schoolId } = schoolResult.school;
    const { enabled } = await req.json();

    const client = await getClientPromise();
    const db = client.db("school_db");

    await db.collection("school_settings").updateOne(
      { schoolId, key: "password" },
      {
        $set: {
          schoolId,
          key: "password",
          enabled: !!enabled,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true, enabled: !!enabled });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}