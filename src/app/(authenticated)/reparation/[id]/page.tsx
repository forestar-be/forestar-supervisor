import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Réparation' };

// Tranche B : écran en cours de portage depuis la version CRA.
export default function Page() {
  return <p className="p-6 text-muted-foreground">Réparation — en cours de portage.</p>;
}
