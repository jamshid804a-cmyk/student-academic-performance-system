"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, School, Library, AlertTriangle, ArrowRight, Wallet } from "lucide-react"
import GlobalApi from "@/app/_services/GlobalApi"
import { useProgram } from "@/src/context/ProgramContext"

export default function NoSectionPage() {
  const router = useRouter()
  const { setProgram } = useProgram()
  const [sections, setSections] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    GlobalApi.GetOrgSections()
      .then((resp) => {
        if (resp?.data?.success) setSections(resp.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // If a section becomes active (e.g. owner approved a payment), send user back
  useEffect(() => {
    if (!sections) return
    const sActive = sections.schoolSection?.active === true
    const aActive = sections.academySection?.active === true
    if (sActive || aActive) {
      const pick = sActive ? "school" : "academy"
      setProgram(pick)
      router.replace("/dashboard")
    }
  }, [sections, router, setProgram])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-400">
        <Loader2 className="animate-spin mr-2" /> Loading…
      </div>
    )
  }

  if (!sections) {
    return (
      <div className="p-8 text-center text-slate-500">
        Could not load organization info. Contact admin.
      </div>
    )
  }

  const pkg = sections.package || "school"
  const sSection = sections.schoolSection || { active: false, price: 0 }
  const aSection = sections.academySection || { active: false, price: 0 }

  // Which sections should we offer to renew?
  const showSchool = pkg === "school" || pkg === "both"
  const showAcademy = pkg === "academy" || pkg === "both"

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="max-w-3xl w-full">
        {/* Header card */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="bg-gradient-to-br from-rose-500 to-red-600 px-8 py-8 text-white">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                <AlertTriangle size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Subscription Required</h1>
                <p className="text-sm text-rose-100 mt-1">
                  {sections.schoolName} — no active section right now
                </p>
              </div>
            </div>
          </div>

          <div className="p-8">
            <p className="text-slate-600 dark:text-slate-300 text-sm mb-6">
              All sections of your organization are currently suspended or expired.
              Choose a section below to renew it and regain access.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {showSchool && (
                <SectionCard
                  icon={School}
                  label="School Section"
                  color="blue"
                  section={sSection}
                  href="/dashboard/pay/school"
                />
              )}
              {showAcademy && (
                <SectionCard
                  icon={Library}
                  label="Academy Section"
                  color="purple"
                  section={aSection}
                  href="/dashboard/pay/academy"
                />
              )}
            </div>

            <div className="mt-6 text-center text-xs text-slate-400">
              After payment, admin will verify and reactivate your section.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionCard({ icon: Icon, label, color, section, href }) {
  const price = Number(section?.price) || 0
  const note = section?.priceNote || ""
  const canPay = price > 0

  const colorMap = {
    blue: {
      bg: "bg-blue-50 dark:bg-blue-900/20",
      border: "border-blue-200 dark:border-blue-800",
      text: "text-blue-700 dark:text-blue-300",
      btn: "bg-blue-600 hover:bg-blue-700",
    },
    purple: {
      bg: "bg-purple-50 dark:bg-purple-900/20",
      border: "border-purple-200 dark:border-purple-800",
      text: "text-purple-700 dark:text-purple-300",
      btn: "bg-purple-600 hover:bg-purple-700",
    },
  }
  const c = colorMap[color] || colorMap.blue

  return (
    <div className={`rounded-2xl border-2 ${c.border} ${c.bg} p-5`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-11 h-11 rounded-xl ${c.bg} flex items-center justify-center ${c.text}`}>
          <Icon size={22} />
        </div>
        <div>
          <p className="font-bold text-slate-800 dark:text-slate-100 text-base">
            {label}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {section?.active ? "Active" : "Suspended"}
          </p>
        </div>
      </div>

      {canPay ? (
        <>
          <div className="mb-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide font-bold">
              Renewal Amount
            </p>
            <p className={`text-2xl font-extrabold ${c.text}`}>
              Rs. {price.toLocaleString()}
            </p>
            {note && (
              <p className="text-[11px] text-slate-400 mt-1 italic">{note}</p>
            )}
          </div>
          <Link href={href}>
            <button
              className={`w-full ${c.btn} text-white font-bold text-sm py-3 rounded-xl flex items-center justify-center gap-2 transition shadow-md hover:shadow-lg`}
            >
              <Wallet size={16} />
              Pay Now
              <ArrowRight size={16} />
            </button>
          </Link>
        </>
      ) : (
        <div className="text-center py-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pricing not set. Please contact admin.
          </p>
        </div>
      )}
    </div>
  )
}