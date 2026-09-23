'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutGrid, List as ListIcon } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  PageHeader,
  ToggleGroup,
  ToggleGroupItem,
} from '@forestar-be/ui';
import { getAllMachineRepairs } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { notifyError } from '@/lib/notifications';
import { usePersistedState } from '@/lib/use-persisted-state';
import { useAppSelector } from '@/store/hooks';
import {
  getActiveRepairsForRepairer,
  sortByPriority,
} from '@/lib/repairer-work';
import type {
  MachineRepairListItem,
  MachineRepairListItemFromApi,
} from '@/lib/types';
import RepairerSelector from './RepairerSelector';
import KanbanBoard from './KanbanBoard';
import GroupedRepairList from './GroupedRepairList';
import PdfActions from './PdfActions';

type ViewMode = 'kanban' | 'list';

/** Vue ouvrier : réparations actives d'un réparateur, en Kanban (desktop) ou en liste groupée par état. */
export default function RepairerWorkView() {
  const auth = useAuth();
  const { repairerNames, config } = useAppSelector((state) => state.config);

  // `null` tant que l'utilisateur n'a rien choisi explicitement : le premier
  // réparateur de la liste est alors utilisé, calculé au rendu plutôt que
  // fixé par un effet (donnée dérivée, cf. règle `react-hooks/set-state-in-effect`).
  const [explicitRepairer, setSelectedRepairer] = useState<string | null>(
    null,
  );
  const selectedRepairer =
    explicitRepairer && repairerNames.includes(explicitRepairer)
      ? explicitRepairer
      : (repairerNames[0] ?? null);
  const [viewMode, setViewMode] = usePersistedState<ViewMode>(
    'atelier.ouvrier.viewMode',
    'kanban',
  );
  const [allRepairs, setAllRepairs] = useState<MachineRepairListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const adresse = config['Adresse'] || '';
  const telephone = config['Téléphone'] || '';
  const email = config['Email'] || '';
  const siteWeb = config['Site web'] || '';

  const colorByState = useMemo<Record<string, string>>(() => {
    try {
      return JSON.parse(config['États'] || '{}');
    } catch {
      return {};
    }
  }, [config]);

  // Chaîne de promesses (pas d'async/await) : voir la note dans RepairsListView
  // sur `react-hooks/set-state-in-effect`.
  const fetchRepairs = useCallback((token: string) => {
    getAllMachineRepairs(token)
      .then((data: MachineRepairListItemFromApi[]) => {
        setAllRepairs(
          data.map((repair) => ({
            ...repair,
            start_timer: repair.start_timer
              ? new Date(repair.start_timer)
              : null,
            client_call_times: repair.client_call_times.map(
              (date) => new Date(date),
            ),
          })),
        );
      })
      .catch((error: unknown) => {
        console.error('Failed to fetch repairs:', error);
        notifyError(
          "Une erreur s'est produite lors de la récupération des données",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRepairs(auth.token);
  }, [auth.token, fetchRepairs]);

  const workloadCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    repairerNames.forEach((name) => {
      counts[name] = getActiveRepairsForRepairer(allRepairs, name).length;
    });
    return counts;
  }, [allRepairs, repairerNames]);

  const activeRepairs = useMemo(() => {
    if (!selectedRepairer) return [];
    return getActiveRepairsForRepairer(allRepairs, selectedRepairer);
  }, [allRepairs, selectedRepairer]);

  const sortedRepairs = useMemo(
    () => sortByPriority(activeRepairs),
    [activeRepairs],
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Ouvrier"
        actions={
          selectedRepairer && sortedRepairs.length > 0 ? (
            <PdfActions
              repairerName={selectedRepairer}
              repairs={sortedRepairs}
              adresse={adresse}
              telephone={telephone}
              email={email}
              siteWeb={siteWeb}
            />
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <RepairerSelector
          repairerNames={repairerNames}
          selectedRepairer={selectedRepairer}
          onSelect={setSelectedRepairer}
          workloadCounts={workloadCounts}
          disabled={loading}
        />

        <ToggleGroup
          value={[viewMode]}
          onValueChange={(next) => {
            if (next[0]) setViewMode(next[0] as ViewMode);
          }}
          className="hidden md:flex"
          aria-label="Mode d'affichage"
        >
          <ToggleGroupItem value="kanban" aria-label="Vue Kanban">
            <LayoutGrid className="size-4" />
            Kanban
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="Vue liste">
            <ListIcon className="size-4" />
            Liste
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {!selectedRepairer && repairerNames.length === 0 && (
        <Alert>
          <AlertDescription>
            Aucun réparateur n&apos;est configuré. Veuillez configurer les
            réparateurs dans les paramètres.
          </AlertDescription>
        </Alert>
      )}

      {selectedRepairer && !loading && activeRepairs.length === 0 && (
        <Alert>
          <AlertDescription>
            Aucune réparation active pour {selectedRepairer}.
          </AlertDescription>
        </Alert>
      )}

      {selectedRepairer && activeRepairs.length > 0 && (
        <>
          <div className="hidden md:block">
            {viewMode === 'kanban' ? (
              <KanbanBoard repairs={sortedRepairs} colorByState={colorByState} />
            ) : (
              <GroupedRepairList
                repairs={sortedRepairs}
                colorByState={colorByState}
              />
            )}
          </div>
          <div className="md:hidden">
            <GroupedRepairList
              repairs={sortedRepairs}
              colorByState={colorByState}
            />
          </div>
        </>
      )}
    </div>
  );
}
