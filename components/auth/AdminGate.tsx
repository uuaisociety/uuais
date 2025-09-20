"use client";

import React from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/Button';

interface AdminGateProps {
  children: React.ReactNode;
}

const AdminGate: React.FC<AdminGateProps> = ({ children }) => {
  const { user, isAdmin, loading, signInWithGoogle, logout } = useAdmin();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-700 dark:text-gray-200">
        Checking permissions...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Admin Access Required</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Please sign in with a Google account that has admin access.
          </p>
          <div className="space-y-3">
            <Button onClick={signInWithGoogle} className="w-full">Sign in with Google</Button>
          </div>
          {!!user && !isAdmin && (
            <p className="mt-4 text-sm text-red-600 dark:text-red-400">
              You are signed in but do not have admin privileges.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="fixed top-3 right-3 z-40 flex gap-2 items-center">
        {user && <Button variant="outline" onClick={logout}>Logout</Button>}
      </div>
      {children}
    </div>
  );
};

export default AdminGate;
