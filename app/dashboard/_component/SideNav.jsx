"use client"
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs'
import { LogoutLink } from '@kinde-oss/kinde-auth-nextjs/components'
import {
  GraduationCap, Hand, LayoutIcon, BookOpen,
  ChevronDown, ChevronRight, FileText, FlaskConical, Wallet, Settings,
  LogOut, ChevronUp, User, Users, PanelLeftClose, PanelLeftOpen,
  School, Library
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useState, useEffect, useRef } from 'react'
import GlobalApi from '@/app/_services/GlobalApi'
import { useProgram } from '@/src/context/ProgramContext'

function SideNav() {
  const { user } = useKindeBrowserClient() || {}
  const path = usePathname()
  const { program, setProgram, hydrated: programHydrated } = useProgram()

  const [collapsed, setCollapsed] = useState(false)
  const [openAcademic, setOpenAcademic] = useState(false)
  const [openUserMenu, setOpenUserMenu] = useState(false)
  const [school, setSchool] = useState({ name: 'SAPSYSYSTEM', logo: '' })
  const [mounted, setMounted] = useState(false)
  const [showFullName, setShowFullName] = useState(false)
  const [sections, setSections] = useState(null)
  const menuRef = useRef(null)

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
    if (path?.startsWith('/dashboard/academic-performance') ||
        path?.startsWith('/dashboard/academy/academic-performance')) {
      setOpenAcademic(true)
    }
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
    GlobalApi.GetOrgSections()
      .then(resp => {
        if (resp?.data?.success) setSections(resp.data)
      })
      .catch(() => {})
  }, [path])

  // Auto-correct program if it doesn't match package
  useEffect(() => {
    if (!sections || !programHydrated) return
    const pkg = sections.package || 'school'
    const sActive = sections.schoolSection?.active === true
    const aActive = sections.academySection?.active === true

    let allowed = 'school'
    if (pkg === 'school') allowed = 'school'
    else if (pkg === 'academy') allowed = 'academy'
    else {
      if (program === 'academy' && aActive) allowed = 'academy'
      else if (program === 'school' && sActive) allowed = 'school'
      else if (sActive) allowed = 'school'
      else if (aActive) allowed = 'academy'
    }
    if (allowed !== program) setProgram(allowed)
  }, [sections, program, programHydrated, setProgram])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenUserMenu(false)
      }
    }
    if (openUserMenu) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [openUserMenu])

  const isAcademy = program === 'academy'
  const base = isAcademy ? '/dashboard/academy' : '/dashboard'

  const menuList = [
    { id: 1, name: 'Dashboard', icon: LayoutIcon, path: base },
    { id: 2, name: 'Students', icon: GraduationCap, path: `${base}/students` },
    { id: 3, name: 'Teachers', icon: Users, path: `${base}/teachers` },
    { id: 4, name: 'Attendance', icon: Hand, path: `${base}/attendance` },
  ]

  const academicItems = isAcademy
    ? [
        { name: 'Testing', icon: FlaskConical, path: `${base}/academic-performance/testing` },
        { name: 'Examination', icon: FileText, path: `${base}/academic-performance/examination` },
      ]
    : [
        { name: 'Testing', icon: FlaskConical, path: '/dashboard/academic-performance/testing' },
        { name: 'Examination', icon: FileText, path: '/dashboard/academic-performance/examination' },
      ]

  const academicBase = isAcademy
    ? `${base}/academic-performance`
    : '/dashboard/academic-performance'

  const feePath = isAcademy ? `${base}/fee-management` : '/dashboard/fee-management'
  const settingsPath = '/dashboard/settings'

  const isActive = (p) => path === p

  const itemClass = (active) =>
    `relative flex items-center gap-3 p-3 my-1 rounded-xl cursor-pointer transition-all duration-300 group/item ${active ? (isAcademy ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/30" : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30") : (isAcademy ? "text-slate-500 hover:bg-slate-100 hover:text-purple-700" : "text-slate-500 hover:bg-slate-100 hover:text-blue-700")} ${collapsed ? "justify-center" : ""}`

  const subItemClass = (active) =>
    `relative flex items-center gap-2 py-2 px-3 my-1 rounded-lg cursor-pointer transition-all duration-300 ${active ? (isAcademy ? "bg-purple-500 text-white shadow-sm" : "bg-blue-500 text-white shadow-sm") : (isAcademy ? "text-slate-500 hover:bg-purple-50 hover:text-purple-700" : "text-slate-500 hover:bg-blue-50 hover:text-blue-700")} ${collapsed ? "justify-center px-1" : "ml-2"}`

  const Label = ({ children, className = "" }) => (
    <span className={`whitespace-nowrap transition-all duration-300 ease-out ${collapsed ? "opacity-0 w-0 translate-x-[-8px] pointer-events-none" : "opacity-100 w-auto translate-x-0"} ${className}`}>
      {children}
    </span>
  )

  const displayName = school.name.length > 22
    ? school.name.slice(0, 22).trimEnd() + "…"
    : school.name

  if (!mounted) {
    return <div className="border shadow-md h-screen w-64 bg-white" />
  }

  const pkg = sections?.package || 'school'
  const sActive = sections?.schoolSection?.active === true
  const aActive = sections?.academySection?.active === true

  // Show switcher only if BOTH sections are active and package = both
  const showSwitcher = pkg === 'both' && sActive && aActive

  return (
    <div className={`relative border shadow-lg h-screen flex flex-col bg-white transition-all duration-300 ease-in-out ${collapsed ? "w-[72px] p-3" : "w-64 p-4"}`}>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-5 z-30 flex items-center justify-center w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-500 shadow-md hover:shadow-lg hover:text-blue-600 hover:scale-110 active:scale-95 transition-all duration-300 -right-3.5"
        title={collapsed ? "Expand" : "Collapse"}
      >
        {collapsed ? <PanelLeftOpen size={13} strokeWidth={2.5} /> : <PanelLeftClose size={13} strokeWidth={2.5} />}
      </button>

      <div
        className={`flex items-center gap-3 mb-2 mt-1 transition-all duration-300 ${collapsed ? "justify-center" : ""}`}
        onMouseEnter={() => setShowFullName(true)}
        onMouseLeave={() => setShowFullName(false)}
      >
        <div className="relative shrink-0">
          {school.logo ? (
            <img
              src={school.logo}
              alt="School Logo"
              className={`object-contain rounded-xl transition-all duration-300 ease-out ${collapsed ? "w-10 h-10" : "w-11 h-11"}`}
            />
          ) : (
            <div className={`flex items-center justify-center rounded-xl bg-gradient-to-br ${isAcademy ? "from-purple-500 to-fuchsia-600" : "from-blue-500 to-indigo-600"} text-white shadow-sm transition-all duration-300 ${collapsed ? "w-10 h-10" : "w-11 h-11"}`}>
              {isAcademy ? <Library size={collapsed ? 19 : 21} /> : <GraduationCap size={collapsed ? 19 : 21} />}
            </div>
          )}

          {collapsed && showFullName && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium whitespace-nowrap shadow-xl z-50 pointer-events-none">
              {school.name}
              <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
            </div>
          )}
        </div>

        <h1
          title={school.name}
          className={`text-sm font-bold leading-tight text-slate-800 transition-all duration-300 ease-out ${collapsed ? "opacity-0 w-0 -translate-x-3 pointer-events-none overflow-hidden" : "opacity-100 flex-1 min-w-0"}`}
        >
          {displayName}
        </h1>
      </div>

      {/* Section Switcher — only for Both-orgs with both active */}
      {showSwitcher && (
        <div className="mt-2">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => setProgram('school')}
                title="School Section"
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${program === 'school' ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                <School size={18} />
              </button>
              <button
                onClick={() => setProgram('academy')}
                title="Academy Section"
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${program === 'academy' ? 'bg-purple-600 text-white shadow' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                <Library size={18} />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => setProgram('school')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${program === 'school' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}
              >
                <School size={14} /> School
              </button>
              <button
                onClick={() => setProgram('academy')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${program === 'academy' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}
              >
                <Library size={14} /> Academy
              </button>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-slate-200 my-2" />

      <div className="flex-1 overflow-y-auto overflow-x-hidden -mr-2 pr-2">
        {menuList.map((m) => {
          const active = isActive(m.path)
          return (
            <Link key={m.id} href={m.path}>
              <div className={itemClass(active)} title={collapsed ? m.name : ""}>
                {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />}
                <m.icon size={19} className={`shrink-0 transition-transform duration-300 ${active ? "" : "group-hover/item:scale-110"}`} />
                <Label className="font-semibold text-sm">{m.name}</Label>
              </div>
            </Link>
          )
        })}

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
            className={`${itemClass(path?.startsWith(academicBase))} w-full text-left`}
          >
            {path?.startsWith(academicBase) && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />}
            <BookOpen size={19} className="shrink-0 transition-transform duration-300 group-hover/item:scale-110" />
            <Label className="font-semibold text-sm flex-1">Academic</Label>
            <span className={`transition-all duration-300 ease-out ${collapsed ? "opacity-0 w-0 pointer-events-none" : "opacity-100 w-auto"}`}>
              {openAcademic ? <ChevronDown size={15} className="text-current" /> : <ChevronRight size={15} className="text-current" />}
            </span>
          </button>

          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openAcademic && !collapsed ? "max-h-40 opacity-100 mt-1" : "max-h-0 opacity-0"}`}>
            <div className={`ml-3 border-l-2 ${isAcademy ? "border-purple-200" : "border-blue-200"} pl-2`}>
              {academicItems.map((item) => {
                const active = isActive(item.path)
                return (
                  <Link key={item.path} href={item.path}>
                    <div className={subItemClass(active)}>
                      <item.icon size={14} className="shrink-0" />
                      <Label className="text-xs font-medium">{item.name}</Label>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

        <Link href={feePath}>
          <div className={itemClass(isActive(feePath))} title={collapsed ? "Fee Management" : ""}>
            {isActive(feePath) && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />}
            <Wallet size={19} className="shrink-0 transition-transform duration-300 group-hover/item:scale-110" />
            <Label className="font-semibold text-sm">Fee</Label>
          </div>
        </Link>

        <Link href={settingsPath}>
          <div className={itemClass(isActive(settingsPath))} title={collapsed ? "Settings" : ""}>
            {isActive(settingsPath) && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />}
            <Settings size={19} className="shrink-0 transition-transform duration-300 group-hover/item:scale-110" />
            <Label className="font-semibold text-sm">Settings</Label>
          </div>
        </Link>
      </div>

      <div className="relative mt-2 pt-3 border-t border-slate-200" ref={menuRef}>
        {openUserMenu && !collapsed && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-user-menu z-50">
            <div className={`px-4 py-4 bg-gradient-to-br ${isAcademy ? "from-purple-500 to-fuchsia-600" : "from-blue-500 to-indigo-600"} text-white`}>
              <div className="flex items-center gap-3">
                <Image
                  src={user?.picture || '/default-avatar.png'}
                  width={40}
                  height={40}
                  className="rounded-full ring-2 ring-white/40"
                  alt="user"
                />
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{user?.given_name} {user?.family_name}</p>
                  <p className="text-xs text-blue-100 truncate">{user?.email}</p>
                </div>
              </div>
            </div>

            <div className="p-2">
              <Link
                href="/dashboard/settings"
                onClick={() => setOpenUserMenu(false)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200"
              >
                <User size={16} />
                Profile Settings
              </Link>

              <LogoutLink className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200 mt-1">
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
          className={`w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 transition-all duration-300 group ${collapsed ? "justify-center" : ""}`}
        >
          <Image
            src={user?.picture || '/default-avatar.png'}
            width={36}
            height={36}
            className="rounded-full ring-2 ring-blue-200 group-hover:ring-blue-400 transition-all shrink-0"
            alt="user"
          />
          <div className={`flex-1 text-left min-w-0 transition-all duration-300 ease-out ${collapsed ? "opacity-0 w-0 -translate-x-3 pointer-events-none overflow-hidden" : "opacity-100 w-auto translate-x-0"}`}>
            <h2 className="text-xs font-semibold text-slate-800 truncate">{user?.given_name} {user?.family_name}</h2>
            <h2 className="text-[10px] text-slate-400 truncate">{user?.email}</h2>
          </div>
          {!collapsed && (
            <span className="shrink-0">
              {openUserMenu ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronUp size={14} className="text-slate-400" />}
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
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
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