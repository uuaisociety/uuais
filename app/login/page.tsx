'use client'

import React from 'react'
import { Button } from '@/components/ui/Button'
import { GithubIcon, GoogleIcon, MicrosoftIcon } from 'hugeicons-react'
import { signInWithGooglePopup, signInWithGithubPopup, signInWithMicrosoftPopup } from '@/lib/firebase-client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()

  const after = () => {
    // Redirect to previous or default
    router.push('/account')
  }

  return (
    <div className="min-h-screen pt-24 pb-12 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-xs mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Login</h1>
          <p className="text-gray-600 dark:text-gray-300 text-sm">Choose a provider to continue.</p>
        </div>
        <div className="space-y-3 gap-1 flex flex-col md:flex-column justify-center">
          <Button onClick={() => signInWithGooglePopup().then(after)}>
            <span className="flex items-center gap-2"><GoogleIcon className="h-4 w-4"/> Continue with Google</span>
          </Button>
          <Button variant="outline" onClick={() => signInWithGithubPopup().then(after)}>
            <span className="flex items-center gap-2"><GithubIcon className="h-4 w-4"/> Continue with GitHub</span>
          </Button>
          <Button variant="outline" onClick={() => signInWithMicrosoftPopup().then(after)}>
            <span className="flex items-center gap-2"><MicrosoftIcon className="h-4 w-4"/> Continue with Microsoft</span>
          </Button>
        </div>
        <div className="text-center mt-12">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            New here? <a href="/join" className="underline">Create an account</a>
          </p>
        </div>
      </div>
    </div>
  )
}
