'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search as SearchIcon, X } from 'lucide-react';
import {
  Button,
  DataTable,
  Input,
  PeriodPicker,
  ToggleGroup,
  ToggleGroupItem,
  type ColumnDef,
  type DataTableState,
  noAutofillProps,
} from '@forestar-be/ui';
import dayjs from '@/lib/dayjs';
import { getAllMachineRepairs } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { notifyError } from '@/lib/notifications';
import { usePersistedState } from '@/lib/use-persisted-state';
import { useMediaQuery } from '@/lib/use-media-query';
import {
  daysAtWorkshop,
  entryOf,
  inPeriod,
  machineLabel,
  matchesPresence,
  matchesSearch,
  presenceOf,
  type HistoryItem,
  type Period,
  type PresenceFilter,
} from '@/lib/repair-history';

const SEARCH_DEBOUNCE_MS = 250;
const TZ = 'Europe/Brussels';

const formatDay = (value: string) => dayjs(value).tz(TZ).format('DD/MM/YYYY');

const DEFAULT_TABLE_STATE: DataTableState = {
  sorting: [{ id: 'entry', desc: true }],
  pagination: { pageIndex: 0, pageSize: 20 },
  columnVisibility: {},
  columnSizing: {},
  columnFilters: [],
};

/**
 * Les seules colonnes utiles pour suivre les entrées et sorties des machines
 * (retour du PO, 25/09) : pas de téléphone ni d'état, qui sont sur la fiche.
 */
function buildColumns(now: Date): ColumnDef<HistoryItem>[] {
  return [
    {
      id: 'entry',
      size: 110,
      accessorFn: entryOf,
      header: 'Entrée',
      cell: ({ getValue }) => formatDay(getValue<string>()),
    },
    {
      id: 'exit',
      size: 120,
      accessorFn: (row) => row.exit_date ?? '',
      header: 'Sortie',
      cell: ({ row }) => {
        const presence = presenceOf(row.original);
        if (presence === 'returned') return formatDay(row.original.exit_date!);
        return (
          <span className="text-muted-foreground">
            {presence === 'at_workshop' ? 'À l’atelier' : 'Sans sortie'}
          </span>
        );
      },
    },
    {
      id: 'days',
      size: 110,
      accessorFn: (row) => daysAtWorkshop(row, now) ?? undefined,
      sortUndefined: 'last',
      header: 'Durée',
      cell: ({ row }) => {
        const days = daysAtWorkshop(row.original, now);
        if (days === null)
          return <span className="text-muted-foreground">—</span>;
        return presenceOf(row.original) === 'at_workshop'
          ? `depuis ${days} j`
          : `${days} j`;
      },
    },
    {
      id: 'id',
      size: 70,
      accessorKey: 'id',
      header: 'N°',
      cell: ({ getValue }) => (
        <span className="font-medium">#{getValue<number>()}</span>
      ),
    },
    {
      id: 'client',
      size: 190,
      accessorFn: (row) =>
        `${row.client.firstName || ''} ${row.client.lastName || ''}`.trim(),
      header: 'Client',
    },
    {
      id: 'machine',
      size: 260,
      accessorFn: machineLabel,
      header: 'Machine',
    },
    {
      id: 'repair_or_maintenance',
      size: 110,
      accessorKey: 'repair_or_maintenance',
      header: 'Prestation',
    },
  ];
}

/**
 * Historique des entrées et sorties (QF-5, option 1) : une ligne par passage,
 * c'est-à-dire par fiche (D-01), actives et archivées confondues. On y
 * retrouve quand une machine est entrée, quand elle est sortie, et combien de
 * temps elle est restée. Les règles sont dans `@/lib/repair-history`.
 */
