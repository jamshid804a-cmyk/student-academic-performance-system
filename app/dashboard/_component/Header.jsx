"use client"
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs'
import Image from 'next/image'
import React, { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, Loader2, Mail, Phone, MapPin, User } from 'lucide-react'
import GlobalApi from '@/app/_services/GlobalApi'

const Header = () => {
  const { user } = useKindeBrowserClient()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const [school, setSchool] = useState({
    name: '', address: '', principal: '', email: '', contact: ''
  })

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    GlobalApi.GetSchoolInfo()
      .then(resp => {
        if (resp.data) setSchool(resp.data)
      })
      .catch(() => {})
  }, [])

  const isDark = mounted && resolvedTheme === 'dark'

  const toggleTheme = () => {
    setSpinning(true)
    setTheme(isDark ? 'light' : 'dark')
    setTimeout(() => setSpinning(false), 600)
  }

  // Build the info items to show only if data exists
  const infoItems = [
    school.email && { icon: Mail, text: school.email },
    school.contact && { icon: Phone, text: school.contact },
    school.address && { icon: MapPin, text: school.address },
    school.principal && { icon: User, text: school.principal },
  ].filter(Boolean)

  return (
    <div className='px-6 py-3 shadow-sm border-b flex justify-between items-center bg-white dark:bg-slate-800 dark:border-slate-700'>

      {/* Left: date */}
      <div className='text-sm font-medium text-slate-500 dark:text-slate-400'>
        {new Date().toLocaleDateString('en-US', {
          weekday: 'long', month: 'long', day: 'numeric'
        })}
      </div>

      {/* Right: school info + theme toggle + avatar */}
      <div className='flex items-center gap-4'>

        {/* School info strip */}
        {infoItems.length > 0 && (
          <div className='hidden md:flex items-center gap-4 px-4 py-1.5 rounded-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600'>
            {infoItems.map((item, i) => (
              <div
                key={i}
                className='flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300'
              >
                <item.icon size={13} className='text-blue-500' />
                <span className='max-w-[180px] truncate' title={item.text}>
                  {item.text}
                </span>
                {i < infoItems.length - 1 && (
                  <span className='text-slate-300 dark:text-slate-600 ml-2'>•</span>
                )}
              </div>
            ))}
          </div>
        )}

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

        {/* Avatar */}
        <Image
          src={user?.picture || '/default-avatar.png'}
          height={35}
          width={35}
          alt='user avatar'
          className='rounded-full ring-2 ring-transparent hover:ring-blue-400 transition-all duration-300'
        />
      </div>
    </div>
  )
}

export default Header