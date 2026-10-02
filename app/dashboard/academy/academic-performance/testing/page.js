"use client"

import React from "react"
import dynamic from "next/dynamic"
import { LoaderIcon } from "lucide-react"

const TestingPageContent = dynamic(
  () => import("./_content/TestingPageContent"),
  {
    ssr: false,
    loading: () => (
      <div className="p-7 flex items-center justify-center min-h-[60vh]">
        <LoaderIcon className="animate-spin text-purple-500" size={28} />
      </div>
    ),
  }
)

export default function AcademyTestingPage() {
  return <TestingPageContent />
}