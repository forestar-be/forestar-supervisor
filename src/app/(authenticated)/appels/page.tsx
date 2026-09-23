import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Appels' };

// Tranche C : écran en cours de portage depuis la version CRA.
export default function Page() {
  return <p className="p-6 text-muted-foreground">Appels — en cours de portage.</p>;
}
