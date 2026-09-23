import type { Metadata } from 'next';
import { CalendarPageClient } from '@/components/calendar/calendar-page';

export const metadata: Metadata = { title: 'Calendrier' };

export default function Page() {
  return <CalendarPageClient />;
}
