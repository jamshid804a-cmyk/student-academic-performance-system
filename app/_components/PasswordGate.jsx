"use client"

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function PasswordGate({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    // Skip check on the unlock page itself
    if (pathname === '/unlock-password') {
      setChecking(false)
      setAllowed(true)
      return
    }

    // Already unlocked in this session?
    const unlocked = sessionStorage.getItem('school_unlocked') === 'true'
    if (unlocked) {
      setChecking(false)
      setAllowed(true)
      return
    }

    // Check if password is required
    fetch('/api/settings/password/required')
      .then((r) => r.json())
      .then((d) => {
        if (d.required) {
          router.replace('/unlock-password')
        } else {
          sessionStorage.setItem('school_unlocked', 'true')
          setAllowed(true)
        }
        setChecking(false)
      })
      .catch(() => {
        // On error, let them through (safe default)
        setAllowed(true)
        setChecking(false)
      })
  }, [pathname, router])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    )
  }

  if (!allowed) {
    return null
  }

  return children
}