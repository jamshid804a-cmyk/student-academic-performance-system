import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server"

const OWNER_EMAIL = "jamshid804a@gmail.com"

const PUBLIC_PATHS = [
  "/", "/login", "/register", "/api/auth", "/payment-due", "/no-access",
  "/_next", "/favicon.ico", "/logo.svg", "/default-avatar.png", "/teacher",
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
  } catch { return NextResponse.next() }

  if (!user?.email) return NextResponse.next()

  const email = String(user.email).toLowerCase().trim()
  if (email === OWNER_EMAIL.toLowerCase()) return NextResponse.next()

  try {
    const url = new URL("/api/auth/check-school", request.url)
    url.searchParams.set("email", email)
    const res = await fetch(url.toString(), {
      headers: { "x-middleware-check": "1" },
      cache: "no-store",
    })
    if (!res.ok) return NextResponse.redirect(new URL("/no-access", request.url))
    const data = await res.json()
    if (!data.success || !data.school)
      return NextResponse.redirect(new URL("/no-access", request.url))
    if (data.school.active === false)
      return NextResponse.redirect(new URL("/payment-due", request.url))
    return NextResponse.next()
  } catch (err) {
    console.error("Middleware error:", err)
    return NextResponse.next()
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.svg|default-avatar.png).*)"],
}