import type { Metadata } from 'next';
import { RepairPageClient } from '@/components/repair/repair-page';

export const metadata: Metadata = { title: 'Réparation' };

export default function Page() {
  return <RepairPageClient />;
}
