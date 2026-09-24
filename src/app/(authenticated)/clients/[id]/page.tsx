import type { Metadata } from 'next';
import ClientDetailView from '@/components/clients/client-detail-view';

export const metadata: Metadata = { title: 'Client' };

export default function Page() {
  return <ClientDetailView />;
}
