import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server"

const OWNER_EMAIL = "jamshid804a@gmail.com"

// Paths that never go through the school check
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/api/auth",             // includes /api/auth/check-school
  "/api/org",              // includes /api/org/sections  ← NEW
  "/api/admin",            // admin APIs — owner-only, checked inside the route  ← NEW
  "/api/payments",         // payment submission  ← NEW
  "/payment-due",
  "/no-access",
  "/dashboard/no-section",
  "/dashboard/pay",
  "/_next",
  "/favicon.ico",
  "/logo.svg",
  "/default-avatar.png",
  "/teacher",
  "/admin",
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
    console.error("Middleware getUser error:", err)
    return NextResponse.next()
  }

  if (!user?.email) return NextResponse.next()

  const email = String(user.email).toLowerCase().trim()

  // 3. Owner always passes
  if (email === OWNER_EMAIL.toLowerCase()) return NextResponse.next()

  // 4. Check the school's section status
  try {
    const url = new URL("/api/auth/check-school", request.url)
    url.searchParams.set("email", email)
    url.searchParams.set("t", String(Date.now()))

    const res = await fetch(url.toString(), {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    })

    if (!res.ok) {
      console.error("check-school failed with status", res.status)
      return NextResponse.next()
    }

    const data = await res.json()

    if (!data.success || !data.school) {
      return NextResponse.redirect(new URL("/no-access", request.url))
    }

    // If any section is active → allow through
    if (data.school.active === true) {
      return NextResponse.next()
    }

    // Nothing active → route based on package
    const pkg = data.school.package || "school"

    if (pkg === "academy" || pkg === "both") {
      return NextResponse.redirect(new URL("/dashboard/no-section", request.url))
    }

    // School-only orgs → old payment-due page
    return NextResponse.redirect(new URL("/payment-due", request.url))
  } catch (err) {
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.svg|default-avatar.png).*)",
  ],
}