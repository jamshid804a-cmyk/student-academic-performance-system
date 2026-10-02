"use client"

import React from "react"
import dynamic from "next/dynamic"
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs"
import { LoaderIcon } from "lucide-react"

const AcademyExaminationModule = dynamic(
  () => import("@/components/AcademyExaminationModule"),
  { ssr: false }
)

export default function ExaminationPageContent() {
  const { user, isLoading } = useKindeBrowserClient() || {}
  const email = user?.email

  if (isLoading || !email) {
    return (
      <div className="p-7 flex items-center justify-center min-h-[60vh]">
        <LoaderIcon className="animate-spin text-pink-500" size={28} />
      </div>
    )
  }

  return <AcademyExaminationModule orgEmail={email} />
}