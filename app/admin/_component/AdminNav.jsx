"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Building2, CreditCard } from "lucide-react"

const OWNER_EMAIL = "jamshid804a@gmail.com"

export default function AdminNav() {
  const path = usePathname()
  const [pendingCount, setPendingCount] = useState(0)

  // Fetch pending count
  useEffect(() => {
    let cancelled = false
    const fetchCount = () => {
      fetch(`/api/admin/payments?email=${encodeURIComponent(OWNER_EMAIL)}&status=pending`, { cache: "no-store" })
        .then(r => r.json())
        .then(d => { if (!cancelled && d.success) setPendingCount(d.pendingCount || 0) })
        .catch(() => {})
    }
    fetchCount()
    const t = setInterval(fetchCount, 30000)
    return () => { cancelled = true; clearInterval(t) }
  }, [path])

  const tabs = [
    { href: "/admin/schools", label: "Organizations", icon: Building2, badge: 0 },
    { href: "/admin/payments", label: "Payments", icon: CreditCard, badge: pendingCount },
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
              {t.badge > 0 && (
                <span className="ml-1 bg-red-500 text-white text-[10px] font-extrabold rounded-full px-1.5 py-0.5">
                  {t.badge}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}