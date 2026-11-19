import { NextResponse } from "next/server";
import getClientPromise from "@/utils/mongodb";
import { getCurrentSchool } from "@/utils/getCurrentSchool";

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
      hasPassword: !!record?.hash,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — enable / disable password protection
// body: { enabled: boolean }
// When disabled → wipes hash entirely (fresh start next time)
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

    if (!enabled) {
      // ✅ Disable + remove password completely
      await db.collection("school_settings").updateOne(
        { schoolId, key: "password" },
        {
          $set: {
            schoolId,
            key: "password",
            enabled: false,
            hash: null,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );

      return NextResponse.json({
        success: true,
        enabled: false,
        passwordRemoved: true,
      });
    }

    // Enable — if no hash exists, that's fine (first time set)
    await db.collection("school_settings").updateOne(
      { schoolId, key: "password" },
      {
        $set: {
          schoolId,
          key: "password",
          enabled: true,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true, enabled: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — explicit remove password (same effect as disabling)
export async function DELETE() {
  try {
    const schoolResult = await getCurrentSchool();
    if (!schoolResult.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { schoolId } = schoolResult.school;

    const client = await getClientPromise();
    const db = client.db("school_db");

    await db.collection("school_settings").deleteOne({
      schoolId,
      key: "password",
    });

    return NextResponse.json({ success: true, passwordRemoved: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}