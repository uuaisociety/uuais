'use client';

import React, { useState, useEffect } from 'react';
import AdminEvents from '@/components/AdminEvents';

const AdminPage = () => {
  const [showInfo, setShowInfo] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
      });

      const data = await response.json();

      if (response.ok) {
        setIsAuthenticated(true);
        localStorage.setItem('adminAuth', 'true');
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
    // Check if the user was previously authenticated
    if (localStorage.getItem('adminAuth') === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

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

  return (
    <div className="min-h-screen bg-[#121212]">
      {showInfo && (
        <div className="bg-yellow-500/20 p-4 text-yellow-200 text-sm">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <p>
              <strong>Note:</strong> This is a password-protected admin page. Please don't give too many ppl access.
            </p>
            <button onClick={() => setShowInfo(false)} className="text-yellow-200 hover:text-white">
              ✕
            </button>
          </div>
        </div>
      )}
      <div className="container mx-auto py-8">
        <div className="flex justify-end mb-4">
          <button
            onClick={() => {
              localStorage.removeItem('adminAuth');
              setIsAuthenticated(false);
            }}
            className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors text-sm"
          >
            Logout
          </button>
        </div>
        <AdminEvents />
      </div>
    </div>
  );
};

export default AdminPage; 
