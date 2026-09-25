'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@forestar-be/ui';
import { hasInAppHistory } from '@/lib/in-app-history';

/**
 * Retour à la page d'où l'on vient, comme le bouton du navigateur. Sans page
 * précédente dans l'application (lien direct, rechargement), va à `fallback`.
 *
 * Largeur ajustée au libellé et calée à gauche, même dans une colonne flex
 * qui étire ses enfants.
 */
export default function BackButton({ fallback }: { fallback: string }) {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-fit self-start"
      onClick={() => {
        if (hasInAppHistory()) router.back();
        else router.push(fallback);
      }}
    >
      <ArrowLeft />
      Retour
    </Button>
  );
}
