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
import { RepairStateBadge } from './repair-state-badge';

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
  // Fiche archivée (R001, D-18) : en lecture seule, ce changement serait
  // refusé par le serveur (409 repair_archived) — autant ne pas le proposer.
  const disabled = Boolean(repair.archived_at);
  return (
    <div onClick={(event) => event.stopPropagation()} className="min-w-[130px]">
      <Select
        value={value}
        disabled={disabled}
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

/**
 * Colonnes du tableau, dans leur ordre d'affichage, avec l'explication montrée
 * dans « Paramètres ». Les en-têtes du tableau en viennent aussi : un nom
 * changé ici change aux deux endroits.
 */
export const REPAIRS_COLUMN_CHOICES = [
  { id: 'id', label: 'N°', description: 'Numéro de la fiche.' },
  {
    id: 'state',
    label: 'État',
    description: 'Avancement de la réparation, et le badge « Archivée ».',
  },
  {
    id: 'lastCall',
    label: 'Appel client',
    description: 'Date du dernier appel au client.',
  },
  {
    id: 'repair_or_maintenance',
    label: 'Type',
    description: 'Réparation ou entretien.',
  },
  {
    id: 'machineType',
    label: 'Type de machine',
    description: 'Type de machine, et le modèle pour un robot.',
  },
  {
    id: 'repairer_name',
    label: 'Réparateur',
    description: 'Réparateur affecté, modifiable depuis le tableau.',
  },
  { id: 'client', label: 'Client', description: 'Prénom et nom du client.' },
  { id: 'phone', label: 'Téléphone', description: 'Téléphone du client.' },
  {
    id: 'invoice',
    label: 'Facture',
    description: 'Statut de la facture liée à la fiche.',
  },
  {
    id: 'createdAt',
    label: 'Date de création',
    description:
      "Date et heure de saisie de la fiche. D'ordinaire identique à la date d'entrée.",
  },
  {
    id: 'entry_date',
    label: 'Entrée',
    description: "Date d'arrivée de la machine à l'atelier.",
  },
  {
    id: 'exit_date',
    label: 'Sortie',
    description: 'Date de remise de la machine au client.',
  },
] as const;

type RepairsColumnId = (typeof REPAIRS_COLUMN_CHOICES)[number]['id'];

const COLUMN_LABELS = Object.fromEntries(
  REPAIRS_COLUMN_CHOICES.map((choice) => [choice.id, choice.label]),
) as Record<RepairsColumnId, string>;

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
      header: COLUMN_LABELS.id,
      size: 64,
      cell: ({ getValue }) => (
        <span className="font-medium">#{getValue<number>()}</span>
      ),
    },
    {
      id: 'state',
      size: 170,
      accessorFn: (row) => row.state || 'Non commencé',
      header: COLUMN_LABELS.state,
      cell: ({ getValue, row }) => {
        const state = getValue<string>();
        return (
          <RepairStateBadge
            state={state}
            color={colorByState[state]}
            archived={Boolean(row.original.archived_at)}
          />
        );
      },
    },
    {
      id: 'lastCall',
      size: 150,
      accessorFn: (row) => row.client_call_times.length,
      header: COLUMN_LABELS.lastCall,
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
      header: COLUMN_LABELS.repair_or_maintenance,
    },
    {
      id: 'machineType',
      size: 200,
      accessorFn: (row) =>
        row.robot_type_name
          ? `${row.robot_type_name} (${row.machine_type_name || ''})`
          : row.machine_type_name || '-',
      header: COLUMN_LABELS.machineType,
    },
    {
      id: 'repairer_name',
      size: 160,
      accessorFn: (row) => row.repairer_name || 'Non affecté',
      header: COLUMN_LABELS.repairer_name,
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
        `${row.client.firstName || ''} ${row.client.lastName || ''}`.trim(),
      header: COLUMN_LABELS.client,
    },
    {
      id: 'phone',
      size: 140,
      accessorFn: (row) => row.client.phone || '-',
      header: COLUMN_LABELS.phone,
    },
    {
      id: 'invoice',
      size: 110,
      accessorFn: (row) => row.serviceInvoice?.status ?? null,
      header: COLUMN_LABELS.invoice,
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
      header: COLUMN_LABELS.createdAt,
      cell: ({ getValue }) =>
        dayjs(getValue<string>()).format('DD/MM/YYYY HH:mm'),
    },
    {
      id: 'entry_date',
      size: 120,
      accessorKey: 'entry_date',
      header: COLUMN_LABELS.entry_date,
      cell: ({ getValue }) => {
        const value = getValue<string | null>();
        return value ? dayjs(value).format('DD/MM/YYYY') : '—';
      },
    },
    {
      id: 'exit_date',
      size: 120,
      accessorKey: 'exit_date',
      header: COLUMN_LABELS.exit_date,
      cell: ({ getValue }) => {
        const value = getValue<string | null>();
        return value ? dayjs(value).format('DD/MM/YYYY') : '—';
      },
    },
  ];
}
