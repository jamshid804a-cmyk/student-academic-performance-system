"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Building2 } from "lucide-react"

export default function AdminNav() {
  const path = usePathname()

  const tabs = [
    { href: "/admin/schools", label: "Organizations", icon: Building2 },
  ]

  return (
    <div className="border-b border-slate-200 bg-white sticky top-0 z-30">
      <div className="flex items-center gap-1 px-7 py-2">
        {tabs.map((t) => {
          const Icon = t.icon
          const active = path?.startsWith(t.href)
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition ${
                active
                  ? "bg-slate-800 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon size={15} />
              {t.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}