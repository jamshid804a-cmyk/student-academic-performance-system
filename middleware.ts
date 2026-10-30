import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server"

const OWNER_EMAIL = "jamshid804a@gmail.com".toLowerCase().trim()

// Paths that must work WITHOUT login.
// Public teacher-link pages (/teacher/<token>/...) and their API routes (/api/teacher/<token>/...)
// are intentionally public: the token itself is the secret.
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/no-access",
  "/payment-due",
  "/api/auth",
  "/api/org",
  "/api/admin",
  "/api/teacher",
  "/api/teacher-public",
  "/teacher",
  "/admin",
  "/_next",
  "/favicon.ico",
  "/logo.svg",
  "/default-avatar.png",
]

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1) Public assets, teacher links, admin setup, auth callbacks
  if (isPublicPath(pathname)) return NextResponse.next()

  // 2) Fetch the session
  let user: any = null
  try {
    const { getUser } = getKindeServerSession()
    user = await getUser()
  } catch (err) {
    console.error("Middleware getUser error:", err)
    return NextResponse.next()
  }

  // 3) Not logged in → redirect to Kinde login
  //    (previously this was `next()` — that let anonymous users into /dashboard)
  if (!user?.email) {
    const loginUrl = new URL("/api/auth/login", request.url)
    loginUrl.searchParams.set("post_login_redirect_url", pathname)
    return NextResponse.redirect(loginUrl)
  }

  const email = String(user.email).toLowerCase().trim()

  // 4) Owner always passes
  if (email === OWNER_EMAIL) return NextResponse.next()

  // 5) Everyone else: verify the school record
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

    if (data.school.active === true) return NextResponse.next()

    return NextResponse.redirect(new URL("/no-access", request.url))
  } catch (err) {
    console.error("Middleware check-school error:", err)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.svg|default-avatar.png).*)",
  ],
}