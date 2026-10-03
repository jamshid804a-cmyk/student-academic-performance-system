import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server"

const OWNER_EMAIL = "jamshid804a@gmail.com"

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/api/auth",
  "/api/org",
  "/api/admin",
  "/no-access",
  "/payment-due",
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

  if (isPublicPath(pathname)) return NextResponse.next()

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

  if (email === OWNER_EMAIL.toLowerCase()) return NextResponse.next()

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

    if (!res.ok) return NextResponse.next()

    const data = await res.json()

    if (!data.success || !data.school) {
      return NextResponse.redirect(new URL("/no-access", request.url))
    }

    // Any active section → pass through
    if (data.school.active === true) return NextResponse.next()

    // Nothing active → send to /no-access
    return NextResponse.redirect(new URL("/no-access", request.url))
  } catch (err) {
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.svg|default-avatar.png).*)",
  ],
}