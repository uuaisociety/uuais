"use client";

import React from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/Button';
import LoginModal from '@/components/ui/LoginModal';
import { useRouter } from 'next/navigation';
import { GoogleIcon } from 'hugeicons-react'
interface AdminGateProps {
  children: React.ReactNode;
}

const AdminGate: React.FC<AdminGateProps> = ({ children }) => {
  const router = useRouter();
  const { user, isAdmin, loading, signInWithGoogle } = useAdmin();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-700 dark:text-gray-200">
        Checking permissions...
      </div>
    );
  }

  if (!user) {
    return (<LoginModal after={() => router.push('/admin')} />);
  }

  if (!isAdmin) {
    return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Admin Access Required</h1>

        <p className="text-gray-600 dark:text-gray-300 mb-6">
         You are not authorized to access this page. Please sign in with a Google account that has admin access.
        </p>
        <div className="space-y-3">
          <Button onClick={signInWithGoogle} className="w-full"><GoogleIcon /> Sign in with Google</Button>
        </div>
      </div>
    </div>
    );
  }

  return (
    <div>
      {children}
    </div>
  );
};

export default AdminGate;
