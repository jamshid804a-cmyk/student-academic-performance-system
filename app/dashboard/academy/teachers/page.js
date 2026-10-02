"use client"

import React from "react"
import dynamic from "next/dynamic"
import { LoaderIcon } from "lucide-react"

const TeachersPageContent = dynamic(
  () => import("./_content/TeachersPageContent"),
  {
    ssr: false,
    loading: () => (
      <div className="p-7 flex items-center justify-center min-h-[60vh]">
        <LoaderIcon className="animate-spin text-purple-500" size={28} />
      </div>
    ),
  }
)

export default function AcademyTeachersPage() {
  return <TeachersPageContent />
}