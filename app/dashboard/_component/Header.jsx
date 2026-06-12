"use client"
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs'
import Image from 'next/image';
import React from 'react'

const Header = () => {

  const {user}=useKindeBrowserClient();
  return (
    <div className='p-4 shadow-sm border flex justify-between'>
    <div>

    </div>
    <div>
      
      <Image 
      src={user?.picture || "/default-avatar.png"}
      height={35}
      width={35}
      alt='user avatar'
      className='rounded-full'/>
    </div>
    </div>
  )
}

export default Header
