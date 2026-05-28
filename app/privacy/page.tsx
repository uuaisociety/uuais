import { PrivacyPage } from '@/components/pages/PrivacyPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | UU AI Society',
  description: 'Privacy policy and GDPR compliance for UU AI Society',
};

export default function Privacy() {
  return <PrivacyPage />;
}
