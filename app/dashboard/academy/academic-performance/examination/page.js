"use client"

import React from "react"
import dynamic from "next/dynamic"
import { LoaderIcon } from "lucide-react"

const ExaminationPageContent = dynamic(
  () => import("./_content/ExaminationPageContent"),
  {
    ssr: false,
    loading: () => (
      <div className="p-7 flex items-center justify-center min-h-[60vh]">
        <LoaderIcon className="animate-spin text-pink-500" size={28} />
      </div>
    ),
  }
)

export default function AcademyExaminationPage() {
  return <ExaminationPageContent />
}