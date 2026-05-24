'use client';

import AdminDashboard from '@/components/pages/admin/AdminDashboard';
import AdminGate from '@/components/auth/AdminGate';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

const AdminPage = () => {
  return (
    <AdminGate>
      <ErrorBoundary>
        <AdminDashboard />
      </ErrorBoundary>
    </AdminGate>
  );
};

export default AdminPage; 