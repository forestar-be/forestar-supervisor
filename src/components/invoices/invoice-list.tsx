'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getServiceInvoices, getServiceInvoicePdf } from '@/lib/api';
import { notifyError } from '@/lib/notifications';
import { usePersistedState } from '@/lib/use-persisted-state';
import dayjs from '@/lib/dayjs';
import {
  formatCurrency,
  getInvoiceStatusLabel,
  getInvoiceStatusTone,
  getPaymentMethodLabel,
} from '@/lib/invoice';
import {
  PaymentMethod,
  ServiceInvoice,
  ServiceInvoiceStatus,
} from '@/lib/types';
import {
  Button,
  DataTable,
  type DataTableState,
  EmptyState,
  Input,
  MultiCombobox,
  PageHeader,
  StatusBadge,
} from '@forestar-be/ui';
import type { ColumnDef } from '@forestar-be/ui';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Eye,
  MinusCircle,
  Pencil,
  Plus,
  RotateCcw,
  Search,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: ServiceInvoiceStatus.DRAFT, label: 'Brouillon' },
  { value: ServiceInvoiceStatus.SENT, label: 'Envoyée' },
  { value: ServiceInvoiceStatus.PAID, label: 'Payée' },
];

const TABLE_STATE_KEY = 'atelier.facturesTable';

function SyncIcon({ status }: { status: string | null }) {
  if (status === 'synced')
    return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  if (status === 'error')
    return <AlertCircle className="h-4 w-4 text-amber-500" />;
  return <MinusCircle className="h-4 w-4 text-muted-foreground/40" />;
}

/**
 * Liste des factures de service (réparation), portée depuis
 * `ServiceInvoices.tsx` (AG Grid) vers `DataTable`. Filtres statut/texte
 * conservés ; l'état de tri, pagination et visibilité des colonnes est
 * persisté comme le faisait l'ancien `agGridSettingsHelper`.
 */
export default function InvoiceList() {
  const { token } = useAuth();
  const router = useRouter();
  const [invoices, setInvoices] = useState<ServiceInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [tableState, setTableState, hydrated] = usePersistedState<
    Partial<DataTableState>
  >(TABLE_STATE_KEY, {});
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // Chaîne de promesses plutôt qu'une fonction appelée directement dans
  // l'effet, pour qu'aucun `setState` n'y soit synchrone (même choix que
  // `delete-invoice-modal.tsx`).
  useEffect(() => {
    if (!token) return;
    getServiceInvoices(token, { type: 'REPAIR' })
      .then(setInvoices)
      .catch(() => notifyError('Erreur lors du chargement des factures'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleDownloadPdf = useCallback(
    async (invoice: ServiceInvoice) => {
      if (invoice.status === ServiceInvoiceStatus.DRAFT) return;
      try {
        setDownloadingId(invoice.id);
        const blob = await getServiceInvoicePdf(token, invoice.id);
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } catch {
        notifyError('Erreur lors du téléchargement du PDF');
      } finally {
        setDownloadingId(null);
      }
    },
    [token],
  );

  const filteredInvoices = useMemo(() => {
    let filtered = invoices;

    if (statusFilter.length > 0) {
      filtered = filtered.filter((inv) => statusFilter.includes(inv.status));
    }

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      filtered = filtered.filter(
        (inv) =>
          inv.clientFirstName?.toLowerCase().includes(q) ||
          inv.clientLastName?.toLowerCase().includes(q) ||
          inv.clientPhone?.toLowerCase().includes(q) ||
          inv.invoiceNumber?.toLowerCase().includes(q),
      );
    }

    return filtered;
  }, [invoices, statusFilter, searchText]);

  const columns = useMemo<ColumnDef<ServiceInvoice>[]>(
    () => [
      {
        id: 'invoiceNumber',
        header: 'N°',
        accessorKey: 'invoiceNumber',
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium">
            {row.original.invoiceNumber}
          </span>
        ),
      },
      {
        id: 'client',
        header: 'Client',
        accessorFn: (row) =>
          `${row.clientFirstName ?? ''} ${row.clientLastName ?? ''}`.trim(),
      },
      {
        id: 'clientPhone',
        header: 'Téléphone',
        accessorKey: 'clientPhone',
        cell: ({ getValue }) => (getValue() as string) || '-',
      },
      {
        id: 'totalTTC',
        header: 'Montant TTC',
        accessorKey: 'totalTTC',
        cell: ({ getValue }) => (
          <span className="block text-right tabular-nums">
            {formatCurrency(getValue() as number)}
          </span>
        ),
      },
      {
        id: 'paymentMethod',
        header: 'Paiement',
        accessorKey: 'paymentMethod',
        cell: ({ getValue }) =>
          getPaymentMethodLabel(getValue() as PaymentMethod),
      },
      {
        id: 'status',
        header: 'Statut',
        accessorKey: 'status',
        cell: ({ getValue }) => {
          const status = getValue() as ServiceInvoiceStatus;
          return (
            <StatusBadge tone={getInvoiceStatusTone(status)}>
              {getInvoiceStatusLabel(status)}
            </StatusBadge>
          );
        },
      },
      {
        id: 'dolibarrSyncStatus',
        header: 'Dolibarr',
        accessorKey: 'dolibarrSyncStatus',
        enableSorting: false,
        cell: ({ getValue }) => (
          <div className="flex justify-center">
            <SyncIcon status={getValue() as string | null} />
          </div>
        ),
      },
      {
        id: 'createdAt',
        header: 'Date',
        accessorKey: 'createdAt',
        cell: ({ getValue }) =>
          dayjs(getValue() as string).format('DD/MM/YYYY'),
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => {
          const inv = row.original;
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Voir"
                render={<Link href={`/factures/${inv.id}`} />}
                nativeButton={false}
                onClick={(e) => e.stopPropagation()}
              >
                <Eye />
              </Button>
              {inv.status === ServiceInvoiceStatus.DRAFT && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Modifier"
                  render={<Link href={`/factures/${inv.id}/edit`} />}
                  nativeButton={false}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Pencil />
                </Button>
              )}
              {inv.status !== ServiceInvoiceStatus.DRAFT && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Télécharger le PDF"
                  disabled={downloadingId === inv.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadPdf(inv);
                  }}
                >
                  <Download />
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [downloadingId, handleDownloadPdf],
  );

  const newInvoiceButton = (
    <Button render={<Link href="/factures/nouveau" />} nativeButton={false}>
      <Plus />
      Nouvelle facture
    </Button>
  );

  if (!loading && invoices.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <PageHeader title="Factures de service" actions={newInvoiceButton} />
        <EmptyState
          icon={Search}
          title="Aucune facture"
          description="Aucune facture de réparation n'a encore été créée."
          action={newInvoiceButton}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <DataTable
        className="min-h-0 flex-1"
        title="Factures de service"
        toolbar={
          <>
            <MultiCombobox
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="Tous les statuts"
              className="w-full sm:w-52"
            />
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher client, N° facture..."
                aria-label="Rechercher une facture"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setTableState({})}
              aria-label="Réinitialiser le tableau"
            >
              <RotateCcw />
              Réinitialiser
            </Button>
            {newInvoiceButton}
          </>
        }
        columns={columns}
        data={filteredInvoices}
        loading={loading}
        getRowId={(row) => String(row.id)}
        onRowClick={(row) => router.push(`/factures/${row.id}`)}
        state={hydrated ? tableState : undefined}
        onStateChange={setTableState}
        initialState={{ sorting: [{ id: 'createdAt', desc: true }] }}
        enableColumnVisibility
        emptyMessage="Aucune facture ne correspond aux filtres"
      />
    </div>
  );
}
