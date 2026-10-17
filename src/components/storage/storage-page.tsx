'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bot, Plus } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
} from '@forestar-be/ui';
import { useAuth } from '@/lib/auth';
import { commandRepairStorage, getStorage, isHttpError } from '@/lib/api';
import {
  searchStorage,
  storageRepairLabel,
  type StorageCommand,
  type StorageOverview,
  type StorageRack,
  type StorageRepair,
  type StorageSlot,
} from '@/lib/storage';
import { StorageSettings } from './storage-settings';

interface Selection {
  repair: StorageRepair;
  slot: StorageSlot | null;
  rack: StorageRack | null;
}
export function StoragePage() {
  const { token } = useAuth();
  const [data, setData] = useState<StorageOverview | null>(null);
  const [rackId, setRackId] = useState<number | null>(null);
  const [selected, setSelectedState] = useState<Selection | null>(null);
  const selectedRef = useRef<Selection | null>(null);
  const setSelected = useCallback((selection: Selection | null) => {
    selectedRef.current = selection;
    setSelectedState(selection);
  }, []);
  const [query, setQuery] = useState('');
  const [moving, setMoving] = useState(false);
  const [destination, setDestination] = useState<StorageSlot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [exceptions, setExceptions] = useState(false);
  const [selectNavigation, setSelectNavigation] = useState(true);
  const nav = useRef<HTMLDivElement>(null);
  const tabs = useRef<HTMLDivElement>(null);
  const pending = useRef<StorageCommand | null>(null);
  const running = useRef(false);
  const linked = useRef(false);
  const load = useCallback(
    async (cancelMove = false) => {
      const next = await getStorage(token);
      setData(next);
      setRackId((current) =>
        next.racks.some((r) => r.id === current && r.active)
          ? current
          : (next.racks.find((r) => r.active)?.id ?? null),
      );
      const previous = selectedRef.current;
      if (previous) {
        const found = searchStorage(next, `#${previous.repair.id}`).find(
          (item) => item.repair.id === previous.repair.id,
        );
        const sourceChanged = previous.slot?.id !== found?.slot?.id;
        setSelected(found ?? null);
        if (cancelMove || sourceChanged || !found) {
          pending.current = null;
          setMoving(false);
          setDestination(null);
        }
        if (found?.rack && sourceChanged) setRackId(found.rack.id);
        if (cancelMove || sourceChanged || !found) setMessage('');
      }
      if (!linked.current) {
        linked.current = true;
        const id = new URLSearchParams(window.location.search).get('fiche');
        const found = searchStorage(next, id ? `#${id}` : '').find(
          (item) => String(item.repair.id) === id,
        );
        if (found) {
          setSelected(found);
          if (found.rack) setRackId(found.rack.id);
          else setExceptions(true);
        }
      }
      return next;
    },
    [token, setSelected],
  );
  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => load())
      .catch(() => {
        if (active) setError('Impossible de charger le rangement.');
      });
    return () => {
      active = false;
    };
  }, [load]);
  useEffect(() => {
    const container = nav.current;
    const list = tabs.current;
    if (!container || !list) return;
    const measure = () =>
      setSelectNavigation(
        container.clientWidth < 640 || list.scrollWidth > container.clientWidth,
      );
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(list);
    measure();
    return () => observer.disconnect();
  }, [data?.racks.length]);
  const racks = data?.racks.filter((r) => r.active) ?? [];
  const rack = racks.find((r) => r.id === rackId);
  const results = data ? searchStorage(data, query) : [];
  function choose(item: Selection) {
    if (moving) return;
    pending.current = null;
    setDestination(null);
    setSelected(item);
    setMessage('');
    if (item.rack) setRackId(item.rack.id);
  }
  async function assign(slot?: StorageSlot) {
    if (!selected || running.current) return;
    running.current = true;
    setBusy(true);
    setError('');
    const command = pending.current ?? {
      commandId: crypto.randomUUID(),
      action: selected.slot ? ('move' as const) : ('assign' as const),
      ...(slot ? { slotId: slot.id } : {}),
      ...(selected.slot ? { expectedSlotId: selected.slot.id } : {}),
    };
    pending.current = command;
    try {
      const detail = await commandRepairStorage(
        token,
        selected.repair.id,
        command,
      );
      pending.current = null;
      setMoving(false);
      setDestination(null);
      const next = await load();
      const found = searchStorage(next, `#${selected.repair.id}`).find(
        (item) => item.repair.id === selected.repair.id,
      );
      setSelected(found ?? null);
      if (found?.rack) setRackId(found.rack.id);
      setMessage(
        `Fiche #${selected.repair.id} affectée à ${detail.location?.code ?? 'sans emplacement'}. Réimprimez les tickets depuis la fiche.`,
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Enregistrement impossible. Réessayez.',
      );
      if (isHttpError(e)) {
        pending.current = null;
        setDestination(null);
        // Relire les occupations sans déplacer silencieusement la source sélectionnée.
        try {
          const next = await load();
          const current = searchStorage(next, `#${selected.repair.id}`).find(
            (item) => item.repair.id === selected.repair.id,
          );
          if (current) setSelected(current);
          else {
            setSelected(null);
            setMoving(false);
          }
        } catch {
          /* Le bouton Actualiser permet de reprendre après une coupure. */
        }
      }
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl">Rangement des robots</h1>
          <p className="text-sm text-muted-foreground">
            Places réservées jusqu’à la remise physique au client.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() =>
            void load(true).catch(() => setError('Actualisation impossible.'))
          }
        >
          Actualiser
        </Button>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {!data ? (
        <Spinner />
      ) : (
        <>
          {!data.settings.enabled && (
            <Alert>
              <AlertDescription>
                Le rangement est désactivé. Les réservations existantes restent
                visibles.
              </AlertDescription>
            </Alert>
          )}
          <section
            className="rounded-lg border border-amber-500/50 bg-amber-500/5 p-4"
            aria-label="Robots sans emplacement"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-medium">
                  {data.unlocated.length} robot
                  {data.unlocated.length > 1 ? 's' : ''} déposé
                  {data.unlocated.length > 1 ? 's' : ''} sans emplacement
                </h2>
                <p className="text-sm text-muted-foreground">
                  Affectation à l’initiative de l’employé dès qu’une place se
                  libère.
                </p>
              </div>
              <Button
                variant="outline"
                disabled={!data.unlocated.length || moving}
                aria-expanded={exceptions}
                onClick={() => setExceptions(!exceptions)}
              >
                {exceptions ? 'Masquer la liste' : 'Voir et affecter'}
              </Button>
            </div>
            {exceptions && (
              <ul className="mt-3 space-y-2">
                {data.unlocated.map((repair) => (
                  <li key={repair.id}>
                    <Button
                      variant="outline"
                      disabled={moving || busy}
                      onClick={() => choose({ repair, slot: null, rack: null })}
                    >
                      {storageRepairLabel(repair)}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <div>
            <label htmlFor="storage-search" className="text-sm font-medium">
              Retrouver un robot
            </label>
            <Input
              id="storage-search"
              type="search"
              placeholder="N° de fiche ou client"
              value={query}
              disabled={moving || busy}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query.trim() && (
              <ul
                className="mt-2 max-h-60 space-y-1 overflow-auto"
                aria-label="Résultats de recherche"
              >
                {results.length ? (
                  results.map((item) => (
                    <li key={item.repair.id}>
                      <Button
                        variant="outline"
                        disabled={moving || busy}
                        onClick={() => choose(item)}
                      >
                        {storageRepairLabel(item.repair)} ·{' '}
                        {item.slot?.code ?? 'Sans emplacement'}
                      </Button>
                    </li>
                  ))
                ) : (
                  <li>Aucun robot déposé trouvé.</li>
                )}
              </ul>
            )}
          </div>
          <div ref={nav} className="relative min-w-0 overflow-hidden">
            <div
              ref={tabs}
              role="group"
              aria-label="Choisir un rack"
              aria-hidden={selectNavigation}
              className={`flex w-max gap-2 ${selectNavigation ? 'invisible absolute pointer-events-none' : ''}`}
            >
              {racks.map((r) => (
                <Button
                  key={r.id}
                  tabIndex={selectNavigation ? -1 : 0}
                  aria-pressed={rackId === r.id}
                  variant={rackId === r.id ? 'default' : 'outline'}
                  onClick={() => {
                    setRackId(r.id);
                    setDestination(null);
                  }}
                >
                  {rackLabel(r)}
                </Button>
              ))}
            </div>
            {selectNavigation && (
              <div>
                <label className="text-sm" id="rack-picker-label">
                  Rack affiché
                </label>
                <Select
                  value={String(rackId ?? '')}
                  onValueChange={(value) => {
                    if (value) {
                      setRackId(Number(value));
                      setDestination(null);
                    }
                  }}
                >
                  <SelectTrigger
                    aria-labelledby="rack-picker-label"
                    className="w-full"
                  >
                    <SelectValue>
                      {() => (rack ? rackLabel(rack) : 'Aucun rack actif')}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {racks.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {rackLabel(r)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {message && (
            <p role="status" className="rounded-lg bg-primary/10 p-3">
              {message}
            </p>
          )}
          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <aside
              className="order-first self-start rounded-lg border p-4 lg:order-last"
              aria-label="Robot sélectionné"
            >
              {selected ? (
                <>
                  <h2 className="font-medium">
                    {moving ? 'Déplacement en cours' : 'Robot sélectionné'}
                  </h2>
                  <p className="my-2 text-xl font-semibold">
                    {selected.slot?.code ?? 'Sans emplacement'}
                    {destination ? ` → ${destination.code}` : ''}
                  </p>
                  <p>{storageRepairLabel(selected.repair)}</p>
                  {(selected.repair.robot_type_name ||
                    selected.repair.state) && (
                    <p className="text-sm text-muted-foreground">
                      {[selected.repair.robot_type_name, selected.repair.state]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}
                  <div className="mt-3 flex flex-col gap-2">
                    {data.settings.enabled && (
                      <>
                        {!selected.slot && !moving && (
                          <Button disabled={busy} onClick={() => void assign()}>
                            Attribuer une place libre
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          disabled={busy}
                          onClick={() => {
                            setMoving(!moving);
                            setDestination(null);
                            pending.current = null;
                          }}
                        >
                          {moving
                            ? 'Annuler le déplacement'
                            : selected.slot
                              ? 'Déplacer le robot'
                              : 'Choisir une place'}
                        </Button>
                        {destination && (
                          <Button
                            disabled={busy}
                            onClick={() => void assign(destination)}
                          >
                            Confirmer{' '}
                            {selected.slot?.code ?? 'Sans emplacement'} →{' '}
                            {destination.code}
                          </Button>
                        )}
                      </>
                    )}
                    <Button
                      variant="outline"
                      nativeButton={false}
                      render={
                        <Link href={`/reparation/${selected.repair.id}`} />
                      }
                    >
                      Ouvrir la fiche et réimprimer
                    </Button>
                  </div>
                  {moving && (
                    <p className="mt-3 text-sm">
                      Choisissez une place libre. Vous pouvez changer de rack en
                      conservant ce robot.
                    </p>
                  )}
                </>
              ) : (
                <p>
                  Sélectionnez un robot dans le rack, les résultats ou la liste
                  des sans emplacement.
                </p>
              )}
            </aside>
            <section className="min-w-0" aria-label="Rack de face">
              {rack ? (
                <>
                  <h2 className="mb-2 font-medium">{rackLabel(rack)}</h2>
                  <div className="rounded border-x-8 border-muted bg-card px-1 sm:px-3">
                    {[4, 3, 2, 1].map((level) => (
                      <div
                        key={level}
                        className="grid grid-cols-[14px_repeat(3,minmax(0,1fr))] gap-1 border-b-8 border-muted py-3 sm:gap-3"
                      >
                        <span
                          className="self-center text-xs text-muted-foreground"
                          aria-label={`Étage ${level}`}
                        >
                          {level}
                        </span>
                        {rack.slots
                          .filter((slot) => slot.level === level)
                          .sort((a, b) => a.position.localeCompare(b.position))
                          .map((slot) => (
                            <button
                              key={slot.id}
                              type="button"
                              disabled={busy || (moving && !!slot.repair)}
                              aria-pressed={
                                selected?.slot?.id === slot.id ||
                                destination?.id === slot.id
                              }
                              aria-label={`${slot.code}, ${slot.repair ? storageRepairLabel(slot.repair) : 'libre'}`}
                              onClick={() => {
                                if (moving) {
                                  setDestination(slot);
                                  pending.current = null;
                                } else if (slot.repair)
                                  choose({ repair: slot.repair, slot, rack });
                              }}
                              className={`flex min-h-24 min-w-0 flex-col items-center justify-center rounded-lg border p-1 text-center text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 sm:text-sm ${selected?.slot?.id === slot.id || destination?.id === slot.id ? 'border-primary bg-primary text-primary-foreground' : slot.repair ? 'border-primary/30 bg-primary/10' : 'border-dashed bg-background'} ${moving && !slot.repair ? 'border-primary' : ''}`}
                            >
                              <strong className="whitespace-nowrap">
                                {slot.code}
                              </strong>
                              {slot.repair ? (
                                <Bot className="my-1 size-6" aria-hidden />
                              ) : (
                                <Plus className="my-1 size-6" aria-hidden />
                              )}
                              <span>
                                {slot.repair ? `#${slot.repair.id}` : 'Libre'}
                              </span>
                            </button>
                          ))}
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Étages de bas en haut · A à C de gauche à droite
                  </p>
                </>
              ) : (
                <p>Aucun rack actif.</p>
              )}
            </section>
          </div>
          <StorageSettings data={data} token={token} onSaved={load} />
        </>
      )}
    </div>
  );
}
function rackLabel(rack: StorageRack) {
  const free = rack.slots.filter((slot) => !slot.repair).length;
  return `Rack ${rack.number} · ${free ? `${free} libres` : 'Complet'}`;
}
