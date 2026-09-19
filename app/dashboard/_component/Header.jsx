"use client"
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs'
import Image from 'next/image'
import React, { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, Loader2 } from 'lucide-react'

const Header = () => {
  const { user } = useKindeBrowserClient()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [spinning, setSpinning] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const isDark = mounted && resolvedTheme === 'dark'

  const toggleTheme = () => {
    setSpinning(true)
    setTheme(isDark ? 'light' : 'dark')
    setTimeout(() => setSpinning(false), 600)
  }

  return (
    <div className='px-6 py-3 shadow-sm border-b flex justify-between items-center bg-white dark:bg-slate-800'>
      <div className='text-sm font-medium text-slate-500 dark:text-slate-400'>
        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </div>

      <div className='flex items-center gap-3'>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className='w-9 h-9 rounded-full flex items-center justify-center
            bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600
            text-slate-700 dark:text-slate-200 transition-all duration-300
            hover:scale-110 active:scale-95'
        >
          {!mounted ? (
            <Loader2 size={16} className='animate-spin' />
          ) : isDark ? (
            <Sun size={16} className={`${spinning ? 'animate-spin-slow' : ''}`} />
          ) : (
            <Moon size={16} className={`${spinning ? 'animate-spin-slow' : ''}`} />
          )}
        </button>

        {/* Avatar with hover glow */}
        <div className='relative'>
          <Image
            src={user?.picture || '/default-avatar.png'}
            height={35}
            width={35}
            alt='user avatar'
            className='rounded-full ring-2 ring-transparent hover:ring-blue-400 transition-all duration-300'
          />
        </div>
      </div>
    </div>
  )
}

export default Header