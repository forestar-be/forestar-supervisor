import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Factures' };

// Tranche E : écran en cours de portage depuis la version CRA.
export default function Page() {
  return <p className="p-6 text-muted-foreground">Factures — en cours de portage.</p>;
}
