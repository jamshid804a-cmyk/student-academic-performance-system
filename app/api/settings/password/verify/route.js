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
    const { password } = await req.json();

    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    const client = await getClientPromise();
    const db = client.db("school_db");
    const settings = await db
      .collection("school_settings")
      .findOne({ schoolId, key: "password" });

    if (!settings?.enabled) {
      return NextResponse.json({ success: true, bypass: true });
    }

    if (!settings.hash) {
      return NextResponse.json(
        { error: "Password not set. Contact admin." },
        { status: 500 }
      );
    }

    const ok = await bcrypt.compare(password, settings.hash);
    if (!ok) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}