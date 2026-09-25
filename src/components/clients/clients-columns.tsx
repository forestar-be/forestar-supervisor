'use client';

import type { ColumnDef } from '@forestar-be/ui';
import dayjs from '@/lib/dayjs';
import type { ClientSummary } from '@/lib/types';

/**
 * Colonnes de `/clients` (AC-01) : nom, téléphone, email, ville, nombre de
 * passages et dernier passage. Le tri par défaut se fait sur ce dernier,
 * décroissant, comme le renvoie déjà `GET /supervisor/clients`.
 */
export function buildClientsColumns(): ColumnDef<ClientSummary>[] {
  return [
    {
      id: 'name',
      size: 220,
      // Trié sur le nom de famille, affiché « Prénom Nom ».
      accessorFn: (row) => `${row.lastName || ''} ${row.firstName || ''}`.trim(),
      cell: ({ row }) =>
        `${row.original.firstName || ''} ${row.original.lastName || ''}`.trim(),
      header: 'Nom',
    },
    {
      id: 'phone',
      size: 150,
      accessorFn: (row) => row.phone || '-',
      header: 'Téléphone',
    },
    {
      id: 'email',
      size: 220,
      accessorFn: (row) => row.email || '-',
      header: 'Email',
    },
    {
      id: 'city',
      size: 150,
      accessorFn: (row) => row.city || '-',
      header: 'Ville',
    },
    {
      id: 'repairCount',
      size: 110,
      accessorKey: 'repairCount',
      header: 'Passages',
    },
    {
      id: 'lastEntryDate',
      size: 150,
      accessorFn: (row) => row.lastEntryDate ?? '',
      header: 'Dernier passage',
      cell: ({ getValue }) => {
        const value = getValue<string>();
        return value ? dayjs(value).format('DD/MM/YYYY') : '—';
      },
    },
  ];
}
