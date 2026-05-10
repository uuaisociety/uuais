'use client';

import AdminDashboard from '@/components/pages/admin/AdminDashboard';
import AdminGate from '@/components/auth/AdminGate';

const AdminPage = () => {
  return (
    <AdminGate>
      <AdminDashboard />
    </AdminGate>
  );
};

export default AdminPage; 