import type { Metadata } from 'next';
import { PhoneCallbacksPageClient } from '@/components/phone-callbacks/phone-callbacks-page';

export const metadata: Metadata = { title: 'Appels' };

export default function Page() {
  return <PhoneCallbacksPageClient />;
}
