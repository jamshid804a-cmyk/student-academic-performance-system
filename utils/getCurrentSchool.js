import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server"
import { getDb } from "@/utils"

// The owner's email — this account can access the admin dashboard
// and see ALL schools. Change this if your owner email changes.
export const OWNER_EMAIL = "jamshid804a@gmail.com"

/**
 * Reads the Kinde session, gets the logged-in user's email,
 * and finds their school in the `schools` collection.
 *
 * Returns:
 *   { success: true, email, school, isOwner }
 *   { success: false, error, email?, school? }
 */
export async function getCurrentSchool() {
  try {
    const { getUser } = getKindeServerSession()
    const user = await getUser()

    if (!user?.email) {
      return { success: false, error: "Not logged in" }
    }

    const email = String(user.email).toLowerCase().trim()
    const isOwner = email === OWNER_EMAIL.toLowerCase()

    const db = await getDb()
    const school = await db.collection("schools").findOne({
      email,
    })

    if (!school) {
      return {
        success: false,
        error: "No school found for this email",
        email,
        isOwner,
      }
    }

    return {
      success: true,
      email,
      school: {
        ...school,
        _id: school._id.toString(),
      },
      isOwner,
    }
  } catch (err) {
    console.error("getCurrentSchool error:", err)
    return { success: false, error: err.message }
  }
}

/**
 * Same as getCurrentSchool, but for API routes that already
 * have the request object. Use this inside `app/api/**/route.js`.
 */
export async function getCurrentSchoolFromRequest() {
  return getCurrentSchool()
}