"use client"
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs'
import { LogoutLink } from '@kinde-oss/kinde-auth-nextjs/components'
import {
  GraduationCap, Hand, LayoutIcon, BookOpen,
  ChevronDown, ChevronRight, FileText, FlaskConical, Wallet, Settings,
  LogOut, ChevronUp, User, Users, PanelLeftClose, PanelLeftOpen
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useState, useEffect, useRef } from 'react'
import GlobalApi from '@/app/_services/GlobalApi'

function SideNav() {
  const { user } = useKindeBrowserClient() || {}
  const path = usePathname()

  const [collapsed, setCollapsed] = useState(false)
  const [openAcademic, setOpenAcademic] = useState(false)
  const [openUserMenu, setOpenUserMenu] = useState(false)
  const [school, setSchool] = useState({ name: 'SAPSYSYSTEM', logo: '' })
  const [mounted, setMounted] = useState(false)
  const menuRef = useRef(null)

  // Load collapse preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sidenav_collapsed")
      if (saved === "true") setCollapsed(true)
    } catch {}
    setMounted(true)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem("sidenav_collapsed", collapsed ? "true" : "false")
    } catch {}
  }, [collapsed])

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
    if (openUserMenu) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [openUserMenu])

  const menuList = [
    { id: 1, name: 'Dashboard', icon: LayoutIcon, path: '/dashboard' },
    { id: 2, name: 'Students', icon: GraduationCap, path: '/dashboard/students' },
    { id: 3, name: 'Teachers', icon: Users, path: '/dashboard/teachers' },
    { id: 4, name: 'Attendance', icon: Hand, path: '/dashboard/attendance' },
  ]

  const academicItems = [
    { name: 'Testing', icon: FlaskConical, path: '/dashboard/academic-performance/testing' },
    { name: 'Examination', icon: FileText, path: '/dashboard/academic-performance/examination' },
  ]

  // ─── Class helpers ───
  const isActive = (p) => path === p

  const itemClass = (active) =>
    `relative flex items-center gap-3 p-3 my-1 rounded-xl cursor-pointer
     transition-all duration-300 group/item overflow-hidden
     ${
       active
         ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30"
         : "text-slate-500 dark:text-slate-400 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-slate-700 dark:hover:to-slate-700 hover:text-blue-700 dark:hover:text-blue-300"
     }
     ${collapsed ? "justify-center" : ""}`

  const subItemClass = (active) =>
    `relative flex items-center gap-2 py-2 px-3 my-1 rounded-lg cursor-pointer
     transition-all duration-300 overflow-hidden
     ${
       active
         ? "bg-blue-500/90 text-white shadow-sm"
         : "text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-700 dark:hover:text-blue-300"
     }
     ${collapsed ? "justify-center px-1" : "ml-2"}`

  // Animated text wrapper
  const Label = ({ children, className = "" }) => (
    <span
      className={`
        whitespace-nowrap transition-all duration-300 ease-out
        ${collapsed ? "opacity-0 w-0 translate-x-[-8px] pointer-events-none" : "opacity-100 w-auto translate-x-0"}
        ${className}
      `}
    >
      {children}
    </span>
  )

  // Prevent SSR flash
  if (!mounted) {
    return (
      <div className="border shadow-md h-screen w-64 bg-white dark:bg-slate-800 dark:border-slate-700" />
    )
  }

  return (
    <div
      className={`
        relative border shadow-lg h-screen flex flex-col
        bg-white dark:bg-slate-800 dark:border-slate-700
        transition-all duration-300 ease-in-out
        ${collapsed ? "w-[76px] p-3" : "w-72 p-5"}
      `}
    >
      {/* ─── Toggle button ─── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={`
          absolute top-4 z-30 flex items-center justify-center
          w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600
          text-white shadow-lg shadow-blue-500/40
          hover:scale-110 active:scale-95 transition-all duration-300
          ${collapsed ? "-right-4" : "-right-4"}
        `}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <PanelLeftOpen size={15} strokeWidth={2.5} />
        ) : (
          <PanelLeftClose size={15} strokeWidth={2.5} />
        )}
      </button>

      {/* ─── School logo + name ─── */}
      <div
        className={`
          flex items-center gap-3 mb-2
          transition-all duration-300
          ${collapsed ? "justify-center" : ""}
        `}
      >
        {school.logo ? (
          <img
            src={school.logo}
            alt="School Logo"
            className={`
              object-contain rounded-lg
              transition-all duration-300 ease-out
              group-hover:scale-110
              ${collapsed ? "w-10 h-10" : "w-12 h-12"}
            `}
          />
        ) : (
          <div
            className={`
              flex items-center justify-center rounded-xl
              bg-gradient-to-br from-blue-500 to-indigo-600 text-white
              transition-all duration-300
              ${collapsed ? "w-10 h-10" : "w-12 h-12"}
            `}
          >
            <GraduationCap size={collapsed ? 20 : 24} />
          </div>
        )}

        <h1
          className={`
            text-base font-extrabold leading-tight
            text-slate-800 dark:text-slate-100
            transition-all duration-300 ease-out whitespace-nowrap
            ${
              collapsed
                ? "opacity-0 w-0 -translate-x-3 pointer-events-none overflow-hidden"
                : "opacity-100 w-auto translate-x-0"
            }
          `}
        >
          {school.name}
        </h1>
      </div>

      <div
        className={`
          border-t border-slate-200 dark:border-slate-700
          my-3 transition-all duration-300
          ${collapsed ? "mx-1" : "mx-0"}
        `}
      />

      {/* ─── Menu list ─── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pr-1 -mr-1">
        {menuList.map((m) => {
          const active = isActive(m.path)
          return (
            <Link key={m.id} href={m.path}>
              <div className={itemClass(active)} title={collapsed ? m.name : ""}>
                {/* Active indicator bar */}
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-white rounded-r-full" />
                )}

                <m.icon
                  size={20}
                  className={`shrink-0 transition-transform duration-300 ${
                    active ? "" : "group-hover/item:scale-110"
                  }`}
                />
                <Label className="font-semibold text-sm">{m.name}</Label>

                {/* Hover glow */}
                {!active && (
                  <span className="absolute inset-0 rounded-xl opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-blue-100/50 to-transparent dark:from-blue-900/20 pointer-events-none" />
                )}
              </div>
            </Link>
          )
        })}

        {/* ─── Academic Performance (expandable) ─── */}
        <div>
          <button
            type="button"
            onClick={() => {
              if (collapsed) {
                setCollapsed(false)
                setTimeout(() => setOpenAcademic(true), 300)
              } else {
                setOpenAcademic(!openAcademic)
              }
            }}
            title={collapsed ? "Academic Performance" : ""}
            className={`${itemClass(path?.startsWith('/dashboard/academic-performance'))} w-full text-left`}
          >
            {path?.startsWith('/dashboard/academic-performance') && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-white rounded-r-full" />
            )}

            <BookOpen size={20} className="shrink-0 transition-transform duration-300 group-hover/item:scale-110" />
            <Label className="font-semibold text-sm flex-1">Academic Performance</Label>

            <span
              className={`
                transition-all duration-300 ease-out
                ${collapsed ? "opacity-0 w-0 pointer-events-none" : "opacity-100 w-auto"}
              `}
            >
              {openAcademic ? (
                <ChevronDown size={16} className="text-current" />
              ) : (
                <ChevronRight size={16} className="text-current" />
              )}
            </span>
          </button>

          {/* Sub items — animated */}
          <div
            className={`
              overflow-hidden transition-all duration-300 ease-in-out
              ${openAcademic && !collapsed ? "max-h-40 opacity-100 mt-1" : "max-h-0 opacity-0"}
            `}
          >
            <div className="ml-3 border-l-2 border-blue-200 dark:border-slate-600 pl-2">
              {academicItems.map((item) => {
                const active = isActive(item.path)
                return (
                  <Link key={item.path} href={item.path}>
                    <div className={subItemClass(active)}>
                      <item.icon size={15} className="shrink-0" />
                      <Label className="text-xs font-medium">{item.name}</Label>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

        {/* ─── Fee Management ─── */}
        <Link href="/dashboard/fee-management">
          <div
            className={itemClass(isActive('/dashboard/fee-management'))}
            title={collapsed ? "Fee Management" : ""}
          >
            {isActive('/dashboard/fee-management') && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-white rounded-r-full" />
            )}
            <Wallet size={20} className="shrink-0 transition-transform duration-300 group-hover/item:scale-110" />
            <Label className="font-semibold text-sm">Fee Management</Label>
          </div>
        </Link>

        {/* ─── Settings ─── */}
        <Link href="/dashboard/settings">
          <div
            className={itemClass(isActive('/dashboard/settings'))}
            title={collapsed ? "Settings" : ""}
          >
            {isActive('/dashboard/settings') && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-white rounded-r-full" />
            )}
            <Settings size={20} className="shrink-0 transition-transform duration-300 group-hover/item:scale-110" />
            <Label className="font-semibold text-sm">Settings</Label>
          </div>
        </Link>
      </div>

      {/* ─── User card ─── */}
      <div
        className={`
          relative mt-3 pt-3 border-t border-slate-200 dark:border-slate-700
          transition-all duration-300
        `}
        ref={menuRef}
      >
        {openUserMenu && !collapsed && (
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
                  <p className="text-xs text-blue-100 truncate">{user?.email}</p>
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

              <LogoutLink className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-900/40 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 hover:translate-x-1 mt-1">
                <LogOut size={16} />
                Logout
              </LogoutLink>
            </div>
          </div>
        )}

        <button
          onClick={() => {
            if (collapsed) {
              setCollapsed(false)
              return
            }
            setOpenUserMenu(!openUserMenu)
          }}
          title={collapsed ? user?.given_name || "User" : ""}
          className={`
            w-full flex items-center gap-3 p-2 rounded-xl
            hover:bg-slate-100 dark:hover:bg-slate-700
            transition-all duration-300 group
            ${collapsed ? "justify-center" : ""}
          `}
        >
          <Image
            src={user?.picture || '/default-avatar.png'}
            width={38}
            height={38}
            className="rounded-full ring-2 ring-blue-200 dark:ring-slate-600 group-hover:ring-blue-400 transition-all shrink-0"
            alt="user"
          />
          <div
            className={`
              flex-1 text-left min-w-0
              transition-all duration-300 ease-out
              ${
                collapsed
                  ? "opacity-0 w-0 -translate-x-3 pointer-events-none overflow-hidden"
                  : "opacity-100 w-auto translate-x-0"
              }
            `}
          >
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
              {user?.given_name} {user?.family_name}
            </h2>
            <h2 className="text-xs text-slate-400 truncate">{user?.email}</h2>
          </div>
          {!collapsed && (
            <span className="shrink-0">
              {openUserMenu ? (
                <ChevronDown size={16} className="text-slate-400 group-hover:text-blue-500 transition" />
              ) : (
                <ChevronUp size={16} className="text-slate-400 group-hover:text-blue-500 transition" />
              )}
            </span>
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

        /* Smooth scrollbar */
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.3);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.5);
        }
      `}</style>
    </div>
  )
}

export default SideNav