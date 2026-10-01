"use client"

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Toaster } from "sonner"
import { usePathname, useRouter } from 'next/navigation'
import { Loader2 } from "lucide-react"
import { ProgramProvider } from "@/src/context/ProgramContext"
import GlobalApi from "@/app/_services/GlobalApi"

// ✅ Load SideNav and Header ONLY on the client — they use Kinde/Theme contexts
const SideNav = dynamic(() => import('./_component/SideNav'), { ssr: false })
const Header = dynamic(() => import('./_component/Header'), { ssr: false })

function DashboardLayout({ children }) {
  return (
    <ProgramProvider initialProgram="school">
      <GuardAndShell>{children}</GuardAndShell>
    </ProgramProvider>
  )
}

// ─────────────────────────────────────────────
// Runs the section-status check + renders the shell
// ─────────────────────────────────────────────
function GuardAndShell({ children }) {
  const router = useRouter()
  const path = usePathname()
  const [checked, setChecked] = useState(false)
  const [sections, setSections] = useState(null)

  useEffect(() => {
    let cancelled = false
    GlobalApi.GetOrgSections()
      .then((resp) => {
        if (cancelled) return
        if (resp?.data?.success) setSections(resp.data)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setChecked(true)
      })
    return () => {
      cancelled = true
    }
  }, [path])

  useEffect(() => {
    if (!checked || !sections) return

    // Paths that are ALWAYS allowed (no redirect)
    const bypass =
      path?.startsWith('/dashboard/no-section') ||
      path?.startsWith('/dashboard/pay/') ||
      path?.startsWith('/admin')
    if (bypass) return

    // Owner bypasses all checks
    if (sections.isOwner) return

    const pkg = sections.package || 'school'
    const sActive = sections.schoolSection?.active === true
    const aActive = sections.academySection?.active === true

    const anyActive = sActive || aActive

    if (!anyActive) {
      // Both suspended (or the only section suspended) → block
      router.replace('/dashboard/no-section')
    }
  }, [checked, sections, path, router])

  return (
    <div>
      <div className='md:w-64 fixed hidden md:block'>
        <SideNav />
      </div>

      <div className='md:ml-64'>
        <Header />
        <Toaster />
        {children}
      </div>
    </div>
  )
}

export default DashboardLayout