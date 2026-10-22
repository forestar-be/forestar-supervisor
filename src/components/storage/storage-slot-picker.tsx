'use client';

import { useMemo, useState } from 'react';
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
} from '@forestar-be/ui';
import {
  normalizeStorageText as normalize,
  storageRepairLabel,
  storageRobotLabel,
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
}

/** Choix du robot à placer sur une case libre : sans emplacement, ou déjà rangé (déplacement). */
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
  const robotCount =
    data.unlocated.length +
    data.racks.reduce(
      (count, rack) =>
        count + (rack.active ? rack.slots.filter((s) => s.repair).length : 0),
      0,
    );
  return (
    <Dialog
      open={!!slot}
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        className={`flex flex-col overflow-hidden bg-field sm:max-w-2xl ${
          // La zone défilante n'est bornée que si la modale a une hauteur fixe.
          robotCount > 5
            ? 'h-[min(85dvh,44rem)] max-h-none sm:max-h-none'
            : 'max-h-[85dvh] sm:max-h-[85dvh]'
        }`}
      >
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
  const [query, setQuery] = useState('');
  const [choice, setChoice] = useState<StoragePick | null>(null);
  const unlocated = useMemo<StoragePick[]>(
    () => data.unlocated.map((repair) => ({ repair, slot: null, rack: null })),
    [data],
  );
  const stored = useMemo<StoragePick[]>(
    () =>
      data.racks
        .filter((rack) => rack.active)
        .flatMap((rack) =>
          rack.slots.flatMap((s) =>
            s.repair ? [{ repair: s.repair, slot: s, rack }] : [],
          ),
        )
        .sort((a, b) =>
          (a.slot?.code ?? '').localeCompare(b.slot?.code ?? '', 'fr', {
            numeric: true,
          }),
        ),
    [data],
  );
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const matches = (item: StoragePick) => {
    if (!terms.length) return true;
    const text = normalize(
      `${storageRepairLabel(item.repair)} ${storageRobotLabel(item.repair)} ${item.slot?.code ?? ''}`,
    );
    return terms.every((term) => text.includes(term));
  };
  const visibleUnlocated = unlocated.filter(matches);
  const visibleStored = stored.filter(matches);
  const isChosen = (item: StoragePick) => choice?.repair.id === item.repair.id;

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
            {item.slot?.code ?? 'Sans place'}
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
          Choisissez un robot sans emplacement, ou un robot déjà rangé pour le
          déplacer ici.
        </DialogDescription>
      </DialogHeader>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-3 size-4"
          aria-hidden
        />
        <Input
          type="search"
          className="h-10 pl-10"
          aria-label="Filtrer les robots"
          placeholder="Fiche, client, marque, modèle ou place"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <ScrollArea className="-mx-2 min-h-0 flex-1">
        <div className="space-y-4 px-2 pb-1">
          <section aria-label="Robots sans emplacement">
            <h3 className="sticky top-0 z-10 bg-field pb-2 text-sm font-semibold">
              Sans emplacement ({visibleUnlocated.length})
            </h3>
            {visibleUnlocated.length ? (
              <ul className="space-y-1.5">{visibleUnlocated.map(row)}</ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucun robot sans emplacement.
              </p>
            )}
          </section>
          <section aria-label="Robots déjà rangés">
            <h3 className="sticky top-0 z-10 bg-field pb-2 text-sm font-semibold">
              Déjà rangés · déplacer ici ({visibleStored.length})
            </h3>
            {visibleStored.length ? (
              <ul className="space-y-1.5">{visibleStored.map(row)}</ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucun robot rangé trouvé.
              </p>
            )}
          </section>
        </div>
      </ScrollArea>
      <p
        className="-mt-2 min-h-5 text-sm text-muted-foreground"
        aria-live="polite"
      >
        {choice ? (
          <>
            <span className="font-medium text-foreground">
              {storageRepairLabel(choice.repair)}
            </span>{' '}
            : {choice.slot?.code ?? 'sans place'} → {slot.code}
          </>
        ) : (
          'Aucun robot choisi.'
        )}
      </p>
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
          {!choice
            ? 'Choisir un robot'
            : choice.slot
              ? 'Déplacer ici'
              : 'Placer ici'}
        </Button>
      </DialogFooter>
    </>
  );
}
