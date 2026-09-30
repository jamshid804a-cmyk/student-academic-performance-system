import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server"

const OWNER_EMAIL = "jamshid804a@gmail.com"

// Paths that never go through the school check
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/api/auth",
  "/payment-due",
  "/no-access",
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

  // 4. Look up the user's school — force a fresh response every time
  try {
    const url = new URL("/api/auth/check-school", request.url)
    url.searchParams.set("email", email)
    // Cache-buster so Vercel never serves a stale response
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

    if (data.school.active === false) {
      return NextResponse.redirect(new URL("/payment-due", request.url))
    }

    return NextResponse.next()
  } catch (err) {
    console.error("Middleware error:", err)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.svg|default-avatar.png).*)",
  ],
}