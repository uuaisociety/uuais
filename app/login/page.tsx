'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import LoginModal from '@/components/ui/LoginModal'

export default function LoginPage() {
  const router = useRouter()

  const after = () => {
    // Redirect to previous or default
    router.push('/account')
  }

  return (
    <div className="min-h-screen pt-24 pb-12 bg-gray-50 dark:bg-gray-900">
      <LoginModal after={after} />
    </div>
  )
}