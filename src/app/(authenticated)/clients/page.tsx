import type { Metadata } from 'next';
import ClientsListView from '@/components/clients/clients-list-view';

export const metadata: Metadata = { title: 'Clients' };

export default function Page() {
  return <ClientsListView />;
}
