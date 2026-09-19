"use client"
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs'
import { LogoutLink } from '@kinde-oss/kinde-auth-nextjs/components'
import {
  GraduationCap, Hand, LayoutIcon, BookOpen,
  ChevronDown, ChevronRight, FileText, FlaskConical, Wallet, Settings,
  LogOut, ChevronUp, User
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useState, useEffect, useRef } from 'react'
import GlobalApi from '@/app/_services/GlobalApi'

function SideNav() {
  const { user } = useKindeBrowserClient() || {}
  const path = usePathname()
  const [openAcademic, setOpenAcademic] = useState(false)
  const [openUserMenu, setOpenUserMenu] = useState(false)
  const [school, setSchool] = useState({ name: 'SAPSYSYSTEM', logo: '' })
  const menuRef = useRef(null)

  useEffect(() => {
    if (path?.startsWith('/dashboard/academic-performance')) setOpenAcademic(true)
  }, [path])

  useEffect(() => {
    GlobalApi.GetSchoolInfo()
      .then(resp => {
        if (resp.data) {
          setSchool({
            name: resp.data.name || 'SAPSYSYSTEM',
            logo: resp.data.logo || '',
          })
        }
      })
      .catch(() => {})
  }, [path])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenUserMenu(false)
      }
    }
    if (openUserMenu) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openUserMenu])

  const menuList = [
    { id: 1, name: 'Dashboard', icon: LayoutIcon, path: '/dashboard' },
    { id: 2, name: 'Students', icon: GraduationCap, path: '/dashboard/students' },
    { id: 3, name: 'Attendance', icon: Hand, path: '/dashboard/attendance' },
  ]

  const academicItems = [
    { name: 'Testing', icon: FlaskConical, path: '/dashboard/academic-performance/testing' },
    { name: 'Examination', icon: FileText, path: '/dashboard/academic-performance/examination' },
  ]

  const itemClass = (a) =>
    `flex items-center gap-3 text-md p-4 rounded-lg my-1 cursor-pointer transition-all duration-300 ${a ? 'bg-blue-700 text-white shadow-md' : 'text-slate-500 hover:bg-blue-700 hover:text-white hover:translate-x-1'}`

  const subItemClass = (a) =>
    `flex items-center gap-3 text-sm py-2 px-3 my-1 rounded-lg cursor-pointer transition-all duration-300 ml-4 ${a ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-blue-100 hover:text-blue-700 hover:translate-x-1'}`

  return (
    <div className="border shadow-md h-screen p-5 flex flex-col bg-white dark:bg-slate-800 dark:border-slate-700">

      {/* School logo + name */}
      <div className="flex items-center gap-3 px-1 mb-2 group">
        {school.logo ? (
          <img
            src={school.logo}
            alt="School Logo"
            className="w-12 h-12 object-contain rounded-lg group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <Image
            src="/logo.svg"
            width={50}
            height={50}
            alt="logo"
            className="group-hover:scale-110 transition-transform duration-300"
          />
        )}
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">
          {school.name}
        </h1>
      </div>

      <hr className="my-4 dark:border-slate-700" />

      <div className="flex-1 overflow-y-auto">
        {menuList.map((m) => (
          <Link key={m.id} href={m.path}>
            <h2 className={itemClass(path === m.path)}>
              <m.icon size={20} />{m.name}
            </h2>
          </Link>
        ))}

        <div>
          <button
            type="button"
            onClick={() => setOpenAcademic(!openAcademic)}
            className={`w-full text-left ${itemClass(path?.startsWith('/dashboard/academic-performance'))}`}
          >
            <BookOpen size={20} />
            <span className="flex-1">Academic Performance</span>
            {openAcademic ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          {openAcademic && (
            <div className="ml-2 border-l border-gray-200 dark:border-slate-700 pl-2 animate-fade-in">
              {academicItems.map((item) => (
                <Link key={item.path} href={item.path}>
                  <div className={subItemClass(path === item.path)}>
                    <item.icon size={14} />{item.name}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <Link href="/dashboard/fee-management">
          <h2 className={itemClass(path === '/dashboard/fee-management')}>
            <Wallet size={20} /> Fee Management
          </h2>
        </Link>

        <Link href="/dashboard/settings">
          <h2 className={itemClass(path === '/dashboard/settings')}>
            <Settings size={20} /> Settings
          </h2>
        </Link>
      </div>

      {/* User card + dropdown */}
      <div className="relative mt-4 pt-4 border-t dark:border-slate-700" ref={menuRef}>

        {openUserMenu && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-user-menu z-50">

            <div className="px-4 py-4 bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
              <div className="flex items-center gap-3">
                <Image
                  src={user?.picture || '/default-avatar.png'}
                  width={44}
                  height={44}
                  className="rounded-full ring-2 ring-white/40"
                  alt="user"
                />
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">
                    {user?.given_name} {user?.family_name}
                  </p>
                  <p className="text-xs text-blue-100 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-2">
              <Link
                href="/dashboard/settings"
                onClick={() => setOpenUserMenu(false)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-700 dark:hover:text-blue-300 transition-all duration-200 hover:translate-x-1"
              >
                <User size={16} />
                Profile Settings
              </Link>

              <LogoutLink
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-900/40 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 hover:translate-x-1 mt-1"
              >
                <LogOut size={16} />
                Logout
              </LogoutLink>
            </div>
          </div>
        )}

        <button
          onClick={() => setOpenUserMenu(!openUserMenu)}
          className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 group"
        >
          <Image
            src={user?.picture || '/default-avatar.png'}
            width={38}
            height={38}
            className="rounded-full ring-2 ring-transparent group-hover:ring-blue-400 transition-all"
            alt="user"
          />
          <div className="flex-1 text-left min-w-0">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
              {user?.given_name} {user?.family_name}
            </h2>
            <h2 className="text-xs text-slate-400 truncate">{user?.email}</h2>
          </div>
          {openUserMenu ? (
            <ChevronDown size={16} className="text-slate-400 group-hover:text-blue-500 transition" />
          ) : (
            <ChevronUp size={16} className="text-slate-400 group-hover:text-blue-500 transition" />
          )}
        </button>
      </div>

      <style jsx global>{`
        @keyframes user-menu-in {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-user-menu {
          animation: user-menu-in 0.2s ease-out;
          transform-origin: bottom center;
        }
      `}</style>
    </div>
  )
}

export default SideNav