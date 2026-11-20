// app/api/settings/password/required/route.js
import { NextResponse } from "next/server";
import { getSchoolSecurity } from "@/utils/schoolUnlock";

export async function GET(req) {
  try {
    const s = await getSchoolSecurity(req);
    if (s.error) return s.error;

    return NextResponse.json({
      schoolId: s.schoolId,
      required: s.active,
      unlocked: s.unlocked,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}