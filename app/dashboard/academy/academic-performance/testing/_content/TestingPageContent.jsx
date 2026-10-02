"use client"

import React from "react"
import dynamic from "next/dynamic"
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs"
import { LoaderIcon } from "lucide-react"

const AcademyTestingModule = dynamic(
  () => import("@/components/AcademyTestingModule"),
  { ssr: false }
)

export default function TestingPageContent() {
  const { user, isLoading } = useKindeBrowserClient() || {}
  const email = user?.email

  if (isLoading || !email) {
    return (
      <div className="p-7 flex items-center justify-center min-h-[60vh]">
        <LoaderIcon className="animate-spin text-purple-500" size={28} />
      </div>
    )
  }

  return <AcademyTestingModule orgEmail={email} />
}