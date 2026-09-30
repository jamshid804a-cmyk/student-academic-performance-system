"use client"

import React from "react"
import { UserX, Mail, LogOut } from "lucide-react"
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components"

export default function NoAccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-slate-400 via-blue-500 to-indigo-500" />

        <div className="p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-slate-100 mx-auto flex items-center justify-center mb-5">
            <UserX size={40} className="text-slate-600" />
          </div>

          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            No School Assigned
          </h1>

          <p className="text-slate-600 leading-relaxed mb-6">
            Your account is not linked to any school. Please contact the
            administrator to activate your school access.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6 text-left">
            <div className="flex items-start gap-3">
              <Mail size={18} className="text-slate-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Administrator
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  jamshid804a@gmail.com
                </p>
              </div>
            </div>
          </div>

          <LogoutLink className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition">
            <LogOut size={16} />
            Sign out
          </LogoutLink>
        </div>
      </div>
    </div>
  )
}