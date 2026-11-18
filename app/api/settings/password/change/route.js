import { NextResponse } from "next/server";
import getClientPromise from "@/utils/mongodb";
import { getCurrentSchool } from "@/utils/getCurrentSchool";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    const schoolResult = await getCurrentSchool();
    if (!schoolResult.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { schoolId } = schoolResult.school;
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Both current and new password are required" },
        { status: 400 }
      );
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const client = await getClientPromise();
    const db = client.db("school_db");
    const settings = await db
      .collection("school_settings")
      .findOne({ schoolId, key: "password" });

    // If password already set, verify current
    if (settings?.hash) {
      const ok = await bcrypt.compare(currentPassword, settings.hash);
      if (!ok) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 401 }
        );
      }
    }

    const hash = await bcrypt.hash(newPassword, 10);

    await db.collection("school_settings").updateOne(
      { schoolId, key: "password" },
      {
        $set: {
          schoolId,
          key: "password",
          enabled: true,
          hash,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}