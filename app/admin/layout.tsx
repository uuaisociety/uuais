import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Dashboard - Event Management',
  description: 'Manage events and applications',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
    </>
  );
} 