"use client"
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs'
import {
  GraduationCap, Hand, LayoutIcon, BookOpen,
  ChevronDown, ChevronRight, FileText, FlaskConical, Wallet, Settings,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useState, useEffect } from 'react'
import GlobalApi from '@/app/_services/GlobalApi'

function SideNav() {
  const { user } = useKindeBrowserClient() || {}
  const path = usePathname()
  const [openAcademic, setOpenAcademic] = useState(false)
  const [school, setSchool] = useState({ name: 'SAPSYSYSTEM', logo: '' })

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
  }, [path])  // refresh whenever route changes

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
    `flex items-center gap-3 text-md p-4 rounded-lg my-1 cursor-pointer transition-all duration-300
    ${a ? 'bg-blue-700 text-white shadow-md' : 'text-slate-500 hover:bg-blue-700 hover:text-white hover:translate-x-1'}`

  const subItemClass = (a) =>
    `flex items-center gap-3 text-sm py-2 px-3 my-1 rounded-lg cursor-pointer transition-all duration-300 ml-4
    ${a ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-blue-100 hover:text-blue-700 hover:translate-x-1'}`

  return (
    <div className="border shadow-md h-screen p-5 flex flex-col bg-white dark:bg-slate-800 dark:border-slate-700">

      {/* Dynamic school logo + name */}
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
          <button type="button" onClick={() => setOpenAcademic(!openAcademic)}
            className={`w-full text-left ${itemClass(path?.startsWith('/dashboard/academic-performance'))}`}>
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

      <div className="flex gap-2 items-center pt-4 border-t dark:border-slate-700 mt-4">
        <Image src={user?.picture || '/default-avatar.png'} width={35} height={35} className="rounded-full" alt="user" />
        <div>
          <h2 className="text-sm font-medium dark:text-slate-100">{user?.given_name} {user?.family_name}</h2>
          <h2 className="text-xs text-slate-400">{user?.email}</h2>
        </div>
      </div>
    </div>
  )
}

export default SideNav