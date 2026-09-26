import type { Metadata } from 'next';
import ClientMergeView from '@/components/clients/client-merge-view';

export const metadata: Metadata = { title: 'Fusionner des clients' };

export default function Page() {
  return <ClientMergeView />;
}
