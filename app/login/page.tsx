'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import LoginModal from '@/components/ui/LoginModal'
import { useAdmin } from '@/hooks/useAdmin'
import { updatePageMeta } from '@/utils/seo'
import { currentRedirect, joinUrl } from '@/lib/login-redirect'

export default function LoginPage() {
  const router = useRouter()
  const { user, profile, profileLoading } = useAdmin()

  useEffect(() => {
    updatePageMeta('Sign In', 'Sign in to your UU AI Society account');
  }, []);

  const after = () => {
    router.push(currentRedirect() || '/account')
  }

  // Read once on mount so the param survives the /join detour.
  const [redirect] = useState<string | null>(() => currentRedirect())

  // A provider account that never created a profile is signed out by the
  // RegistrationGate off /join; point the user at account creation.
  const needsAccount = user && !profileLoading && !(Boolean(profile?.isMember) && Boolean(profile?.privacyAcceptedAt))

  return (
    <div className="min-h-screen pt-24 pb-12 bg-gray-50 dark:bg-gray-900">
      {needsAccount && (
        <div className="max-w-xs mx-auto px-4 mb-4">
          <p className="p-3 rounded-md border border-yellow-300 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950 text-sm text-yellow-900 dark:text-yellow-200">
            This account hasn&apos;t created a profile yet —{' '}
            <Link href={joinUrl(redirect)} className="underline font-medium">create an account</Link> to continue.
          </p>
        </div>
      )}
      <LoginModal after={after} />
    </div>
  )
}