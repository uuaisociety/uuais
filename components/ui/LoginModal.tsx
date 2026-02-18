import { Button } from "@/components/ui/Button";
import { signInWithGooglePopup, signInWithGithubPopup } from '@/lib/firebase-client'
import { HugeiconsIcon } from '@hugeicons/react';
import { GithubIcon, GoogleIcon } from '@hugeicons/core-free-icons';
import Link from "next/link";

interface LoginCardProps {
    after: () => void;
}

const LoginCard: React.FC<LoginCardProps> = ({ after }) => {
    return (
        <div className="min-h-screen pt-24 pb-12 bg-gray-50 dark:bg-gray-900">
            <div className="max-w-xs mx-auto px-4">
                <div className="flex flex-col items-center justify-center pb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white pb-2">Login</h1>
                    <p className="text-gray-600 dark:text-gray-300 text-sm text-center">Please login using one of the providers below to continue.</p>
                </div>
                <div className="space-y-3 gap-1 flex flex-col justify-center">
                    <Button onClick={() => signInWithGooglePopup().then(after)}>
                        <span className="flex items-center gap-2"><HugeiconsIcon icon={GoogleIcon} className="h-4 w-4" /> Continue with Google</span>
                    </Button>
                    <Button onClick={() => signInWithGithubPopup().then(after)}>
                        <span className="flex items-center gap-2"><HugeiconsIcon icon={GithubIcon} className="h-4 w-4" /> Continue with GitHub</span>
                    </Button>
                    {/* <Button onClick={() => signInWithMicrosoftPopup().then(after)}>
                        <span className="flex items-center gap-2"><MicrosoftIcon className="h-4 w-4" /> Continue with Microsoft</span>
                    </Button> */}
                </div>
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