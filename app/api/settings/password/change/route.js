// app/api/settings/password/change/route.js
import { NextResponse } from "next/server";
import {
  getSchoolSecurity,
  verifyPassword,
  hashPassword,
  createUnlockToken,
  setUnlockCookie,
} from "@/utils/schoolUnlock";

export async function POST(req) {
  try {
    const s = await getSchoolSecurity(req);
    if (s.error) return s.error;

    if (!s.active) {
      return NextResponse.json(
        { error: "Password protection is not enabled" },
        { status: 400 }
      );
    }
    if (!s.unlocked) {
      return NextResponse.json({ error: "School is locked" }, { status: 403 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!verifyPassword(String(currentPassword || ""), s.record.hash)) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }
    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters" },
        { status: 400 }
      );
    }
    if (newPassword === currentPassword) {
      return NextResponse.json(
        { error: "New password must be different" },
        { status: 400 }
      );
    }

    const hash = hashPassword(newPassword);
    await s.db
      .collection("school_settings")
      .updateOne(
        { schoolId: s.schoolId, key: "password" },
        { $set: { hash, updatedAt: new Date() } }
      );

    // Old unlock cookies are now invalid; give this browser a fresh one
    const res = NextResponse.json({ success: true });
    setUnlockCookie(res, createUnlockToken(s.schoolId, hash));
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}