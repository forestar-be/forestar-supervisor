'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search as SearchIcon } from 'lucide-react';
import {
  DataTable,
  Input,
  type DataTableState,
  noAutofillProps,
} from '@forestar-be/ui';
import { isHttpError, searchClients } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { notifyError } from '@/lib/notifications';
import { usePersistedState } from '@/lib/use-persisted-state';
import type { ClientSummary } from '@/lib/types';
import { buildClientsColumns } from './clients-columns';
import { DuplicatesBanner } from './duplicates-banner';

const SEARCH_DEBOUNCE_MS = 250;

const DEFAULT_TABLE_STATE: DataTableState = {
  sorting: [{ id: 'lastEntryDate', desc: true }],
  pagination: { pageIndex: 0, pageSize: 20 },
  columnVisibility: {},
  columnSizing: {},
  columnFilters: [],
};

/**
 * `/clients` (R009-S03, AC-01) : liste des clients Forestar, avec une
 * recherche sur le nom sans accents, le téléphone (chiffres ou format
 * national) et l'email — déjà normalisée côté serveur
 * (`searchClients`/`GET /supervisor/clients?q=`), pour ne pas dupliquer cette
 * règle ici (D-20).
 */
export default function ClientsListView() {
  const auth = useAuth();
  const router = useRouter();

  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');

  const [tableState, setTableState, hydrated] =
    usePersistedState<DataTableState>(
      'atelier.clients.tableState',
      DEFAULT_TABLE_STATE,
    );

  const columns = buildClientsColumns();

  const fetchData = useCallback((token: string, q: string) => {
    setLoading(true);
    searchClients(token, q)
      .then(setClients)
      .catch((error: unknown) => {
        console.error('Error searching clients:', error);
        notifyError(
          isHttpError(error)
            ? error.message
            : "Une erreur s'est produite lors de la récupération des clients",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  // Recherche différée : l'input reste réactif, seule la requête est différée.
  useEffect(() => {
    const timeout = setTimeout(
      () => fetchData(auth.token, searchText),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.token, searchText]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <DuplicatesBanner />
      <DataTable
        className="min-h-0 flex-1"
        title="Clients"
        key={hydrated ? 'hydrated' : 'initial'}
        columns={columns}
        data={clients}
        loading={loading}
        getRowId={(row) => String(row.id)}
        onRowClick={(row) => router.push(`/clients/${row.id}`)}
        getRowClassName={() => 'cursor-pointer'}
        state={tableState}
        onStateChange={setTableState}
        emptyMessage="Aucun client ne correspond à cette recherche"
        toolbar={
          <div className="relative w-full sm:w-72">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              {...noAutofillProps}
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Nom, téléphone ou email"
              aria-label="Rechercher un client"
              className="pl-8"
            />
          </div>
        }
      />
    </div>
  );
}
