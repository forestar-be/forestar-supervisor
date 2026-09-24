'use client';

import { StatusBadge } from '@forestar-be/ui';

/**
 * État d'une fiche, coloré par `config['États']` (des données, d'où le style
 * inline), avec la marque « Archivée » si demandé. Partagé par la liste des
 * fiches et l'historique.
 */
export function RepairStateBadge({
  state,
  color,
  archived = false,
}: {
  state: string;
  color: string | undefined;
  archived?: boolean;
}) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span
        className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium text-black"
        style={{ backgroundColor: color || '#e0e0e0' }}
      >
        {state}
      </span>
      {archived && <StatusBadge tone="neutral">Archivée</StatusBadge>}
    </span>
  );
}
