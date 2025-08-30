'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ApplicationPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home page with hash
    router.push('/#application');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a]">
      <div className="text-center">
        <p className="text-white/80">Redirecting to application section...</p>
      </div>
    </div>
  );
} 