'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FolderOpen, Search as SearchIcon, Settings } from 'lucide-react';
import {
  Button,
  DataTable,
  Input,
  MultiCombobox,
  ToggleGroup,
  ToggleGroupItem,
  type DataTableState,
  noAutofillProps,
} from '@forestar-be/ui';
import { getAllMachineRepairs, updateRepair } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { notifyError, notifySuccess } from '@/lib/notifications';
import { usePersistedState } from '@/lib/use-persisted-state';
import { useMediaQuery } from '@/lib/use-media-query';
import { useAppSelector } from '@/store/hooks';
import type {
  ArchiveFilter,
  MachineRepairListItem,
  MachineRepairListItemFromApi,
} from '@/lib/types';
import { buildRepairsColumns } from './repairs-columns';
import { RepairsSettingsDialog } from './repairs-settings-dialog';

const SEARCH_DEBOUNCE_MS = 250;

const normalize = (value: string) =>
  value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Dossier des PDF des fiches sur Dropbox, dans le dossier de l'app « Forestar
 * Atelier ». La clé de config le remplace : en local, elle vise le dossier
 * `dev-local` où le serveur de développement écrit.
 */
const DROPBOX_URL_CONFIG_KEY = 'URL Dropbox fiches atelier';
const DEFAULT_DROPBOX_URL =
  'https://www.dropbox.com/home/Applications/Forestar%20Atelier/Fiches%20atelier';

const DEFAULT_TABLE_STATE: DataTableState = {
  sorting: [{ id: 'entry_date', desc: true }],
  pagination: { pageIndex: 0, pageSize: 20 },
  columnVisibility: {},
  columnSizing: {},
  columnFilters: [],
};

