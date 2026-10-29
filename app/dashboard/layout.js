"use client"

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Toaster } from "sonner"
import { usePathname, useRouter } from 'next/navigation'
import { ProgramProvider, useProgram } from "@/src/context/ProgramContext"
import GlobalApi from "@/app/_services/GlobalApi"

const SideNav = dynamic(() => import('./_component/SideNav'), { ssr: false })
const Header = dynamic(() => import('./_component/Header'), { ssr: false })

// ─── Simple session cache for org sections ───
const SECTIONS_CACHE_KEY = "org_sections_cache_v1"
const CACHE_TTL = 5 * 60 * 1000 // 5 min

function readSectionsCache() {
  try {
    const raw = sessionStorage.getItem(SECTIONS_CACHE_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) return null
    return data
  } catch {
    return null
  }
}

function writeSectionsCache(data) {
  try {
    sessionStorage.setItem(SECTIONS_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
  } catch {}
}

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

  // ✅ Fetch sections ONCE (cache-first, no re-fetch on path change)
  useEffect(() => {
    const cached = readSectionsCache()
    if (cached) {
      setSections(cached)
      setChecked(true)
      return
    }

    let cancelled = false
    GlobalApi.GetOrgSections()
      .then((resp) => {
        if (cancelled) return
        if (resp?.data?.success) {
          setSections(resp.data)
          writeSectionsCache(resp.data)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setChecked(true)
      })
    return () => {
      cancelled = true
    }
  }, []) // ✅ no dependency on path — runs once

  useEffect(() => {
    if (!checked || !sections || !programHydrated) return
    if (sections.isOwner) return

    const pkg = sections.package || 'school'
    const sActive = sections.schoolSection?.active === true
    const aActive = sections.academySection?.active === true

    if (!sActive && !aActive) {
      router.replace('/no-access')
      return
    }

    let corrected = program
    if (pkg === 'school') {
      corrected = 'school'
    } else if (pkg === 'academy') {
      corrected = 'academy'
    } else {
      if (program === 'academy' && !aActive && sActive) corrected = 'school'
      else if (program === 'school' && !sActive && aActive) corrected = 'academy'
    }
    if (corrected !== program) {
      setProgram(corrected)
      return
    }

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
  }, [checked, sections, program, programHydrated, router, setProgram])

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