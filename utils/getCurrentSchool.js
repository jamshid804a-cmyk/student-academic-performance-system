import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server"
import { getDb } from "@/utils"

export const OWNER_EMAIL = "jamshid804a@gmail.com"

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
    const school = await db.collection("schools").findOne({ email })

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

export async function getCurrentSchoolFromRequest() {
  return getCurrentSchool()
}