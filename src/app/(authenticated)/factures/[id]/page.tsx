import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Facture' };

// Tranche E : écran en cours de portage depuis la version CRA.
export default function Page() {
  return <p className="p-6 text-muted-foreground">Facture — en cours de portage.</p>;
}
