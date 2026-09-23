import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Accueil' };

// Tranche A : écran en cours de portage depuis la version CRA.
export default function Page() {
  return <p className="p-6 text-muted-foreground">Accueil — en cours de portage.</p>;
}
