'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
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

export interface StoragePick {
  repair: StorageRepair;
  slot: StorageSlot | null;
  rack: StorageRack | null;
}

/** Choix du robot à placer sur une case libre : sans emplacement, ou déjà rangé (déplacement). */
export function StorageSlotPicker({
  data,
  slot,
  initial,
  busy,
  onClose,
  onConfirm,
}: {
  data: StorageOverview;
  slot: StorageSlot | null;
  initial: StoragePick | null;
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
      <DialogContent className="flex max-h-[85dvh] flex-col sm:max-w-xl">
        {slot && (
          <PickerBody
            key={slot.id}
            data={data}
            slot={slot}
            initial={initial}
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
  initial,
  busy,
  onClose,
  onConfirm,
}: {
  data: StorageOverview;
  slot: StorageSlot;
  initial: StoragePick | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: (source: StoragePick, slot: StorageSlot) => void;
}) {
  const [query, setQuery] = useState('');
  const [choice, setChoice] = useState<StoragePick | null>(initial);
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
      <div className="-mx-1 min-h-0 flex-1 space-y-4 overflow-y-auto px-1">
        <section aria-label="Robots sans emplacement">
          <h3 className="mb-2 text-sm font-semibold">
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
          <h3 className="mb-2 text-sm font-semibold">
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
      <DialogFooter>
        <Button variant="outline" disabled={busy} onClick={onClose}>
          Annuler
        </Button>
        <Button
          disabled={!choice || busy}
          onClick={() => choice && onConfirm(choice, slot)}
        >
          {choice
            ? `${choice.slot ? 'Déplacer' : 'Placer'} #${choice.repair.id} : ${choice.slot?.code ?? 'sans place'} → ${slot.code}`
            : 'Choisir un robot'}
        </Button>
      </DialogFooter>
    </>
  );
}
