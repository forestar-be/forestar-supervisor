import type { Metadata } from 'next';
import SettingsTabs from '@/components/settings/settings-tabs';

export const metadata: Metadata = { title: 'Paramètres' };

export default function Page() {
  return <SettingsTabs />;
}
