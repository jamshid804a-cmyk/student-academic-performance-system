"use client"

import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

const StudentsListContent = dynamic(
  () => import("./_component/StudentsListContent"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-400">
        <Loader2 className="animate-spin mr-2" /> Loading…
      </div>
    ),
  }
)

export default function AcademyStudentsPage() {
  return <StudentsListContent />
}