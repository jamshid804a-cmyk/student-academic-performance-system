"use client"

import { useCallback, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Loader2, ShieldAlert, RefreshCw } from 'lucide-react'

const UNLOCK_PATH = '/unlock-password'

export default function PasswordGate({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  // 'checking' | 'allowed' | 'error'
  const [state, setState] = useState('checking')

  const check = useCallback(async () => {
    if (pathname === UNLOCK_PATH) {
      setState('allowed')
      return
    }

    // Show the spinner only on the first check; later checks run silently
    setState((s) => (s === 'allowed' ? s : 'checking'))
    try {
      // The server reads the httpOnly unlock cookie — the browser cannot fake it
      const r = await fetch('/api/settings/password/required', { cache: 'no-store' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const d = await r.json()
      if (typeof d.required !== 'boolean') throw new Error('Unexpected response')

      if (!d.required || d.unlocked) {
        setState('allowed')
      } else {
        router.replace(UNLOCK_PATH) // stay on 'checking' so nothing renders
      }
    } catch (err) {
      // FAIL CLOSED: if the check fails, nobody gets in
      console.error('[PasswordGate]', err)
      setState('error')
    }
  }, [pathname, router])

  useEffect(() => {
    check()
  }, [check])

  if (state === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-sm text-center space-y-4">
          <ShieldAlert className="mx-auto text-rose-500" size={40} />
          <p className="font-semibold text-slate-800">Could not verify school security</p>
          <p className="text-sm text-slate-500">Check your connection and try again.</p>
          <button
            onClick={check}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
          >
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      </div>
    )
  }

  return children
}