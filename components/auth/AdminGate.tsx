"use client";

import React, { useState } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/Button';

interface AdminGateProps {
  children: React.ReactNode;
}

const AdminGate: React.FC<AdminGateProps> = ({ children }) => {
  const { user, isAdmin, loading, signInWithGoogle, logout, enableDev, devActive, tryDevElevate, clearDevAdmin } = useAdmin();
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');

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
            {enableDev && (
              <div className="text-left border-t border-gray-200 dark:border-gray-700 pt-4">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 font-medium">Dev Admin Override</p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={pwd}
                    onChange={(e) => { setPwd(e.target.value); setErr(''); }}
                    placeholder="Enter dev admin password"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
                  />
                  <Button
                    onClick={() => {
                      const ok = tryDevElevate(pwd);
                      if (!ok) {
                        setErr('Invalid password');
                      } else {
                        setPwd('');
                        setErr('');
                      }
                    }}
                    variant="outline"
                  >Dev Elevate</Button>
                </div>
                {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
                {!err && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Dev override is for local development only. Disable it by setting NEXT_PUBLIC_ENABLE_DEV_ADMIN to false.</p>
                )}
              </div>
            )}
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
        {enableDev && devActive && (
          <div className="px-3 py-1 rounded bg-amber-500 text-white text-sm flex items-center gap-2">
            Dev Admin Override Active
            <Button size="sm" variant="outline" onClick={clearDevAdmin}>Clear</Button>
          </div>
        )}
        {user && <Button variant="outline" onClick={logout}>Logout</Button>}
      </div>
      {children}
    </div>
  );
};

export default AdminGate;
