// app/api/settings/password/verify/route.js
import { NextResponse } from "next/server";
import {
  getSchoolSecurity,
  verifyPassword,
  createUnlockToken,
  setUnlockCookie,
} from "@/utils/schoolUnlock";

export async function POST(req) {
  try {
    const s = await getSchoolSecurity(req);
    if (s.error) return s.error;

    // Nothing to verify when protection is off
    if (!s.active) return NextResponse.json({ success: true });

    const { password } = await req.json();
    if (!verifyPassword(String(password || ""), s.record.hash)) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    const res = NextResponse.json({ success: true });
    setUnlockCookie(res, createUnlockToken(s.schoolId, s.record.hash));
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}