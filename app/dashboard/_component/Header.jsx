"use client"
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs'
import Image from 'next/image'
import React, { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, Loader2, Mail, Phone, MapPin, User } from 'lucide-react'
import GlobalApi from '@/app/_services/GlobalApi'

const SCHOOL_CACHE_KEY = "school_info_cache_v1"
const CACHE_TTL = 5 * 60 * 1000

function readCache() {
  try {
    const raw = sessionStorage.getItem(SCHOOL_CACHE_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) return null
    return data
  } catch { return null }
}

function writeCache(data) {
  try {
    sessionStorage.setItem(SCHOOL_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
  } catch {}
}

const Header = () => {
  const { user } = useKindeBrowserClient()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const [school, setSchool] = useState(() => readCache() || {
    name: '', address: '', principal: '', email: '', contact: ''
  })

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    // If cached, don't fetch
    const cached = readCache()
    if (cached) {
      setSchool(cached)
      return
    }
    GlobalApi.GetSchoolInfo()
      .then(resp => {
        if (resp.data) {
          setSchool(resp.data)
          writeCache(resp.data)
        }
      })
      .catch(() => {})
  }, [])

  const isDark = mounted && resolvedTheme === 'dark'

  const toggleTheme = () => {
    setSpinning(true)
    setTheme(isDark ? 'light' : 'dark')
    setTimeout(() => setSpinning(false), 600)
  }

  const infoItems = [
    school.email && { icon: Mail, text: school.email },
    school.contact && { icon: Phone, text: school.contact },
    school.address && { icon: MapPin, text: school.address },
    school.principal && { icon: User, text: school.principal },
  ].filter(Boolean)

  return (
    <div className='px-6 py-4 shadow-sm border-b flex justify-between items-center bg-white dark:bg-slate-800 dark:border-slate-700'>
      <div className='text-base font-semibold text-slate-600 dark:text-slate-300'>
        {new Date().toLocaleDateString('en-US', {
          weekday: 'long', month: 'long', day: 'numeric'
        })}
      </div>

      <div className='flex items-center gap-4'>
        {infoItems.length > 0 && (
          <div className='hidden lg:flex items-center gap-5 px-5 py-2.5 rounded-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600'>
            {infoItems.map((item, i) => (
              <div key={i} className='flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200'>
                <item.icon size={16} className='text-blue-500' />
                <span className='max-w-[220px] truncate' title={item.text}>{item.text}</span>
                {i < infoItems.length - 1 && (
                  <span className='text-slate-300 dark:text-slate-600 ml-3'>•</span>
                )}
              </div>
            ))}
          </div>
        )}

        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className='w-11 h-11 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-all duration-300 hover:scale-110 active:scale-95'
        >
          {!mounted ? <Loader2 size={20} className='animate-spin' /> : isDark ? (
            <Sun size={20} className={`${spinning ? 'animate-spin-slow' : ''}`} />
          ) : (
            <Moon size={20} className={`${spinning ? 'animate-spin-slow' : ''}`} />
          )}
        </button>

        <Image
          src={user?.picture || '/default-avatar.png'}
          height={44}
          width={44}
          alt='user avatar'
          className='rounded-full ring-2 ring-transparent hover:ring-blue-400 transition-all duration-300'
        />
      </div>
    </div>
  )
}

export default Header