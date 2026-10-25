'use client';

import { useEffect, useMemo, useState } from 'react';
import { FilePlus2, Search } from 'lucide-react';
import { APP_CATALOG } from '@forestar-be/core/app-menu';
import {
  Button,
  buttonVariants,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@forestar-be/ui';
import { searchStorageRepairs } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { usePersistedState } from '@/lib/use-persisted-state';
import {
  storageRepairLabel,
  storageRobotLabel,
  repairStorageCategory,
  type StorageOverview,
  type StorageRack,
  type StorageRepair,
  type StorageSlot,
} from '@/lib/storage';

const OPERATOR_URL =
  APP_CATALOG.find((app) => app.id === 'operator')?.href ??
  'https://operateur.forestar.be';

export interface StoragePick {
  repair: StorageRepair;
  slot: StorageSlot | null;
  rack: StorageRack | null;
  /** false : fiche jamais déposée au rangement, à déposer sur la place choisie. */
  deposited?: boolean;
}

/** Période de création des fiches à ranger ; les robots rangés sont toujours proposés. */
const PERIODS = [
  { value: '3', label: '3 derniers mois' },
  { value: '6', label: '6 derniers mois' },
  { value: '12', label: '12 derniers mois' },
  { value: '24', label: '2 dernières années' },
  { value: 'all', label: 'Toutes les dates' },
];

function sinceDate(period: string): string | null {
  const months = Number(period);
  if (!Number.isInteger(months) || months <= 0) return null;
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date.toISOString().slice(0, 10);
}

/** Choix du robot à placer sur une case libre : robot à ranger, ou déjà rangé (déplacement). */
export function StorageSlotPicker({
  data,
  slot,
  busy,
  onClose,
  onConfirm,
}: {
  data: StorageOverview;
  slot: StorageSlot | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: (source: StoragePick, slot: StorageSlot) => void;
}) {
  return (
    <Dialog
      open={!!slot}
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      {/* Hauteur fixe : la zone défilante est bornée et la modale ne saute pas à chaque frappe. */}
      <DialogContent className="flex h-[min(85dvh,44rem)] max-h-none flex-col overflow-hidden bg-field sm:max-h-none sm:max-w-2xl">
        {slot && (
          <PickerBody
            key={slot.id}
            data={data}
            slot={slot}
            busy={busy}
            onClose={onClose}
            onConfirm={onConfirm}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PickerBody({
  data,
  slot,
  busy,
  onClose,
  onConfirm,
}: {
  data: StorageOverview;
  slot: StorageSlot;
  busy: boolean;
  onClose: () => void;
  onConfirm: (source: StoragePick, slot: StorageSlot) => void;
}) {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [period, setPeriod] = usePersistedState('storage-picker-period', '6');
  const [result, setResult] = useState<{
    key: string;
    items: StoragePick[];
    truncated: boolean;
  } | null>(null);
  const [error, setError] = useState('');
  const [choice, setChoice] = useState<StoragePick | null>(null);
  const trimmed = query.trim();
  const requestKey = `${trimmed}|${period}`;
  // Les places viennent du rangement chargé, pour garder le rack et le code à jour.
  const places = useMemo(() => {
    const map = new Map<number, { slot: StorageSlot; rack: StorageRack }>();
    for (const rack of data.racks)
      for (const s of rack.slots) map.set(s.id, { slot: s, rack });
    return map;
  }, [data]);
  useEffect(() => {
    if (!trimmed) return;
    let stale = false;
    const timer = setTimeout(() => {
      setError('');
      searchStorageRepairs(token, trimmed, sinceDate(period))
        .then((found) => {
          if (stale) return;
          setResult({
            key: requestKey,
            truncated: found.truncated,
            items: found.items.map((item) => {
              const place = item.slot ? places.get(item.slot.id) : undefined;
              return {
                repair: item.repair,
                deposited: !!item.depositedAt,
                rack: place?.rack ?? null,
                slot: item.slot
                  ? (place?.slot ?? {
                      ...item.slot,
                      level: 0,
                      position: '',
                      repair: null,
                    })
                  : null,
              };
            }),
          });
        })
        .catch((e: unknown) => {
          if (stale) return;
          setError(
            e instanceof Error ? e.message : 'Recherche impossible. Réessayez.',
          );
        });
    }, 250);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [token, trimmed, period, requestKey, places]);
  const targetCategory =
    [...places.values()].find((place) => place.slot.id === slot.id)?.rack
      .category ?? 'ATELIER';
  const compatible = (item: StoragePick) =>
    repairStorageCategory(item.repair.hivernage) === targetCategory;
  const current = trimmed && result?.key === requestKey ? result : null;
  const loading = !!trimmed && !current && !error;
  const stored =
    current?.items.filter((item) => item.slot && compatible(item)) ?? [];
  const toStore =
    current?.items.filter((item) => !item.slot && compatible(item)) ?? [];
  const isChosen = (item: StoragePick) => choice?.repair.id === item.repair.id;
  const placeLabel = (item: StoragePick) =>
    item.slot?.code ??
    (item.deposited === false ? 'Non déposé' : 'Sans emplacement');

  function row(item: StoragePick) {
    const chosen = isChosen(item);
    return (
      <li key={item.repair.id}>
        <button
          type="button"
          aria-pressed={chosen}
          disabled={busy}
          onClick={() => setChoice(item)}
          onDoubleClick={() => onConfirm(item, slot)}
          className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${chosen ? 'border-2 border-primary bg-primary/8' : 'hover:border-primary/60 hover:bg-accent'}`}
        >
          <span className="min-w-0">
            <span className="block break-words font-medium">
              {storageRepairLabel(item.repair)}
            </span>
            {storageRobotLabel(item.repair) && (
              <span className="block break-words text-muted-foreground">
                {storageRobotLabel(item.repair)}
              </span>
            )}
          </span>
          <span
            className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${item.slot ? 'bg-muted' : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'}`}
          >
            {placeLabel(item)}
          </span>
        </button>
      </li>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Ajouter un robot en {slot.code}</DialogTitle>
        <DialogDescription>
          Recherchez la fiche du robot à ranger ici, ou d’un robot déjà rangé
          pour le déplacer.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-48 flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-3 size-4"
            aria-hidden
          />
          <Input
            type="search"
            className="h-10 pl-10"
            aria-label="Rechercher un robot"
            placeholder="Fiche, client, marque, modèle ou place"
            autoComplete="off"
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setChoice(null);
            }}
          />
        </div>
        <Select
          items={PERIODS}
          value={period}
          onValueChange={(value) => {
            if (typeof value === 'string') {
              setPeriod(value);
              setChoice(null);
            }
          }}
        >
          <SelectTrigger
            className="h-10 w-full sm:w-52"
            aria-label="Fiches à ranger créées depuis"
            title="Fiches à ranger créées depuis ; les robots rangés sont toujours proposés"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <ScrollArea className="-mx-2 min-h-0 flex-1">
        <div className="space-y-4 px-2 pb-1" aria-live="polite">
          {!trimmed ? (
            <p className="text-sm text-muted-foreground">
              Tapez un numéro de fiche, un nom de client, une marque, un modèle
              ou une place (R1/2/A).
            </p>
          ) : error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : loading ? (
            <p className="text-sm text-muted-foreground">Recherche…</p>
          ) : !stored.length && !toStore.length ? (
            <p className="text-sm text-muted-foreground">
              Aucun robot trouvé
              {period !== 'all'
                ? ' sur la période choisie. Élargissez la période si la fiche est ancienne.'
                : '.'}
            </p>
          ) : (
            <>
              {current?.truncated && (
                <p className="text-sm text-muted-foreground">
                  Beaucoup de résultats : précisez la recherche.
                </p>
              )}
              {stored.length > 0 && (
                <section aria-label="Robots déjà rangés">
                  <h3 className="sticky top-0 z-10 bg-field pb-2 text-sm font-semibold">
                    Déjà rangés · déplacer ici ({stored.length})
                  </h3>
                  <ul className="space-y-1.5">{stored.map(row)}</ul>
                </section>
              )}
              {toStore.length > 0 && (
                <section aria-label="Robots à ranger">
                  <h3 className="sticky top-0 z-10 bg-field pb-2 text-sm font-semibold">
                    À ranger ({toStore.length})
                  </h3>
                  <ul className="space-y-1.5">{toStore.map(row)}</ul>
                </section>
              )}
            </>
          )}
        </div>
      </ScrollArea>
      <DialogFooter className="-mx-6 -mb-6 flex-wrap rounded-b-2xl px-6 py-4">
        {/* Action à part : couleur distincte du vert des boutons de la page. */}
        <a
          href={OPERATOR_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants(),
            'bg-amber-500 text-amber-950 hover:bg-amber-400 sm:mr-auto',
          )}
        >
          <FilePlus2 className="size-4" aria-hidden />
          Créer une fiche
        </a>
        <Button variant="outline" disabled={busy} onClick={onClose}>
          Annuler
        </Button>
        <Button
          disabled={!choice || busy}
          onClick={() => choice && onConfirm(choice, slot)}
        >
          {choice
            ? `${choice.slot ? 'Déplacer' : 'Placer'} #${choice.repair.id} : ${choice.slot ? choice.slot.code : placeLabel(choice).toLowerCase()} → ${slot.code}`
            : 'Choisir un robot'}
        </Button>
      </DialogFooter>
    </>
  );
}
