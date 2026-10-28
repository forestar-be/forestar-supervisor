'use client';

import { useId, useState } from 'react';
import { Input } from '@forestar-be/ui';
import { Search } from 'lucide-react';
import {
  searchStorage,
  slotLocationCode,
  storageRepairLabel,
  storageRobotLabel,
  type StorageOverview,
} from '@/lib/storage';

type StorageResult = ReturnType<typeof searchStorage>[number];

/** Recherche des robots présents ; aucune liste de suggestions sans saisie. */
export function StorageSearch({
  data,
  disabled,
  onChoose,
}: {
  data: StorageOverview | null;
  disabled: boolean;
  onChoose: (result: StorageResult) => void;
}) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(-1);
  const results = data ? searchStorage(data, query) : [];
  const visible = open && !!query.trim() && !disabled;
  const active = index >= 0 && index < results.length ? index : -1;
  function choose(result: StorageResult) {
    onChoose(result);
    setQuery('');
    setOpen(false);
    setIndex(-1);
  }
  return (
    <div className="relative w-full sm:w-96" data-storage-interactive>
      <Search
        className="pointer-events-none absolute left-3.5 top-3 size-4 text-foreground"
        aria-hidden
      />
      <Input
        className="h-10 rounded-full bg-card pl-10 shadow-sm"
        id="storage-search"
        type="search"
        role="combobox"
        aria-label="Retrouver un robot"
        aria-autocomplete="list"
        aria-expanded={visible}
        aria-controls={visible ? id : undefined}
        aria-activedescendant={
          visible && active >= 0 ? `${id}-${active}` : undefined
        }
        placeholder="Fiche, client, marque ou modèle"
        autoComplete="off"
        value={query}
        disabled={disabled}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setIndex(-1);
        }}
        onFocus={() => {
          if (query.trim()) setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            setOpen(false);
            setIndex(-1);
          } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (!query.trim()) return;
            setOpen(true);
            setIndex(
              event.key === 'ArrowDown'
                ? (active + 1) % (results.length || 1)
                : active <= 0
                  ? results.length - 1
                  : active - 1,
            );
          } else if (event.key === 'Enter' && visible && active >= 0) {
            event.preventDefault();
            choose(results[active]);
          }
        }}
      />
      {visible && (
        <div className="absolute right-0 z-40 mt-2 w-full rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg">
          <ul
            id={id}
            role="listbox"
            aria-label="Résultats de recherche"
            className="max-h-72 overflow-y-auto"
          >
            {results.map((item, position) => (
              <li
                key={item.repair.id}
                id={`${id}-${position}`}
                role="option"
                aria-selected={active === position}
                aria-label={`${storageRepairLabel(item.repair)} · ${item.slot ? slotLocationCode(item.slot) : 'Sans emplacement'}`}
                className={`cursor-pointer rounded-lg px-3 py-2 text-sm ${active === position ? 'bg-accent text-accent-foreground' : 'hover:bg-accent'}`}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(item)}
              >
                <span className="block break-words font-medium">
                  {storageRepairLabel(item.repair)}
                </span>
                <span className="block break-words text-muted-foreground">
                  {[
                    storageRobotLabel(item.repair),
                    item.slot
                      ? slotLocationCode(item.slot)
                      : 'Sans emplacement',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </li>
            ))}
          </ul>
          {results.length === 0 && (
            <p role="status" className="p-3 text-sm text-muted-foreground">
              Aucun robot déposé trouvé.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
