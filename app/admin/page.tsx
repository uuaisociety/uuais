'use client';

import React, { useState, useEffect } from 'react';
import AdminDashboard from '@/components/pages/admin/AdminDashboard';

const AdminPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
        credentials: 'include', // Include cookies
      });

      const data = await response.json();

      if (response.ok) {
        setIsAuthenticated(true);
        setPassword(''); // Clear password from memory
      } else {
        setError(data.message || 'Invalid password');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  useEffect(() => {
    // Check server-side authentication status
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth', {
          method: 'GET',
          credentials: 'include',
        });
        const data = await response.json();
        setIsAuthenticated(data.authenticated || false);
      } catch (err) {
        console.error('Auth check error:', err);
        setIsAuthenticated(false);
      } finally {
        setCheckingAuth(false);
      }
    };
    
    checkAuth();
  }, []);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-white">Checking authentication...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="bg-[#2a2a2a] rounded-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">Admin Login</h1>
          
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-500/20 text-red-300 p-3 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="password" className="block text-white mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-[#1a1a1a] text-white rounded-md border border-white/10 focus:outline-none focus:border-[#c8102e]"
                required
                autoComplete="current-password"
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2 bg-[#c8102e] text-white rounded-md hover:bg-[#a00d24] transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Authenticating...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <AdminDashboard />;

  // return (
  //   <div className="min-h-screen bg-[#121212]">
  //     {showInfo && (
  //       <div className="bg-yellow-500/20 p-4 text-yellow-200 text-sm">
  //         <div className="max-w-7xl mx-auto flex justify-between items-center">
  //           <p>
  //             <strong>Note:</strong> This is a password-protected admin page.
  //           </p>
  //           <button onClick={() => setShowInfo(false)} className="text-yellow-200 hover:text-white">
  //             ✕
  //           </button>
  //         </div>
  //       </div>
  //     )}
  //     <div className="container mx-auto py-8">
  //       <div className="flex justify-end mb-4">
  //         <button
  //           onClick={() => {
  //             localStorage.removeItem('adminAuth');
  //             setIsAuthenticated(false);
  //           }}
  //           className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors text-sm"
  //         >
  //           Logout
  //         </button>
  //       </div>
  //       <AdminEvents />
  //     </div>
  //   </div>
  // );
};

export default AdminPage; 