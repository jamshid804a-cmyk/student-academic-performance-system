import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server"

const OWNER_EMAIL = "jamshid804a@gmail.com"

// Paths that never go through the school check
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/api/auth",         // includes /api/auth/check-school
  "/payment-due",
  "/no-access",
  "/_next",
  "/favicon.ico",
  "/logo.svg",
  "/default-avatar.png",
  "/teacher",          // teacher public links
  "/admin",            // admin dashboard — protected by app/admin/layout.js
]

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Public paths — skip the school check
  if (isPublicPath(pathname)) return NextResponse.next()

  // 2. Get the logged-in user
  let user: any = null
  try {
    const { getUser } = getKindeServerSession()
    user = await getUser()
  } catch (err) {
    // Don't treat a Kinde hiccup as "logged out" — let the page handle it
    console.error("Middleware getUser error:", err)
    return NextResponse.next()
  }

  // Not logged in — let the page's own auth guard redirect
  if (!user?.email) return NextResponse.next()

  const email = String(user.email).toLowerCase().trim()

  // 3. Owner always passes
  if (email === OWNER_EMAIL.toLowerCase()) return NextResponse.next()

  // 4. Look up the user's school
  try {
    const url = new URL("/api/auth/check-school", request.url)
    url.searchParams.set("email", email)

    const res = await fetch(url.toString(), {
      cache: "no-store",
    })

    if (!res.ok) {
      // API error — don't punish the user, let the page decide
      console.error("check-school failed with status", res.status)
      return NextResponse.next()
    }

    const data = await res.json()

    // No school found
    if (!data.success || !data.school) {
      return NextResponse.redirect(new URL("/no-access", request.url))
    }

    // School suspended
    if (data.school.active === false) {
      return NextResponse.redirect(new URL("/payment-due", request.url))
    }

    return NextResponse.next()
  } catch (err) {
    console.error("Middleware error:", err)
    // Fail open — page handles its own auth
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.svg|default-avatar.png).*)",
  ],
}