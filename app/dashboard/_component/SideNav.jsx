"use client"
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs'
import {
  GraduationCap,
  Hand,
  LayoutIcon,
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  Calendar,
  CalendarDays,
  Sun,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useState, useEffect } from 'react'

function SideNav() {
  const { user } = useKindeBrowserClient() || {}
  const path = usePathname()

  // Expanded state for each parent menu
  const [openTesting, setOpenTesting] = useState(false)
  const [openExamination, setOpenExamination] = useState(false)
  const [openAcademic, setOpenAcademic] = useState(false)

  // Auto-open the section that matches the current URL
  useEffect(() => {
    if (path?.startsWith('/dashboard/academic-performance/testing')) {
      setOpenAcademic(true)
      setOpenTesting(true)
    } else if (path?.startsWith('/dashboard/academic-performance/examination')) {
      setOpenAcademic(true)
      setOpenExamination(true)
    } else if (path?.startsWith('/dashboard/academic-performance')) {
      setOpenAcademic(true)
    }
  }, [path])

  const menuList = [
    {
      id: 1,
      name: 'Dashboard',
      icon: LayoutIcon,
      path: '/dashboard',
    },
    {
      id: 2,
      name: 'Students',
      icon: GraduationCap,
      path: '/dashboard/students',
    },
    {
      id: 3,
      name: 'Attendance',
      icon: Hand,
      path: '/dashboard/attendance',
    },
  ]

  // Sub-items for Academic Performance
  const testingItems = [
    {
      name: 'Monthly',
      icon: CalendarDays,
      path: '/dashboard/academic-performance/testing/monthly',
    },
    {
      name: 'Weekly',
      icon: Calendar,
      path: '/dashboard/academic-performance/testing/weekly',
    },
    {
      name: 'Specific Day',
      icon: Sun,
      path: '/dashboard/academic-performance/testing/specific-day',
    },
  ]

  const examinationItems = [
    {
      name: 'Mid Term',
      icon: FileText,
      path: '/dashboard/academic-performance/examination/mid-term',
    },
    {
      name: 'Final Term',
      icon: FileText,
      path: '/dashboard/academic-performance/examination/final-term',
    },
  ]

  const itemClass = (isActive) =>
    `flex items-center gap-3 text-md p-4 rounded-lg my-1 cursor-pointer transition-colors
    ${
      isActive
        ? 'bg-blue-700 text-white'
        : 'text-slate-500 hover:bg-blue-700 hover:text-white'
    }`

  const subItemClass = (isActive) =>
    `flex items-center gap-3 text-sm py-2 px-3 my-1 rounded-lg cursor-pointer transition-colors ml-4
    ${
      isActive
        ? 'bg-blue-600 text-white'
        : 'text-slate-500 hover:bg-blue-100 hover:text-blue-700'
    }`

  return (
    <div className="border shadow-md h-screen p-5 flex flex-col">
      <Image src="/logo.svg" width={200} height={50} alt="logo" />

      <hr className="my-5" />

      {/* Top-level menu */}
      <div className="flex-1 overflow-y-auto">
        {menuList.map((menu) => (
          <Link key={menu.id} href={menu.path}>
            <h2 className={itemClass(path === menu.path)}>
              <menu.icon size={20} />
              {menu.name}
            </h2>
          </Link>
        ))}

        {/* Academic Performance parent */}
        <div>
          <button
            type="button"
            onClick={() => setOpenAcademic(!openAcademic)}
            className={`w-full text-left ${itemClass(
              path?.startsWith('/dashboard/academic-performance')
            )}`}
          >
            <BookOpen size={20} />
            <span className="flex-1">Academic Performance</span>
            {openAcademic ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          {openAcademic && (
            <div className="ml-2 border-l border-gray-200 pl-2">
              {/* Testing parent */}
              <button
                type="button"
                onClick={() => setOpenTesting(!openTesting)}
                className={`w-full text-left flex items-center gap-2 text-sm py-2 px-3 my-1 rounded-lg cursor-pointer transition-colors
                  ${
                    path?.startsWith('/dashboard/academic-performance/testing')
                      ? 'text-blue-700 font-semibold'
                      : 'text-slate-500 hover:bg-blue-50'
                  }`}
              >
                <span className="flex-1">Testing</span>
                {openTesting ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              {openTesting &&
                testingItems.map((item) => (
                  <Link key={item.path} href={item.path}>
                    <div className={subItemClass(path === item.path)}>
                      <item.icon size={14} />
                      {item.name}
                    </div>
                  </Link>
                ))}

              {/* Examination parent */}
              <button
                type="button"
                onClick={() => setOpenExamination(!openExamination)}
                className={`w-full text-left flex items-center gap-2 text-sm py-2 px-3 my-1 rounded-lg cursor-pointer transition-colors
                  ${
                    path?.startsWith('/dashboard/academic-performance/examination')
                      ? 'text-blue-700 font-semibold'
                      : 'text-slate-500 hover:bg-blue-50'
                  }`}
              >
                <span className="flex-1">Examination</span>
                {openExamination ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              {openExamination &&
                examinationItems.map((item) => (
                  <Link key={item.path} href={item.path}>
                    <div className={subItemClass(path === item.path)}>
                      <item.icon size={14} />
                      {item.name}
                    </div>
                  </Link>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* User info at bottom */}
      <div className="flex gap-2 items-center pt-4 border-t mt-4">
        <Image
          src={user?.picture || '/default-avatar.png'}
          width={35}
          height={35}
          className="rounded-full"
          alt="user avatar"
        />
        <div>
          <h2 className="text-sm font-medium">
            {user?.given_name} {user?.family_name}
          </h2>
          <h2 className="text-xs text-slate-400">{user?.email}</h2>
        </div>
      </div>
    </div>
  )
}

export default SideNav