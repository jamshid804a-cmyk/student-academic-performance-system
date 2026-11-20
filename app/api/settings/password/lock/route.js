// app/api/settings/password/lock/route.js
// Point your Logout button to /api/settings/password/lock
import { NextResponse } from "next/server";
import { clearUnlockCookie } from "@/utils/schoolUnlock";

export async function GET(req) {
  const res = NextResponse.redirect(new URL("/api/auth/logout", req.url));
  clearUnlockCookie(res);
  return res;
}