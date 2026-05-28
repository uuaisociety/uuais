'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LoginModal from '@/components/ui/LoginModal'
import { updatePageMeta } from '@/utils/seo'

export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    updatePageMeta('Sign In', 'Sign in to your UU AI Society account');
  }, []);

  const after = () => {
    router.push('/account')
  }

  return (
    <div className="min-h-screen pt-24 pb-12 bg-gray-50 dark:bg-gray-900">
      <LoginModal after={after} />
    </div>
  )
}