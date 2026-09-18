"use client"
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs'
import {
  GraduationCap, Hand, LayoutIcon, BookOpen,
  ChevronDown, ChevronRight, FileText, FlaskConical,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useState, useEffect } from 'react'

function SideNav() {
  const { user } = useKindeBrowserClient() || {}
  const path = usePathname()
  const [openAcademic, setOpenAcademic] = useState(false)

  useEffect(() => {
    if (path?.startsWith('/dashboard/academic-performance')) setOpenAcademic(true)
  }, [path])

  const menuList = [
    { id: 1, name: 'Dashboard', icon: LayoutIcon, path: '/dashboard' },
    { id: 2, name: 'Students', icon: GraduationCap, path: '/dashboard/students' },
    { id: 3, name: 'Attendance', icon: Hand, path: '/dashboard/attendance' },
  ]

  const academicItems = [
    { name: 'Testing', icon: FlaskConical, path: '/dashboard/academic-performance/testing' },
    { name: 'Examination', icon: FileText, path: '/dashboard/academic-performance/examination' },
  ]

  const itemClass = (a) => `flex items-center gap-3 text-md p-4 rounded-lg my-1 cursor-pointer transition-colors ${
    a ? 'bg-blue-700 text-white' : 'text-slate-500 hover:bg-blue-700 hover:text-white'
  }`

  const subItemClass = (a) => `flex items-center gap-3 text-sm py-2 px-3 my-1 rounded-lg cursor-pointer transition-colors ml-4 ${
    a ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-blue-100 hover:text-blue-700'
  }`

  return (
    <div className="border shadow-md h-screen p-5 flex flex-col">
      <Image src="/logo.svg" width={200} height={50} alt="logo" />
      <hr className="my-5" />
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
            <div className="ml-2 border-l border-gray-200 pl-2">
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
      </div>

      <div className="flex gap-2 items-center pt-4 border-t mt-4">
        <Image src={user?.picture || '/default-avatar.png'} width={35} height={35} className="rounded-full" alt="user" />
        <div>
          <h2 className="text-sm font-medium">{user?.given_name} {user?.family_name}</h2>
          <h2 className="text-xs text-slate-400">{user?.email}</h2>
        </div>
      </div>
    </div>
  )
}

export default SideNav