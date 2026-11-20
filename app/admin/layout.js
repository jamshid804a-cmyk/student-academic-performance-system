import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server"
import { redirect } from "next/navigation"

const OWNER_EMAIL = "jamshid804a@gmail.com"

export default async function AdminLayout({ children }) {
  const { getUser } = getKindeServerSession()
  const user = await getUser()

  // Not logged in → login
  if (!user?.email) {
    redirect("/api/auth/login")
  }

  // Not the owner → no access
  const email = String(user.email).toLowerCase().trim()
  if (email !== OWNER_EMAIL.toLowerCase()) {
    redirect("/no-access")
  }

  // Owner → render
  return (
    <div className="min-h-screen bg-slate-50">
      {children}
    </div>
  )
}