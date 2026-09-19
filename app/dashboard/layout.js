"use client"

import React from 'react'
import dynamic from 'next/dynamic'
import { Toaster } from "sonner"

// ✅ Load SideNav and Header ONLY on the client — they use Kinde/Theme contexts
const SideNav = dynamic(() => import('./_component/SideNav'), { ssr: false })
const Header = dynamic(() => import('./_component/Header'), { ssr: false })

function DashboardLayout({ children }) {
  return (
    <div>
      <div className='md:w-64 fixed hidden md:block'>
        <SideNav />
      </div>

      <div className='md:ml-64'>
        <Header />
        <Toaster />
        {children}
      </div>
    </div>
  )
}

export default DashboardLayout