"use client"

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Toaster } from "sonner"
import { usePathname, useRouter } from 'next/navigation'
import { ProgramProvider, useProgram } from "@/src/context/ProgramContext"
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
  const { program, setProgram, hydrated: programHydrated } = useProgram()

  const [checked, setChecked] = useState(false)
  const [sections, setSections] = useState(null)

  // Fetch section state
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

  // Enforcement logic
  useEffect(() => {
    if (!checked || !sections || !programHydrated) return

    // Bypass paths
    const bypass =
      path?.startsWith('/dashboard/no-section') ||
      path?.startsWith('/dashboard/pay/') ||
      path?.startsWith('/admin')
    if (bypass) return

    // Owner bypasses all
    if (sections.isOwner) return

    const pkg = sections.package || 'school'
    const sActive = sections.schoolSection?.active === true
    const aActive = sections.academySection?.active === true

    // ─── Nothing active anywhere ───
    if (!sActive && !aActive) {
      // School-only → old page
      if (pkg === 'school') {
        router.replace('/payment-due')
        return
      }
      // Academy-only or Both → new no-section page
      router.replace('/dashboard/no-section')
      return
    }

    // ─── Current program is ACADEMY ───
    if (program === 'academy') {
      if (!aActive) {
        // Academy not usable. If school is usable, auto-switch to school.
        if (sActive && (pkg === 'both' || pkg === 'school')) {
          setProgram('school')
          return
        }
        // Otherwise go to academy pay page
        router.replace('/dashboard/pay/academy')
        return
      }
      // Academy active → OK
      return
    }

    // ─── Current program is SCHOOL ───
    if (program === 'school') {
      if (!sActive) {
        // School not usable.
        if (pkg === 'both' && aActive) {
          // Auto-switch to Academy
          setProgram('academy')
          return
        }
        // School-only or both-with-academy-dead → old payment-due page
        router.replace('/payment-due')
        return
      }
      // School active → OK
    }
  }, [checked, sections, program, programHydrated, path, router, setProgram])

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