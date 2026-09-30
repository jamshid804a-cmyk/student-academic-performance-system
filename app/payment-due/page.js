"use client"

import React from "react"
import Link from "next/link"
import { AlertTriangle, Wallet, Mail, LogOut } from "lucide-react"
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components"

export default function PaymentDuePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />

        <div className="p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-amber-100 mx-auto flex items-center justify-center mb-5">
            <AlertTriangle size={40} className="text-amber-600" />
          </div>

          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Subscription Expired
          </h1>

          <p className="text-slate-600 leading-relaxed mb-6">
            Your school's monthly subscription to <b>Student Academic Performance System</b> has expired.
            Please contact the administrator to renew and regain access.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 text-left">
            <div className="flex items-start gap-3 mb-3">
              <Wallet size={18} className="text-amber-700 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Pay your monthly fee
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Once your payment is recorded, access will be restored immediately.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail size={18} className="text-amber-700 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Contact us
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  jamshid804a@gmail.com
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400 mb-6">
            Once you pay, the administrator will reactivate your account.
            You will be able to log in again right after.
          </p>

          <LogoutLink className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition">
            <LogOut size={16} />
            Sign out
          </LogoutLink>
        </div>
      </div>
    </div>
  )
}