"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Lock, Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

export default function UnlockPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    fetch('/api/settings/password/required', { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error('check failed')
        return r.json()
      })
      .then((d) => {
        // Nothing to unlock, or already unlocked → go in
        if (d.required === false || d.unlocked === true) {
          router.replace('/')
        } else {
          setChecking(false)
        }
      })
      .catch(() => setChecking(false)) // never auto-unlock on errors
  }, [router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!password) {
      toast.error('Please enter your password')
      return
    }

    setLoading(true)
    try {
      const resp = await fetch('/api/settings/password/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        throw new Error(err.error || 'Incorrect password')
      }

      // The server has set the httpOnly unlock cookie
      toast.success('Unlocked successfully')
      router.replace('/')
      router.refresh()
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Incorrect password')
    }
    setLoading(false)
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              School Locked
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Enter your school password to continue
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              <Lock size={15} /> Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter school password"
                autoFocus
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-xl shadow-md disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 mr-2" /> Unlock
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}