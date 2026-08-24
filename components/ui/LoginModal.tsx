'use client'

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { signInWithGooglePopup, signInWithGithubPopup } from '@/lib/firebase-client'
import { getUserProfile } from '@/lib/firestore'
import { useRouter } from 'next/navigation'

import type { FC } from "react";
import Link from "next/link";
import { GoogleIcon, GithubIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";


interface LoginCardProps {
    after: () => void;
}

const LoginCard: FC<LoginCardProps> = ({ after }) => {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    // A provider account that never created a profile is signed out by the
    // RegistrationGate off /join; send it to /join to complete account creation.
    const handleAuth = async (signIn: () => Promise<{ uid: string }>) => {
        setError(null);
        try {
            const user = await signIn();
            let completed = true;
            try {
                const profile = await getUserProfile(user.uid);
                completed = Boolean(profile?.isMember) && Boolean(profile?.privacyAcceptedAt);
            } catch (e) {
                console.warn('Failed to load profile after sign-in:', e);
            }
            if (!completed) {
                router.push('/join');
                return;
            }
            after();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Sign-in failed. Please try again.');
            console.error('Sign-in failed:', e);
        }
    };

    return (
        <div className="min-h-screen pt-24 pb-12 bg-gray-50 dark:bg-gray-900">
            <div className="max-w-xs mx-auto px-4">
                <div className="flex flex-col items-center justify-center pb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white pb-2">Login</h1>
                    <p className="text-gray-600 dark:text-gray-300 text-sm text-center">Please login using one of the providers below to continue.</p>
                </div>
                <div className="space-y-3 gap-1 flex flex-col justify-center">
                    <Button variant="outline" onClick={() => handleAuth(signInWithGooglePopup)}>
                        <span className="flex items-center gap-2"><HugeiconsIcon icon={GoogleIcon} className="h-4 w-4" /> Continue with Google</span>
                    </Button>
                    <Button variant="outline" onClick={() => handleAuth(signInWithGithubPopup)}>
                        <span className="flex items-center gap-2"><HugeiconsIcon icon={GithubIcon} className="h-4 w-4" /> Continue with GitHub</span>
                    </Button>
                    {/* <Button onClick={() => signInWithMicrosoftPopup().then(after)}>
                        <span className="flex items-center gap-2"><MicrosoftIcon className="h-4 w-4" /> Continue with Microsoft</span>
                    </Button> */}
                </div>
                {error && (
                    <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400 text-center">
                        {error}
                    </p>
                )}
                <div className="text-center mt-8">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        New here? <Link href="/join" className="underline">Create an account</Link>
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        <Link href="/privacy" className="underline">Privacy Policy</Link>
                        {/* | <Link href="/terms" className="underline">Terms of Service</Link> */}
                    </p>
                </div>
            </div>
        </div>
    );
}
export default LoginCard;