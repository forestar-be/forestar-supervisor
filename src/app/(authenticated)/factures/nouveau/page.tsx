import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Nouvelle facture' };

// Tranche E : écran en cours de portage depuis la version CRA.
export default function Page() {
  return <p className="p-6 text-muted-foreground">Nouvelle facture — en cours de portage.</p>;
}