export default function HistoryView() {
  const auth = useAuth();
  const router = useRouter();

  const [repairs, setRepairs] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  // Figée au chargement : les durées « depuis N j » ne bougent pas pendant
  // qu'on consulte la page.
  const [now] = useState(() => new Date());

  const [presence, setPresence] = usePersistedState<PresenceFilter>(
    'atelier.historique.presence',
    'all',
  );
  const [period, setPeriod] = useState<Period>({
    start: undefined,
    end: undefined,
  });
  const [searchText, setSearchText] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  const [tableState, setTableState, hydrated] =
    usePersistedState<DataTableState>(
      'atelier.historique.tableState',
      DEFAULT_TABLE_STATE,
    );

  // Colonnes masquées selon la largeur ; pas de choix de colonnes ici.
  const isTablet = useMediaQuery('(max-width: 768px)');
  const isMobile = useMediaQuery('(max-width: 480px)');
  const effectiveTableState = useMemo<DataTableState>(() => {
    const hidden: Record<string, boolean> = {};
    if (isTablet) {
      hidden.id = false;
      hidden.repair_or_maintenance = false;
    }
    if (isMobile) hidden.days = false;
    return { ...tableState, columnVisibility: hidden };
  }, [tableState, isTablet, isMobile]);

  useEffect(() => {
    const timeout = setTimeout(
      () => setAppliedSearch(searchText),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timeout);
  }, [searchText]);

  // Chaîne de promesses plutôt que async/await : les `setState` se font dans
  // les callbacks, après la réponse (règle `react-hooks/set-state-in-effect`).
  const fetchData = useCallback((token: string) => {
    getAllMachineRepairs(token, 'all')
      .then((data) => setRepairs(data))
      .catch((error: unknown) => {
        console.error('Failed to fetch history:', error);
        notifyError(
          "Une erreur s'est produite lors de la récupération de l'historique",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData(auth.token);
  }, [auth.token, fetchData]);

  const columns = useMemo(() => buildColumns(now), [now]);

  const rows = useMemo(
    () =>
      repairs.filter(
        (repair) =>
          matchesPresence(repair, presence) &&
          inPeriod(repair, period) &&
          matchesSearch(repair, appliedSearch),
      ),
    [repairs, presence, period, appliedSearch],
  );

  const hasPeriod = Boolean(period.start || period.end);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <DataTable
        className="min-h-0 flex-1"
        title="Historique"
        key={hydrated ? 'hydrated' : 'initial'}
        columns={columns}
        data={rows}
        loading={loading}
        getRowId={(row) => String(row.id)}
        onRowClick={(row) => router.push(`/reparation/${row.id}`)}
        getRowClassName={() => 'cursor-pointer'}
        state={effectiveTableState}
        onStateChange={(next) =>
          setTableState({ ...next, columnVisibility: {} })
        }
        emptyMessage="Aucun passage ne correspond à ces filtres"
        toolbar={
          <>
            <ToggleGroup
              value={[presence]}
              onValueChange={(next) => {
                if (next[0]) setPresence(next[0] as PresenceFilter);
              }}
              aria-label="Présence à l'atelier"
            >
              <ToggleGroupItem value="all">Toutes</ToggleGroupItem>
              <ToggleGroupItem value="at_workshop">
                À l&apos;atelier
              </ToggleGroupItem>
              <ToggleGroupItem value="returned">Rendues</ToggleGroupItem>
            </ToggleGroup>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Entrée ou sortie
              </span>
              <PeriodPicker
                value={period}
                onChange={setPeriod}
                presets={[]}
                startPlaceholder="du…"
                endPlaceholder="au…"
              />
              {hasPeriod && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Effacer la période"
                  onClick={() =>
                    setPeriod({ start: undefined, end: undefined })
                  }
                >
                  <X />
                </Button>
              )}
            </div>
            <div className="relative w-full sm:w-64">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                {...noAutofillProps}
                type="search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Client, téléphone ou machine"
                aria-label="Rechercher un client, un téléphone ou une machine"
                className="pl-8"
              />
            </div>
          </>
        }
      />
    </div>
  );
}
