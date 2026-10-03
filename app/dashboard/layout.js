"use client"

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Toaster } from "sonner"
import { usePathname, useRouter } from 'next/navigation'
import { ProgramProvider, useProgram } from "@/src/context/ProgramContext"
import GlobalApi from "@/app/_services/GlobalApi"

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

    if (sections.isOwner) return

    const pkg = sections.package || 'school'
    const sActive = sections.schoolSection?.active === true
    const aActive = sections.academySection?.active === true

    // ─── Nothing active anywhere ───
    if (!sActive && !aActive) {
      router.replace('/no-access')
      return
    }

    // ─── Correct the current program if it's not allowed ───
    let corrected = program
    if (pkg === 'school') {
      corrected = 'school'
    } else if (pkg === 'academy') {
      corrected = 'academy'
    } else {
      // both
      if (program === 'academy' && !aActive && sActive) corrected = 'school'
      else if (program === 'school' && !sActive && aActive) corrected = 'academy'
    }
    if (corrected !== program) {
      setProgram(corrected)
      return
    }

    // ─── If current section is inactive → switch or block ───
    if (corrected === 'academy' && !aActive) {
      if (sActive) setProgram('school')
      else router.replace('/no-access')
      return
    }
    if (corrected === 'school' && !sActive) {
      if (aActive) setProgram('academy')
      else router.replace('/no-access')
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