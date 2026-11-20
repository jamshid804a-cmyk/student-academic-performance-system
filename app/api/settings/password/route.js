// app/api/settings/password/route.js
import { NextResponse } from "next/server";
import {
  getSchoolSecurity,
  hasValidHash,
  hashPassword,
  createUnlockToken,
  setUnlockCookie,
  clearUnlockCookie,
} from "@/utils/schoolUnlock";

// GET — current security state for this school
export async function GET(req) {
  try {
    const s = await getSchoolSecurity(req);
    if (s.error) return s.error;

    return NextResponse.json({
      schoolId: s.schoolId,
      passwordEnabled: !!s.record?.enabled,
      hasPassword: hasValidHash(s.record),
      required: s.active,
      unlocked: s.unlocked,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST
//   enable : { enabled: true,  password: "min 8 chars" }  (password is REQUIRED)
//   disable: { enabled: false }
// Once protection is active, changing it requires a valid unlock cookie.
export async function POST(req) {
  try {
    const s = await getSchoolSecurity(req);
    if (s.error) return s.error;

    if (s.active && !s.unlocked) {
      return NextResponse.json({ error: "School is locked" }, { status: 403 });
    }

    const { enabled, password } = await req.json();
    const coll = s.db.collection("school_settings");

    if (!enabled) {
      await coll.updateOne(
        { schoolId: s.schoolId, key: "password" },
        {
          $set: {
            schoolId: s.schoolId,
            key: "password",
            enabled: false,
            hash: null,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );
      const res = NextResponse.json({ success: true, enabled: false });
      clearUnlockCookie(res);
      return res;
    }

    // Enabling needs a password — this is the "first time set" step
    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const hash = hashPassword(password);
    await coll.updateOne(
      { schoolId: s.schoolId, key: "password" },
      {
        $set: {
          schoolId: s.schoolId,
          key: "password",
          enabled: true,
          hash,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );

    // The person who just set the password stays unlocked
    const res = NextResponse.json({ success: true, enabled: true });
    setUnlockCookie(res, createUnlockToken(s.schoolId, hash));
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — remove password completely
export async function DELETE(req) {
  try {
    const s = await getSchoolSecurity(req);
    if (s.error) return s.error;

    if (s.active && !s.unlocked) {
      return NextResponse.json({ error: "School is locked" }, { status: 403 });
    }

    await s.db
      .collection("school_settings")
      .deleteOne({ schoolId: s.schoolId, key: "password" });

    const res = NextResponse.json({ success: true, passwordRemoved: true });
    clearUnlockCookie(res);
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}