"use client"

export const dynamic = "force-dynamic"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs"
import {
  Loader2, Library, GraduationCap, Users, BookOpen,
  Wallet, ArrowRight, PlusCircle, Sparkles
} from "lucide-react"

export default function AcademyHomePage() {
  const { user } = useKindeBrowserClient() || {}
  const [stats, setStats] = useState({ students: 0, teachers: 0, courses: 0, fees: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const email = user?.email
    if (!email) return

    Promise.all([
      fetch(`/api/academy/student?email=${encodeURIComponent(email)}`, { cache: "no-store" }).then(r => r.json()),
      fetch(`/api/academy/teacher?email=${encodeURIComponent(email)}`, { cache: "no-store" }).then(r => r.json()),
      fetch(`/api/academy/courses?email=${encodeURIComponent(email)}`, { cache: "no-store" }).then(r => r.json()),
      fetch(`/api/academy/fee?email=${encodeURIComponent(email)}`, { cache: "no-store" }).then(r => r.json()),
    ])
      .then(([s, t, c, f]) => {
        setStats({
          students: s?.students?.length || 0,
          teachers: t?.teachers?.length || 0,
          courses: c?.courses?.length || 0,
          fees: f?.fees?.length || 0,
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.email])

  return (
    <div className="p-7">
      {/* Header */}
      <div className="mb-7">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white flex items-center justify-center shadow-md">
            <Library size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Academy Dashboard
            </h1>
            <p className="text-sm text-slate-500">
              Welcome back{user?.given_name ? `, ${user.given_name}` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="flex justify-center py-12 text-slate-400">
          <Loader2 className="animate-spin mr-2" /> Loading…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7">
            <StatCard
              icon={GraduationCap}
              label="Students"
              value={stats.students}
              color="purple"
            />
            <StatCard
              icon={Users}
              label="Teachers"
              value={stats.teachers}
              color="indigo"
            />
            <StatCard
              icon={BookOpen}
              label="Courses"
              value={stats.courses}
              color="fuchsia"
            />
            <StatCard
              icon={Wallet}
              label="Fee Records"
              value={stats.fees}
              color="emerald"
            />
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <Sparkles size={18} className="text-purple-600" />
              <h2 className="font-bold text-slate-800">Quick Actions</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <QuickAction
                icon={PlusCircle}
                title="Add Student"
                subtitle="Enroll in a course"
                href="/dashboard/academy/students"
                color="purple"
              />
              <QuickAction
                icon={PlusCircle}
                title="Add Teacher"
                subtitle="Register new staff"
                href="/dashboard/academy/teachers"
                color="indigo"
              />
              <QuickAction
                icon={BookOpen}
                title="Manage Courses"
                subtitle="Add or edit subjects"
                href="/dashboard/academy/courses"
                color="fuchsia"
              />
              <QuickAction
                icon={Wallet}
                title="Fee Collection"
                subtitle="Record fee payments"
                href="/dashboard/academy/fees"
                color="emerald"
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    purple: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
    indigo: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
    fuchsia: { bg: "bg-fuchsia-50", text: "text-fuchsia-700", border: "border-fuchsia-200" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  }[color] || { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" }

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-2xl p-5`}>
      <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center ${colors.text} mb-3 shadow-sm`}>
        <Icon size={20} />
      </div>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
        {label}
      </p>
      <p className={`text-2xl font-extrabold ${colors.text} mt-1`}>
        {value}
      </p>
    </div>
  )
}

function QuickAction({ icon: Icon, title, subtitle, href, color }) {
  const colors = {
    purple: "from-purple-500 to-fuchsia-600",
    indigo: "from-indigo-500 to-blue-600",
    fuchsia: "from-fuchsia-500 to-pink-600",
    emerald: "from-emerald-500 to-teal-600",
  }[color] || "from-slate-500 to-slate-600"

  return (
    <Link href={href}
      className="group flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition bg-white">
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colors} text-white flex items-center justify-center shadow-sm`}>
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-slate-800 text-sm">{title}</p>
        <p className="text-xs text-slate-500 truncate">{subtitle}</p>
      </div>
      <ArrowRight size={16} className="text-slate-400 group-hover:translate-x-1 transition" />
    </Link>
  )
}