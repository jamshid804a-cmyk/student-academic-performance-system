import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server"
import { getDb } from "@/utils"

const OWNER_EMAIL = "jamshid804a@gmail.com"

/**
 * Returns which program the current user is acting in:
 *   "school"  — for schools (default)
 *   "academy" — for academies
 *
 * The user's organization determines which programs are available:
 *   - package "school"  → always "school"
 *   - package "academy" → always "academy"
 *   - package "both"    → the request must specify ?program= or fall
 *                          back to "school"
 *
 * For now, returns "school" for everyone (single-program mode).
 * This will become smarter when the sidebar and program context land.
 */
export async function getCurrentProgram(req) {
  try {
    // 1. Owner → default to school
    const { getUser } = getKindeServerSession()
    const user = await getUser()
    if (!user?.email) {
      return { success: false, error: "Not logged in", program: "school" }
    }

    const email = String(user.email).toLowerCase().trim()
    if (email === OWNER_EMAIL.toLowerCase()) {
      return { success: true, program: "school", email, isOwner: true }
    }

    // 2. Look up the user's organization
    const db = await getDb()
    const org = await db.collection("schools").findOne({ email })
    if (!org) {
      return { success: false, error: "No organization", program: "school" }
    }

    const pkg = org.package || "school"

    // 3. Determine program
    let program = "school" // default

    // Try query param first (for "both" package)
    if (req) {
      try {
        const url = new URL(req.url)
        const qp = url.searchParams.get("program")
        if (qp === "school" || qp === "academy") {
          program = qp
        }
      } catch {}
    }

    // Enforce package rules
    if (pkg === "school") program = "school"
    else if (pkg === "academy") program = "academy"
    // pkg === "both" → program is whatever query param said, or "school" default

    return {
      success: true,
      program,
      email,
      isOwner: false,
      package: pkg,
      org: {
        _id: org._id.toString(),
        schoolId: org.schoolId,
        schoolName: org.schoolName,
        package: pkg,
      },
    }
  } catch (err) {
    console.error("getCurrentProgram error:", err.message)
    return { success: false, error: err.message, program: "school" }
  }
}