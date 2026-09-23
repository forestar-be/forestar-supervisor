import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { Button, EmptyState } from '@forestar-be/ui';

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <EmptyState
        icon={SearchX}
        title="Page introuvable"
        description="La page demandée n'existe pas ou a été déplacée."
        action={<Button nativeButton={false} render={<Link href="/" />}>Retour à l&apos;accueil</Button>}
      />
    </div>
  );
}
