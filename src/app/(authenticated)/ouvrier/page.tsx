import type { Metadata } from 'next';
import RepairerWorkView from '@/components/repairer/RepairerWorkView';

export const metadata: Metadata = { title: 'Ouvrier' };

export default function Page() {
  return <RepairerWorkView />;
}