export default function RepairsListView() {
  const auth = useAuth();
  const router = useRouter();
  const { config, repairerNames } = useAppSelector((state) => state.config);

  const [machineRepairs, setMachineRepairs] = useState<MachineRepairListItem[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  const [customerFilterText, setCustomerFilterText] = useState('');
  const [appliedCustomerFilter, setAppliedCustomerFilter] = useState('');
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedRepairers, setSelectedRepairers] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Filtre d'archivage : transmis au serveur (voir `fetchData`), pas filtré
  // en local comme les états et réparateurs. Persisté pour rester entre deux
  // visites (AC-07). « Toutes » n'est plus proposé : une valeur `all` gardée
  // d'avant revient à « Actives ».
  const [persistedArchiveFilter, setArchiveFilter] =
    usePersistedState<ArchiveFilter>('atelier.repairs.archive', 'active');
  const archiveFilter: ArchiveFilter =
    persistedArchiveFilter === 'archived' ? 'archived' : 'active';

  const [tableState, setTableState, hydrated] =
    usePersistedState<DataTableState>(
      'atelier.liste.tableState',
      DEFAULT_TABLE_STATE,
    );

  // Colonnes masquées par défaut : « Date de création », qui double d'ordinaire
  // la date d'entrée, puis d'autres selon la largeur, comme l'ancienne grille
  // (seuils décalés de la largeur de la barre latérale). Un choix explicite
  // fait dans « Paramètres » l'emporte, car il est persisté.
  const isLaptop = useMediaQuery('(max-width: 1440px)');
  const isTablet = useMediaQuery('(max-width: 768px)');
  const defaultHidden = useMemo(() => {
    const hidden: Record<string, boolean> = { createdAt: false };
    if (isLaptop) {
      hidden.machineType = false;
      hidden.lastCall = false;
    }
    if (isTablet) {
      hidden.repair_or_maintenance = false;
      hidden.repairer_name = false;
      hidden.invoice = false;
    }
    return hidden;
  }, [isLaptop, isTablet]);
  const effectiveTableState = useMemo<DataTableState>(
    () => ({
      ...tableState,
      columnVisibility: { ...defaultHidden, ...tableState.columnVisibility },
    }),
    [tableState, defaultHidden],
  );
  // Ne persister que les écarts au défaut de la largeur courante : sinon un
  // tri fait sur mobile figerait les colonnes masquées sur le bureau.
  const persistTableState = useCallback(
    (next: DataTableState) => {
      const columnVisibility = Object.fromEntries(
        Object.entries(next.columnVisibility).filter(
          ([id, visible]) => (defaultHidden[id] ?? true) !== visible,
        ),
      );
      setTableState({ ...next, columnVisibility });
    },
    [defaultHidden, setTableState],
  );

  const colorByState = useMemo<Record<string, string>>(() => {
    try {
      return JSON.parse(config['États'] || '{}');
    } catch {
      return {};
    }
  }, [config]);

  const availableStates = useMemo(
    () => Object.keys(colorByState),
    [colorByState],
  );
  const availableRepairers = useMemo(
    () => ['Non affecté', ...repairerNames],
    [repairerNames],
  );

  // Recherche différée : l'input reste réactif, seul le filtrage est différé.
  useEffect(() => {
    const timeout = setTimeout(
      () => setAppliedCustomerFilter(customerFilterText),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timeout);
  }, [customerFilterText]);

  // `loading` démarre à `true`. Chaîne de promesses plutôt que async/await :
  // la mise à jour du tableau se fait dans les callbacks `.then`/`.finally`,
  // qui s'exécutent après la réponse réseau et non de façon synchrone dans
  // le corps de l'effet (cf. règle de lint `react-hooks/set-state-in-effect`).
  const fetchData = useCallback((token: string, archived: ArchiveFilter) => {
    getAllMachineRepairs(token, archived)
      .then((data: MachineRepairListItemFromApi[]) => {
        const withDates: MachineRepairListItem[] = data.map((repair) => ({
          ...repair,
          start_timer: repair.start_timer ? new Date(repair.start_timer) : null,
          client_call_times: repair.client_call_times.map(
            (date) => new Date(date),
          ),
        }));
        setMachineRepairs(withDates);
      })
      .catch((error: unknown) => {
        console.error('Failed to fetch data:', error);
        notifyError(
          "Une erreur s'est produite lors de la récupération des données",
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchData(auth.token, archiveFilter);
  }, [auth.token, archiveFilter, fetchData]);

  const dropboxUrl = config[DROPBOX_URL_CONFIG_KEY] || DEFAULT_DROPBOX_URL;

  const handleColumnVisibilityChange = useCallback(
    (id: string, visible: boolean) => {
      persistTableState({
        ...effectiveTableState,
        columnVisibility: {
          ...effectiveTableState.columnVisibility,
          [id]: visible,
        },
      });
    },
    [effectiveTableState, persistTableState],
  );

  const handleRepairerChange = useCallback(
    (id: number, previous: string | null, next: string | null) => {
      if (previous === next) return;
      // Mise à jour optimiste : la cellule change avant la réponse serveur.
      setMachineRepairs((prev) =>
        prev.map((r) => (r.id === id ? { ...r, repairer_name: next } : r)),
      );
      updateRepair(auth.token, String(id), { repairer_name: next })
        .then(() => {
          notifySuccess('Réparateur mis à jour avec succès');
        })
        .catch((error) => {
          console.error('Error updating repairer:', error);
          notifyError('Erreur lors de la mise à jour du réparateur');
          // Le serveur a refusé : on revient à la valeur d'origine.
          setMachineRepairs((prev) =>
            prev.map((r) =>
              r.id === id ? { ...r, repairer_name: previous } : r,
            ),
          );
        });
    },
    [auth.token],
  );

  const columns = useMemo(
    () =>
      buildRepairsColumns({
        colorByState,
        repairerNames,
        onRepairerChange: handleRepairerChange,
      }),
    [colorByState, repairerNames, handleRepairerChange],
  );

  const searchWords = useMemo(() => {
    const query = appliedCustomerFilter.trim();
    return query ? normalize(query).split(' ').filter(Boolean) : [];
  }, [appliedCustomerFilter]);

  const filteredRepairs = useMemo(() => {
    return machineRepairs.filter((repair) => {
      const state = repair.state || 'Non commencé';
      if (selectedStates.length > 0 && !selectedStates.includes(state)) {
        return false;
      }
      const repairer = repair.repairer_name || 'Non affecté';
      if (
        selectedRepairers.length > 0 &&
        !selectedRepairers.includes(repairer)
      ) {
        return false;
      }
      if (searchWords.length > 0) {
        const fullName = normalize(
          `${repair.client.firstName || ''} ${repair.client.lastName || ''}`.trim(),
        );
        const phone = repair.client.phone ? normalize(repair.client.phone) : '';
        return searchWords.every(
          (word) => fullName.includes(word) || phone.includes(word),
        );
      }
      return true;
    });
  }, [machineRepairs, selectedStates, selectedRepairers, searchWords]);

  const handleReset = useCallback(() => {
    setSelectedStates([]);
    setSelectedRepairers([]);
    setCustomerFilterText('');
    setAppliedCustomerFilter('');
    setTableState(DEFAULT_TABLE_STATE);
    setSettingsOpen(false);
    notifySuccess('Tableau réinitialisé');
  }, [setTableState]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <DataTable
        className="min-h-0 flex-1"
        title="Réparations/Entretiens"
        key={hydrated ? 'hydrated' : 'initial'}
        columns={columns}
        data={filteredRepairs}
        loading={loading}
        getRowId={(row) => String(row.id)}
        onRowClick={(row) => router.push(`/reparation/${row.id}`)}
        getRowClassName={() => 'cursor-pointer'}
        state={effectiveTableState}
        onStateChange={persistTableState}
        emptyMessage="Aucune réparation ne correspond à ces filtres"
        toolbar={
          <>
            <ToggleGroup
              value={[archiveFilter]}
              onValueChange={(next) => {
                if (next[0]) setArchiveFilter(next[0] as ArchiveFilter);
              }}
              aria-label="Filtre d'archivage"
            >
              <ToggleGroupItem value="active">Actives</ToggleGroupItem>
              <ToggleGroupItem value="archived">Archivées</ToggleGroupItem>
            </ToggleGroup>
            <MultiCombobox
              options={availableStates.map((state) => ({
                value: state,
                label: state,
              }))}
              value={selectedStates}
              onChange={setSelectedStates}
              placeholder="Tous les états"
              className="w-full sm:w-48"
              renderOption={(option) => (
                <span className="flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: colorByState[option.value] || '#9e9e9e',
                    }}
                  />
                  {option.label}
                </span>
              )}
            />
            <MultiCombobox
              options={availableRepairers.map((name) => ({
                value: name,
                label: name,
              }))}
              value={selectedRepairers}
              onChange={setSelectedRepairers}
              placeholder="Tous les réparateurs"
              className="w-full sm:w-48"
            />
            <div className="relative w-full sm:w-56">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                {...noAutofillProps}
                value={customerFilterText}
                onChange={(event) => setCustomerFilterText(event.target.value)}
                placeholder="Rechercher un client"
                aria-label="Rechercher un client"
                className="pl-8"
              />
            </div>
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <a
                  href={dropboxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              <FolderOpen />
              Dropbox
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Paramètres du tableau"
              title="Paramètres du tableau"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings />
            </Button>
          </>
        }
      />

      <RepairsSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        columnVisibility={effectiveTableState.columnVisibility}
        onColumnVisibilityChange={handleColumnVisibilityChange}
        onReset={handleReset}
      />
    </div>
  );
}
