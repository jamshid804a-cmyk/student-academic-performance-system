"use client"

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Toaster } from "sonner"
import { usePathname, useRouter } from 'next/navigation'
import { ProgramProvider, useProgram } from "@/src/context/ProgramContext"
import GlobalApi from "@/app/_services/GlobalApi"

// ✅ Load SideNav and Header ONLY on the client
const SideNav = dynamic(() => import('./_component/SideNav'), { ssr: false })
const Header = dynamic(() => import('./_component/Header'), { ssr: false })

function DashboardLayout({ children }) {
  return (
    <ProgramProvider initialProgram="school">
      <GuardAndShell>{children}</GuardAndShell>
    </ProgramProvider>
  )
}

function GuardAndShell({ children }) {
  const router = useRouter()
  const path = usePathname()
  const { program, setProgram, hydrated: programHydrated } = useProgram()

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
    if (!checked || !sections || !programHydrated) return

    // Bypass paths
    const bypass =
      path?.startsWith('/dashboard/no-section') ||
      path?.startsWith('/dashboard/pay/') ||
      path?.startsWith('/admin')
    if (bypass) return

    if (sections.isOwner) return

    const pkg = sections.package || 'school'
    const sActive = sections.schoolSection?.active === true
    const aActive = sections.academySection?.active === true

    // ─── Step 1: If the current program doesn't belong to the org's package,
    //              auto-correct it before doing any redirect. ───
    let corrected = program

    // Package is academy-only → force academy
    if (pkg === 'academy') {
      if (program !== 'academy') {
        setProgram('academy')
        corrected = 'academy'
      }
    }
    // Package is school-only → force school
    else if (pkg === 'school') {
      if (program !== 'school') {
        setProgram('school')
        corrected = 'school'
      }
    }
    // Package is both → if current program is inactive but the other is active, switch
    else if (pkg === 'both') {
      if (program === 'school' && !sActive && aActive) {
        setProgram('academy')
        corrected = 'academy'
      } else if (program === 'academy' && !aActive && sActive) {
        setProgram('school')
        corrected = 'school'
      }
    }

    // ─── Step 2: With corrected program, decide if we must redirect. ───

    // Nothing active anywhere
    if (!sActive && !aActive) {
      if (pkg === 'school') {
        router.replace('/payment-due')
      } else {
        router.replace('/dashboard/no-section')
      }
      return
    }

    // Current (corrected) program is academy but academy is not active
    if (corrected === 'academy' && !aActive) {
      router.replace('/dashboard/pay/academy')
      return
    }

    // Current (corrected) program is school but school is not active
    if (corrected === 'school' && !sActive) {
      // If academy is available, switch there instead
      if (aActive) {
        setProgram('academy')
        return
      }
      router.replace('/payment-due')
      return
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