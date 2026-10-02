import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server"

const OWNER_EMAIL = "jamshid804a@gmail.com"

// ⚠️ CHANGE THESE to match your real routes
const ACADEMY_PATHS = ["/academy", "/api/academy"]
const SCHOOL_HOME = "/dashboard"
const ACADEMY_HOME = "/academy"

// Paths that never go through the section check
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/api/auth",
  "/api/org",
  "/api/admin",
  "/api/payments",
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

function matches(pathname: string, list: string[]) {
  return list.some((p) => pathname === p || pathname.startsWith(p + "/"))
}

function deny(request: NextRequest, redirectTo: string, message: string) {
  // API calls get JSON 403, pages get a redirect
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ success: false, error: message }, { status: 403 })
  }
  return NextResponse.redirect(new URL(redirectTo, request.url))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Public paths
  if (matches(pathname, PUBLIC_PATHS)) return NextResponse.next()

  // 2. Logged-in user
  let user: any = null
  try {
    const { getUser } = getKindeServerSession()
    user = await getUser()
  } catch (err) {
    console.error("Middleware getUser error:", err)
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Not logged in: let Kinde / the page handle login
  if (!user?.email) return NextResponse.next()

  const email = String(user.email).toLowerCase().trim()

  // 3. Owner always passes
  if (email === OWNER_EMAIL.toLowerCase()) return NextResponse.next()

  // 4. Which section is being opened?
  const section: "school" | "academy" = matches(pathname, ACADEMY_PATHS)
    ? "academy"
    : "school"

  // 5. Ask the server for this user's section status
  let data: any
  try {
    const url = new URL("/api/auth/check-school", request.url)
    url.searchParams.set("email", email)
    url.searchParams.set("t", String(Date.now()))

    const res = await fetch(url.toString(), {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        "x-internal-secret": process.env.INTERNAL_API_SECRET || "",
      },
    })

    if (!res.ok) throw new Error("check-school status " + res.status)
    data = await res.json()
  } catch (err) {
    // FAIL CLOSED: if we can't verify, don't let them in
    console.error("Middleware check-school error:", err)
    return deny(request, "/no-access", "Could not verify access")
  }

  if (!data.success || !data.school) {
    return deny(request, "/no-access", "No access")
  }

  const { schoolActive, academyActive, package: pkg } = data.school

  // 6. Is the requested section active?
  const allowed = section === "academy" ? academyActive : schoolActive
  if (allowed) return NextResponse.next()

  // 7. Requested section is blocked. Is the OTHER one working?
  if (section === "school" && academyActive) {
    return deny(request, `${ACADEMY_HOME}?suspended=school`, "School section is suspended")
  }
  if (section === "academy" && schoolActive) {
    return deny(request, `${SCHOOL_HOME}?suspended=academy`, "Academy section is suspended")
  }

  // 8. Both blocked
  if (pkg === "academy" || pkg === "both") {
    return deny(request, "/dashboard/no-section", "Suspended")
  }
  return deny(request, "/payment-due", "Payment due")
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.svg|default-avatar.png).*)",
  ],
}