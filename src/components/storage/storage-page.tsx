'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bot, Plus } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Button,
  Combobox,
  Tabs,
  TabsList,
  TabsContent,
  TabsTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
} from '@forestar-be/ui';
import { useAuth } from '@/lib/auth';
import {
  commandRepairStorage,
  getRepairStorage,
  getStorage,
  isHttpError,
} from '@/lib/api';
import {
  searchStorage,
  storageRepairLabel,
  type RepairStorage,
  type StorageCommand,
  type StorageOverview,
  type StorageRack,
  type StorageRepair,
  type StorageSlot,
} from '@/lib/storage';

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
  const [detail, setDetail] = useState<RepairStorage | null>(null);
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
        container.clientWidth < 768 || list.scrollWidth > container.clientWidth,
      );
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(list);
    measure();
    return () => observer.disconnect();
  }, [data?.racks.length]);
  const racks = data?.racks.filter((r) => r.active) ?? [];
  const rack = racks.find((r) => r.id === rackId);
  const results = data ? searchStorage(data, '#') : [];
  const selectedId = selected?.repair.id;
  const selectedSlotId = selected?.slot?.id;
  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    getRepairStorage(token, selectedId)
      .then((value) => {
        if (active) setDetail(value);
      })
      .catch(() => {
        if (active) setDetail(null);
      });
    return () => {
      active = false;
    };
  }, [token, selectedId, selectedSlotId]);
  useEffect(() => {
    const refresh = () => {
      if (!running.current)
        void load(true).catch(() => setError('Actualisation impossible.'));
    };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [load]);
  useEffect(() => {
    const dismiss = (event: PointerEvent | KeyboardEvent) => {
      if (busy) return;
      if (event instanceof KeyboardEvent) {
        if (event.key !== 'Escape') return;
      } else if (
        event.target instanceof Element &&
        event.target.closest('[data-storage-interactive], [role="listbox"]')
      )
        return;
      setSelected(null);
      setDetail(null);
      setMoving(false);
      setDestination(null);
      pending.current = null;
      setMessage('');
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', dismiss);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', dismiss);
    };
  }, [moving, busy, setSelected]);
  function choose(item: Selection) {
    if (moving) return;
    pending.current = null;
    setDestination(null);
    if (
      selectedRef.current?.repair.id !== item.repair.id ||
      selectedRef.current?.slot?.id !== item.slot?.id
    )
      setDetail(null);
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
          /* Le retour sur la fenêtre relancera la lecture après une coupure. */
        }
      }
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl">Rangement des robots</h1>
          <p className="text-sm text-muted-foreground">
            Places réservées jusqu’à la remise physique au client.
          </p>
        </div>
        <div className="w-full sm:w-80" data-storage-interactive>
          <label htmlFor="storage-search" className="sr-only">
            Retrouver un robot
          </label>
          <Combobox
            id="storage-search"
            aria-label="Retrouver un robot"
            className="w-full"
            placeholder="N° de fiche ou client"
            emptyMessage="Aucun robot déposé trouvé."
            options={results.map((item) => ({
              value: String(item.repair.id),
              label: `${storageRepairLabel(item.repair)} · ${item.slot?.code ?? 'Sans emplacement'}`,
            }))}
            value={selected ? String(selected.repair.id) : undefined}
            disabled={moving || busy}
            onChange={(value) => {
              const item = results.find(
                (result) => String(result.repair.id) === value,
              );
              if (item) choose(item);
              else {
                setSelected(null);
                setDetail(null);
              }
            }}
          />
        </div>
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
          {data.unlocated.length > 0 && (
            <section
              data-storage-interactive
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
                        onClick={() =>
                          choose({ repair, slot: null, rack: null })
                        }
                      >
                        {storageRepairLabel(repair)}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
          <Tabs
            value={String(rackId ?? '')}
            onValueChange={(value) => {
              if (value) {
                setRackId(Number(value));
                setDestination(null);
              }
            }}
            className="gap-4"
          >
            <div
              ref={nav}
              data-storage-interactive
              className="relative min-w-0 overflow-hidden"
            >
              <TabsList
                ref={tabs}
                aria-label="Choisir un rack"
                aria-hidden={selectNavigation}
                className={`w-max ${selectNavigation ? 'invisible absolute pointer-events-none' : ''}`}
              >
                {racks.map((r) => (
                  <TabsTrigger
                    key={r.id}
                    value={String(r.id)}
                    tabIndex={selectNavigation ? -1 : undefined}
                  >
                    {rackLabel(r)}
                  </TabsTrigger>
                ))}
              </TabsList>
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
            <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
              <aside
                data-storage-interactive
                className={`order-first self-start rounded-xl border p-5 lg:order-last ${selected ? 'border-primary/40 bg-card shadow-lg ring-2 ring-primary/15' : 'border-dashed bg-muted/30'}`}
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
                        {[
                          selected.repair.robot_type_name,
                          selected.repair.state,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                    {detail?.depositedAt && (
                      <p className="mt-3 text-sm">
                        <span className="text-muted-foreground">
                          Déposé le :{' '}
                        </span>
                        {new Date(detail.depositedAt).toLocaleString('fr-BE')}
                      </p>
                    )}
                    {detail?.history[0] && (
                      <p className="mt-1 text-sm">
                        <span className="text-muted-foreground">
                          Dernier mouvement :{' '}
                        </span>
                        {new Date(detail.history[0].createdAt).toLocaleString(
                          'fr-BE',
                        )}
                      </p>
                    )}
                    <div className="mt-3 flex flex-col gap-2">
                      {data.settings.enabled && (
                        <>
                          {!selected.slot && !moving && (
                            <Button
                              disabled={busy}
                              onClick={() => void assign()}
                            >
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
                        Choisissez une place libre. Vous pouvez changer de rack
                        en conservant ce robot.
                      </p>
                    )}
                  </>
                ) : (
                  <p>
                    Sélectionnez un robot dans le rack, les résultats ou la
                    liste des sans emplacement.
                  </p>
                )}
              </aside>
              <TabsContent
                value={String(rackId ?? '')}
                className="min-w-0"
                aria-label="Rack de face"
              >
                {rack ? (
                  <>
                    <div className="rounded border-x-8 border-muted bg-card px-1 sm:px-3">
                      <div
                        className="grid grid-cols-[14px_repeat(3,minmax(0,1fr))] gap-1 pt-3 text-center text-sm font-semibold sm:gap-3"
                        aria-label="Colonnes du rack"
                      >
                        <span />
                        {['A', 'B', 'C'].map((position) => (
                          <span key={position}>{position}</span>
                        ))}
                      </div>
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
                            .sort((a, b) =>
                              a.position.localeCompare(b.position),
                            )
                            .map((slot) => (
                              <button
                                key={slot.id}
                                type="button"
                                data-storage-interactive={
                                  slot.repair || moving ? '' : undefined
                                }
                                disabled={
                                  busy ||
                                  (moving ? !!slot.repair : !slot.repair)
                                }
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
                                className={`flex min-h-24 min-w-0 flex-col items-center justify-center rounded-lg border p-1 text-center text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-default sm:text-sm ${slot.repair || moving ? 'enabled:cursor-pointer' : ''} ${moving && slot.repair ? 'opacity-50' : ''} ${selected?.slot?.id === slot.id || destination?.id === slot.id ? 'border-primary bg-primary text-primary-foreground' : slot.repair ? 'border-primary/30 bg-primary/10' : 'border-dashed bg-background'} ${moving && !slot.repair ? 'border-primary' : ''}`}
                              >
                                {slot.repair ? (
                                  <>
                                    <Bot
                                      className="mb-1 size-5 shrink-0"
                                      aria-hidden
                                    />
                                    <strong className="max-w-full break-words">
                                      {slot.repair.brand_name}{' '}
                                      {slot.repair.robot_type_name ||
                                        `Fiche #${slot.repair.id}`}
                                    </strong>
                                    <span className="mt-1 max-w-full break-words">
                                      {slot.repair.client.firstName}{' '}
                                      {slot.repair.client.lastName}
                                    </span>
                                    <span className="mt-1">
                                      #{slot.repair.id}
                                      {slot.repair.state
                                        ? ` · ${slot.repair.state}`
                                        : ''}
                                    </span>
                                  </>
                                ) : moving ? (
                                  <>
                                    <Plus className="mb-1 size-6" aria-hidden />
                                    <span>Placer ici</span>
                                  </>
                                ) : (
                                  <span className="text-muted-foreground">
                                    Libre
                                  </span>
                                )}
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
              </TabsContent>
            </div>
          </Tabs>
        </>
      )}
    </div>
  );
}
function rackLabel(rack: StorageRack) {
  const free = rack.slots.filter((slot) => !slot.repair).length;
  return `Rack ${rack.number} · ${free ? `${free} libres` : 'Complet'}`;
}
