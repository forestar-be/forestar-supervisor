'use client';

import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import type { ColumnDef } from '@forestar-be/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
} from '@forestar-be/ui';
import dayjs from '@/lib/dayjs';
import type { MachineRepairListItem } from '@/lib/types';

const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  SENT: 'Envoyée',
  PAID: 'Payée',
};

const INVOICE_STATUS_TONE: Record<
  string,
  'info' | 'warning' | 'success' | 'neutral'
> = {
  DRAFT: 'info',
  SENT: 'warning',
  PAID: 'success',
};

/**
 * Cellule d'édition en ligne du réparateur.
 *
 * `stopPropagation` : la ligne du tableau navigue vers la fiche au clic, ce
 * select doit intercepter le sien pour ne pas déclencher la navigation.
 */
function RepairerCell({
  repair,
  repairerNames,
  onChange,
}: {
  repair: MachineRepairListItem;
  repairerNames: string[];
  onChange: (id: number, previous: string | null, next: string | null) => void;
}) {
  const value = repair.repairer_name ?? 'Non affecté';
  return (
    <div onClick={(event) => event.stopPropagation()} className="min-w-[130px]">
      <Select
        value={value}
        onValueChange={(next) =>
          onChange(
            repair.id,
            repair.repairer_name,
            next === 'Non affecté' ? null : next,
          )
        }
      >
        <SelectTrigger size="sm" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Non affecté">Non affecté</SelectItem>
          {repairerNames.map((name) => (
            <SelectItem key={name} value={name}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function buildRepairsColumns({
  colorByState,
  repairerNames,
  onRepairerChange,
}: {
  colorByState: Record<string, string>;
  repairerNames: string[];
  onRepairerChange: (
    id: number,
    previous: string | null,
    next: string | null,
  ) => void;
}): ColumnDef<MachineRepairListItem>[] {
  return [
    {
      id: 'id',
      accessorKey: 'id',
      header: 'N°',
      size: 64,
      cell: ({ getValue }) => (
        <span className="font-medium">#{getValue<number>()}</span>
      ),
    },
    {
      id: 'state',
      size: 170,
      accessorFn: (row) => row.state || 'Non commencé',
      header: 'État',
      cell: ({ getValue }) => {
        const state = getValue<string>();
        return (
          <span
            className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium text-black"
            style={{ backgroundColor: colorByState[state] || '#e0e0e0' }}
          >
            {state}
          </span>
        );
      },
    },
    {
      id: 'lastCall',
      size: 150,
      accessorFn: (row) => row.client_call_times.length,
      header: 'Appel client',
      enableSorting: false,
      cell: ({ row }) => {
        const calls = row.original.client_call_times;
        if (!calls.length) {
          return <span className="text-muted-foreground">-</span>;
        }
        const last = calls[calls.length - 1];
        return (
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            {dayjs(last).format('DD/MM/YYYY HH:mm')}
            <CheckCircle2 className="size-4 text-success" />
          </span>
        );
      },
    },
    {
      id: 'repair_or_maintenance',
      size: 110,
      accessorKey: 'repair_or_maintenance',
      header: 'Type',
    },
    {
      id: 'machineType',
      size: 200,
      accessorFn: (row) =>
        row.robot_type_name
          ? `${row.robot_type_name} (${row.machine_type_name || ''})`
          : row.machine_type_name || '-',
      header: 'Type de machine',
    },
    {
      id: 'repairer_name',
      size: 160,
      accessorFn: (row) => row.repairer_name || 'Non affecté',
      header: 'Réparateur',
      cell: ({ row }) => (
        <RepairerCell
          repair={row.original}
          repairerNames={repairerNames}
          onChange={onRepairerChange}
        />
      ),
    },
    {
      id: 'client',
      size: 170,
      accessorFn: (row) =>
        `${row.first_name || ''} ${row.last_name || ''}`.trim(),
      header: 'Client',
    },
    {
      id: 'phone',
      size: 140,
      accessorFn: (row) => row.phone || '-',
      header: 'Téléphone',
    },
    {
      id: 'invoice',
      size: 110,
      accessorFn: (row) => row.serviceInvoice?.status ?? null,
      header: 'Facture',
      enableSorting: false,
      cell: ({ row }) => {
        const invoice = row.original.serviceInvoice;
        if (!invoice) {
          return <span className="text-muted-foreground">Aucune</span>;
        }
        return (
          <Link
            href={`/factures/${invoice.id}`}
            onClick={(event) => event.stopPropagation()}
            className="inline-flex"
          >
            <StatusBadge
              tone={INVOICE_STATUS_TONE[invoice.status] ?? 'neutral'}
            >
              {INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status}
            </StatusBadge>
          </Link>
        );
      },
    },
    {
      id: 'createdAt',
      size: 150,
      accessorKey: 'createdAt',
      header: 'Date de création',
      cell: ({ getValue }) =>
        dayjs(getValue<string>()).format('DD/MM/YYYY HH:mm'),
    },
  ];
}
