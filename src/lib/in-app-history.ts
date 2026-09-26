'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Nombre de pages vues dans l'application depuis son chargement.
 *
 * Un bouton « Retour » ne peut appeler `router.back()` que si la page
 * précédente est dans l'application : sinon, une fiche ouverte depuis un lien
 * ou un favori renverrait hors de l'atelier. L'historique du navigateur ne dit
 * pas d'où vient l'entrée précédente ; ce compteur, lui, ne compte que les
 * changements de page faits par le routeur. Il repart de zéro à chaque
 * rechargement, ce qui est voulu.
 */
let pagesSeen = 0;
let lastPathname: string | null = null;

/**
 * À monter une fois, dans la coquille : compte chaque changement de page.
 * Compare au dernier chemin vu, parce qu'un effet peut s'exécuter deux fois
 * pour la même page (mode strict de React, remontage de la coquille).
 */
export function useTrackInAppHistory(): void {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname === lastPathname) return;
    lastPathname = pathname;
    pagesSeen += 1;
  }, [pathname]);
}

/** Vrai si une page de l'application précède la page courante. */
export function hasInAppHistory(): boolean {
  return pagesSeen > 1;
}
