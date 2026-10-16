import type { Metadata } from 'next';
import { StoragePage } from '@/components/storage/storage-page';
export const metadata: Metadata = { title: 'Rangement' };
export default function Page() {
  return <StoragePage />;
}
