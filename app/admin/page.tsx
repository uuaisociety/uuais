'use client';

import React from 'react';
import AdminDashboard from '@/components/pages/admin/AdminDashboard';
import AdminGate from '@/components/auth/AdminGate';

const AdminPage = () => {
  // Centralize all admin authentication in AdminGate (Google + dev override)
  return (
    <AdminGate>
      <AdminDashboard />
    </AdminGate>
  );
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