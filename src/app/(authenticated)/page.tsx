import type { Metadata } from 'next';
import RepairsListView from '@/components/repairs/RepairsListView';

export const metadata: Metadata = { title: 'Accueil' };

export default function Page() {
  return <RepairsListView />;
}
