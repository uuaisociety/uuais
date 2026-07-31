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
    const params = new URLSearchParams(window.location.search)
    const redirect = params.get('redirect')
    // Only allow local paths to prevent open redirects to external sites
    // (including protocol-relative URLs like //evil.com)
    router.push(redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/account')
  }

  return (
    <div className="min-h-screen pt-24 pb-12 bg-gray-50 dark:bg-gray-900">
      <LoginModal after={after} />
    </div>
  )
}