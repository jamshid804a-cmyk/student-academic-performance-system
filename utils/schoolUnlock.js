// utils/schoolUnlock.js
import crypto from "crypto";
import { NextResponse } from "next/server";
import getClientPromise from "@/utils/mongodb";
import { getCurrentSchool } from "@/utils/getCurrentSchool";

export const UNLOCK_COOKIE = "school_unlock";
const TTL_MS = 12 * 60 * 60 * 1000; // unlock lasts 12 hours

function secret() {
  const s = process.env.UNLOCK_SECRET;
  if (!s) throw new Error("UNLOCK_SECRET is not set in .env");
  return s;
}

/* ───────── password hashing (no extra npm package needed) ───────── */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function hasValidHash(record) {
  return typeof record?.hash === "string" && record.hash.startsWith("scrypt$");
}

export function verifyPassword(password, stored) {
  if (typeof stored !== "string") return false;
  const [alg, salt, hex] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hex) return false;
  const expected = Buffer.from(hex, "hex");
  const actual = crypto.scryptSync(password, salt, expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

/* ───────── signed unlock token (stored in an httpOnly cookie) ───────── */
const fingerprint = (hash) =>
  crypto.createHash("sha256").update(hash).digest("hex").slice(0, 16);

const sign = (payload) =>
  crypto.createHmac("sha256", secret()).update(payload).digest("base64url");

// The token is bound to the school AND to the current password hash,
// so changing or removing the password invalidates every old unlock.
export function createUnlockToken(schoolId, hash) {
  const payload = Buffer.from(
    JSON.stringify({ s: schoolId, f: fingerprint(hash), e: Date.now() + TTL_MS })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function isTokenValid(token, schoolId, hash) {
  try {
    if (!token || !hash) return false;
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return false;

    const expected = Buffer.from(sign(payload));
    const given = Buffer.from(sig);
    if (expected.length !== given.length) return false;
    if (!crypto.timingSafeEqual(expected, given)) return false;

    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.s === schoolId && data.f === fingerprint(hash) && data.e > Date.now();
  } catch {
    return false;
  }
}

export function setUnlockCookie(res, token) {
  res.cookies.set(UNLOCK_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_MS / 1000,
  });
}

export function clearUnlockCookie(res) {
  res.cookies.set(UNLOCK_COOKIE, "", { path: "/", maxAge: 0 });
}

/* ───────── one call that every password route uses ───────── */
export async function getSchoolSecurity(req) {
  const schoolResult = await getCurrentSchool();
  if (!schoolResult.success) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  const { schoolId } = schoolResult.school;

  const client = await getClientPromise();
  const db = client.db("school_db");
  const record = await db
    .collection("school_settings")
    .findOne({ schoolId, key: "password" });

  // Protection really applies only when it is enabled AND a valid password exists
  const active = !!record?.enabled && hasValidHash(record);
  const unlocked = active
    ? isTokenValid(req.cookies.get(UNLOCK_COOKIE)?.value, schoolId, record.hash)
    : true;

  return { schoolId, db, record, active, unlocked };
}