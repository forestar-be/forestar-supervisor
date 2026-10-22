'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from 'react';
import Link from 'next/link';
import {
  Bot,
  CalendarDays,
  Check,
  Clock3,
  FileText,
  Move,
  Plus,
  RefreshCw,
  UserRound,
  Wrench,
} from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Button,
  ConfirmDialog,
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
  toast,
} from '@forestar-be/ui';
import { useAuth } from '@/lib/auth';
import {
  commandRepairStorage,
  getRepairStorage,
  fetchRepairById,
  getStorage,
  isHttpError,
} from '@/lib/api';
import {
  searchStorage,
  storageRepairLabel,
  storageRobotLabel,
  type RepairStorage,
  type StorageCommand,
  type StorageOverview,
  type StorageRack,
  type StorageRepair,
  type StorageSlot,
} from '@/lib/storage';

import { StorageSearch } from './storage-search';
import { StorageRobotPhoto } from './storage-robot-photo';
import { StorageSlotPicker } from './storage-slot-picker';
import type { MachineRepair } from '@/lib/types';

type RobotDetails = Pick<
  MachineRepair,
  | 'repair_or_maintenance'
  | 'repairer_name'
  | 'fault_description'
  | 'hivernage'
  | 'warranty'
  | 'devis'
  | 'entry_date'
>;

interface Selection {
  repair: StorageRepair;
  slot: StorageSlot | null;
  rack: StorageRack | null;
  /** false : fiche jamais déposée (proposée par la recherche de la modale). */
  deposited?: boolean;
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
  const [robotDetails, setRobotDetails] = useState<RobotDetails | null>(null);
  const [robotError, setRobotError] = useState('');
  const [detail, setDetail] = useState<RepairStorage | null>(null);
  const [moving, setMoving] = useState(false);
  const [destination, setDestination] = useState<StorageSlot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [exceptions, setExceptions] = useState(false);
  const [selectNavigation, setSelectNavigation] = useState(true);
  const nav = useRef<HTMLDivElement>(null);
  const tabs = useRef<HTMLDivElement>(null);
  const pending = useRef<StorageCommand | null>(null);
  const running = useRef(false);
  const linked = useRef(false);
  const dragged = useRef<Selection | null>(null);
  const dragDropped = useRef(false);
  const dragWasMoving = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [pickerSlot, setPickerSlot] = useState<StorageSlot | null>(null);
  const confirming = useRef(false);
  useEffect(() => {
    confirming.current = !!destination || !!pickerSlot;
  }, [destination, pickerSlot]);
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);
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
    fetchRepairById(String(selectedId), token)
      .then((value) => {
        if (active) {
          setRobotDetails(value as RobotDetails);
          setRobotError('');
        }
      })
      .catch(() => {
        if (active) {
          setRobotDetails(null);
          setRobotError('Les détails de la fiche sont indisponibles.');
        }
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
      if (busy || confirming.current) return;
      if (event instanceof KeyboardEvent) {
        if (event.key !== 'Escape') return;
      } else if (
        event.target instanceof Element &&
        event.target.closest(
          '[data-storage-interactive], [role="listbox"], [role="dialog"], [role="alertdialog"]',
        )
      )
        return;
      setSelected(null);
      setDetail(null);
      setMoving(false);
      setDestination(null);
      pending.current = null;
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
    ) {
      setDetail(null);
      setRobotDetails(null);
      setRobotError('');
    }
    setSelected(item);
    if (item.rack) setRackId(item.rack.id);
  }
  async function assign(
    slot?: StorageSlot,
    source: Selection | null = selected,
  ) {
    const selected = source;
    if (!selected || running.current) return false;
    running.current = true;
    setBusy(true);
    setError('');
    const command = pending.current ?? {
      commandId: crypto.randomUUID(),
      action: selected.slot
        ? ('move' as const)
        : selected.deposited === false
          ? ('deposit' as const)
          : ('assign' as const),
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
      toast.success(
        `Fiche #${selected.repair.id} affectée à ${detail.location?.code ?? 'sans emplacement'}`,
        { description: 'Réimprimez les tickets depuis la fiche.' },
      );
      return true;
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
      return false;
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  async function placeFromPicker(source: Selection, slot: StorageSlot) {
    pending.current = null;
    setMoving(false);
    setDestination(null);
    if (await assign(slot, source)) setPickerSlot(null);
  }
  function startDrag(item: Selection, event: DragEvent) {
    const current = selectedRef.current;
    const isCurrent =
      current?.repair.id === item.repair.id &&
      current?.slot?.id === item.slot?.id;
    if (busy || !data?.settings.enabled || (moving && !isCurrent)) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(item.repair.id));
    dragged.current = item;
    dragDropped.current = false;
    dragWasMoving.current = moving;
    // Laisser le navigateur capturer l'image du glissé avant de changer l'affichage.
    setTimeout(() => {
      if (!moving) choose(item);
      setDragging(true);
      setMoving(true);
      setDestination(null);
      pending.current = null;
    }, 0);
  }
  function endDrag() {
    dragged.current = null;
    setDragging(false);
    setDropTargetId(null);
    if (!dragDropped.current && !dragWasMoving.current) {
      setMoving(false);
      setDestination(null);
    }
  }
  function cancelConfirmation() {
    if (busy) return;
    setDestination(null);
    pending.current = null;
    // Un glisser-déposer annulé ne laisse pas la page en mode déplacement.
    if (dragDropped.current && !dragWasMoving.current) setMoving(false);
    dragDropped.current = false;
  }
  function dropOn(slot: StorageSlot, event: DragEvent) {
    event.preventDefault();
    const source = dragged.current;
    setDropTargetId(null);
    if (!source || slot.repair || slot.id === source.slot?.id) return;
    dragDropped.current = true;
    pending.current = null;
    setDestination(slot);
  }
  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl">Rangement des robots</h1>
        <StorageSearch
          data={data}
          disabled={moving || busy}
          onChoose={choose}
        />
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
                        draggable={data.settings.enabled && !moving && !busy}
                        onDragStart={(event) =>
                          startDrag({ repair, slot: null, rack: null }, event)
                        }
                        onDragEnd={endDrag}
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
            className="gap-5"
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
                className={`h-11 w-max rounded-2xl p-1 ${selectNavigation ? 'invisible absolute pointer-events-none' : ''}`}
              >
                {racks.map((r) => (
                  <TabsTrigger
                    key={r.id}
                    value={String(r.id)}
                    tabIndex={selectNavigation ? -1 : undefined}
                    onDragOver={(event) => {
                      if (!dragging) return;
                      event.preventDefault();
                      if (rackId !== r.id) {
                        setRackId(r.id);
                        setDestination(null);
                      }
                    }}
                    className="rounded-xl px-5 text-sm data-active:text-primary"
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
            <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_480px]">
              <aside
                data-storage-interactive
                className={`${selected ? 'order-first' : 'order-last'} min-w-0 self-start rounded-2xl border bg-card p-5 shadow-sm sm:p-6 lg:order-last ${moving ? 'border-primary motion-safe:animate-[storage-moving-blink_1.6s_ease-in-out_infinite]' : ''}`}
                aria-label="Robot sélectionné"
              >
                {selected ? (
                  <>
                    <h2 className="text-lg font-semibold">
                      {moving ? 'Déplacement en cours' : 'Robot sélectionné'}
                    </h2>
                    <div className="my-5 flex items-center gap-4">
                      <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary/8">
                        <Bot className="size-8" aria-hidden />
                      </span>
                      <div className="min-w-0 break-words">
                        <p className="text-xl font-semibold sm:text-2xl">
                          {selected.slot?.code ?? 'Sans emplacement'}
                          {destination ? ` → ${destination.code}` : ''}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {storageRepairLabel(selected.repair)}
                        </p>
                        {storageRobotLabel(selected.repair) && (
                          <p className="mt-1 font-semibold">
                            {storageRobotLabel(selected.repair)}
                          </p>
                        )}
                        {selected.repair.state && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {selected.repair.state}
                          </p>
                        )}
                      </div>
                    </div>
                    {robotDetails && (
                      <div className="space-y-4 border-t py-5 text-sm">
                        <dl className="space-y-4">
                          {robotDetails.repair_or_maintenance && (
                            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
                              <dt className="flex items-center gap-2 text-muted-foreground">
                                <Wrench
                                  className="size-4 shrink-0"
                                  aria-hidden
                                />
                                Prestation
                              </dt>
                              <dd>{robotDetails.repair_or_maintenance}</dd>
                            </div>
                          )}
                          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
                            <dt className="flex items-center gap-2 text-muted-foreground">
                              <UserRound
                                className="size-4 shrink-0"
                                aria-hidden
                              />
                              Réparateur
                            </dt>
                            <dd className="break-words">
                              {robotDetails.repairer_name || 'Non attribué'}
                            </dd>
                          </div>
                          {robotDetails.entry_date && (
                            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
                              <dt className="flex items-center gap-2 text-muted-foreground">
                                <CalendarDays
                                  className="size-4 shrink-0"
                                  aria-hidden
                                />
                                Entrée à l’atelier
                              </dt>
                              <dd>
                                {new Date(
                                  robotDetails.entry_date,
                                ).toLocaleDateString('fr-BE')}
                              </dd>
                            </div>
                          )}
                          {robotDetails.fault_description && (
                            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
                              <dt className="flex items-start gap-2 text-muted-foreground">
                                <FileText
                                  className="mt-0.5 size-4 shrink-0"
                                  aria-hidden
                                />
                                Demande du client
                              </dt>
                              <dd className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words">
                                {robotDetails.fault_description}
                              </dd>
                            </div>
                          )}
                        </dl>
                        {(robotDetails.hivernage ||
                          robotDetails.warranty ||
                          robotDetails.devis) && (
                          <p className="font-medium">
                            {[
                              robotDetails.hivernage && 'Hivernage',
                              robotDetails.warranty && 'Garantie',
                              robotDetails.devis && 'Devis demandé',
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        )}
                      </div>
                    )}
                    {robotError && (
                      <p
                        className="mt-3 text-sm text-muted-foreground"
                        role="status"
                      >
                        {robotError}
                      </p>
                    )}
                    {(detail?.depositedAt || detail?.history[0]) && (
                      <dl className="space-y-4 border-t py-5 text-sm">
                        {detail.depositedAt && (
                          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
                            <dt className="flex items-center gap-2 text-muted-foreground">
                              <Clock3 className="size-4 shrink-0" aria-hidden />
                              Déposé le
                            </dt>
                            <dd>
                              {new Date(detail.depositedAt).toLocaleString(
                                'fr-BE',
                              )}
                            </dd>
                          </div>
                        )}
                        {detail.history[0] && (
                          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
                            <dt className="flex items-center gap-2 text-muted-foreground">
                              <RefreshCw
                                className="size-4 shrink-0"
                                aria-hidden
                              />
                              Dernier mouvement
                            </dt>
                            <dd>
                              {new Date(
                                detail.history[0].createdAt,
                              ).toLocaleString('fr-BE')}
                            </dd>
                          </div>
                        )}
                      </dl>
                    )}
                    <div className="mt-2 flex flex-col gap-2.5">
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
                            variant={moving ? 'outline' : 'default'}
                            className="h-auto min-h-11 whitespace-normal py-3"
                            disabled={busy}
                            onClick={() => {
                              setMoving(!moving);
                              setDestination(null);
                              pending.current = null;
                            }}
                          >
                            <Move className="size-4 shrink-0" aria-hidden />
                            {moving
                              ? 'Annuler le déplacement'
                              : selected.slot
                                ? 'Déplacer le robot'
                                : 'Choisir une place'}
                          </Button>
                        </>
                      )}
                      <Button
                        variant="outline"
                        className="h-auto min-h-11 whitespace-normal border-primary/40 py-3"
                        nativeButton={false}
                        render={
                          <Link href={`/reparation/${selected.repair.id}`} />
                        }
                      >
                        <FileText className="size-4 shrink-0" aria-hidden />
                        Ouvrir la fiche et réimprimer
                      </Button>
                    </div>
                    {moving && (
                      <p className="mt-3 text-sm">
                        Choisissez une place libre ou glissez le robot dessus.
                        Vous pouvez changer de rack en conservant ce robot.
                      </p>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-4 text-center">
                    <span className="flex size-14 items-center justify-center rounded-full bg-primary/8">
                      <Bot className="size-7 text-primary" aria-hidden />
                    </span>
                    <h2 className="font-semibold">Aucun robot sélectionné</h2>
                    <p className="max-w-xs text-sm text-muted-foreground">
                      Sélectionnez un robot dans le rack, les résultats ou la
                      liste des sans emplacement.
                    </p>
                  </div>
                )}
              </aside>
              <TabsContent
                value={String(rackId ?? '')}
                className="min-w-0"
                aria-label="Rack de face"
              >
                {rack ? (
                  <div className="rounded-2xl border bg-card p-3 shadow-sm sm:p-4 xl:p-5">
                    <div className="space-y-2">
                      <div
                        className="grid grid-cols-[24px_repeat(3,minmax(0,1fr))] gap-1.5 text-center text-sm font-semibold sm:grid-cols-[40px_repeat(3,minmax(0,1fr))] sm:gap-2.5"
                        aria-label="Colonnes du rack"
                      >
                        <span />
                        {['A', 'B', 'C'].map((position) => (
                          <span
                            key={position}
                            className="rounded-t-lg bg-primary/5 py-2"
                          >
                            {position}
                          </span>
                        ))}
                      </div>
                      {[4, 3, 2, 1].map((level) => (
                        <div
                          key={level}
                          className="grid grid-cols-[24px_repeat(3,minmax(0,1fr))] gap-1.5 sm:grid-cols-[40px_repeat(3,minmax(0,1fr))] sm:gap-2.5"
                        >
                          <span
                            className="flex items-center justify-center rounded-l-lg bg-primary/5 text-sm font-semibold sm:text-base"
                            aria-label={`Étage ${level}`}
                          >
                            {level}
                          </span>
                          {rack.slots
                            .filter((slot) => slot.level === level)
                            .sort((a, b) =>
                              a.position.localeCompare(b.position),
                            )
                            .map((slot) => {
                              const isSource = selected?.slot?.id === slot.id;
                              const isTarget =
                                destination?.id === slot.id ||
                                dropTargetId === slot.id;
                              const canDrag =
                                !!slot.repair &&
                                !busy &&
                                data.settings.enabled &&
                                (!moving || isSource);
                              return (
                                <button
                                  key={slot.id}
                                  type="button"
                                  data-storage-interactive=""
                                  draggable={canDrag}
                                  onDragStart={(event) =>
                                    slot.repair &&
                                    startDrag(
                                      { repair: slot.repair, slot, rack },
                                      event,
                                    )
                                  }
                                  onDragEnd={endDrag}
                                  onDragOver={(event) => {
                                    if (!dragging || slot.repair) return;
                                    event.preventDefault();
                                    event.dataTransfer.dropEffect = 'move';
                                    if (dropTargetId !== slot.id)
                                      setDropTargetId(slot.id);
                                  }}
                                  onDragLeave={() => {
                                    if (dropTargetId === slot.id)
                                      setDropTargetId(null);
                                  }}
                                  onDrop={(event) => dropOn(slot, event)}
                                  disabled={
                                    busy ||
                                    (moving
                                      ? !!slot.repair && !isSource
                                      : !slot.repair && !data.settings.enabled)
                                  }
                                  aria-pressed={
                                    selected?.slot?.id === slot.id ||
                                    destination?.id === slot.id
                                  }
                                  aria-label={`${slot.code}, ${slot.repair ? storageRepairLabel(slot.repair) : moving || !data.settings.enabled ? 'libre' : 'libre, ajouter un robot'}`}
                                  onClick={() => {
                                    if (moving) {
                                      if (slot.repair) return;
                                      setDestination(slot);
                                      pending.current = null;
                                    } else if (slot.repair)
                                      choose({
                                        repair: slot.repair,
                                        slot,
                                        rack,
                                      });
                                    else setPickerSlot(slot);
                                  }}
                                  className={`relative flex min-h-28 min-w-0 flex-col items-center justify-center gap-2 rounded-lg border p-2 text-center text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-default sm:p-3 sm:text-sm xl:min-h-[clamp(112px,15dvh,144px)] xl:flex-row xl:gap-3 xl:py-1.5 xl:text-left ${canDrag ? 'enabled:cursor-grab enabled:active:cursor-grabbing' : ''} ${!moving || !slot.repair ? 'enabled:cursor-pointer enabled:hover:border-primary/60' : ''} ${moving && slot.repair && !isSource ? 'opacity-50' : ''} ${isSource || isTarget ? 'border-2 border-primary bg-primary/8 ring-1 ring-primary/10' : slot.repair ? 'border-border bg-muted/50' : 'border-dashed border-foreground/20 bg-muted/20'} ${moving && isSource ? 'motion-safe:animate-[storage-moving-blink_1.6s_ease-in-out_infinite]' : ''} ${moving && !slot.repair ? 'border-primary bg-primary/5' : ''}`}
                                >
                                  {slot.repair ? (
                                    <>
                                      <StorageRobotPhoto
                                        src={slot.repair.imageUrl}
                                      />
                                      <span className="min-w-0 w-full max-w-full sm:w-auto sm:break-words xl:border-l xl:pl-3">
                                        <strong
                                          className="block truncate font-semibold leading-snug sm:whitespace-normal"
                                          title={
                                            storageRobotLabel(slot.repair) ||
                                            'Robot'
                                          }
                                        >
                                          {storageRobotLabel(slot.repair) ||
                                            'Robot'}
                                        </strong>
                                        <span className="mt-1 block truncate text-muted-foreground sm:whitespace-normal">
                                          {slot.repair.client.firstName}{' '}
                                          {slot.repair.client.lastName}
                                        </span>
                                        <span className="mt-0.5 block text-muted-foreground">
                                          #{slot.repair.id}
                                        </span>
                                      </span>
                                      {selected?.slot?.id === slot.id && (
                                        <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                          <Check
                                            className="size-3.5"
                                            aria-hidden
                                          />
                                        </span>
                                      )}
                                    </>
                                  ) : moving ? (
                                    <>
                                      <Plus
                                        className="size-6 rounded-full bg-primary/10 p-1 text-primary"
                                        aria-hidden
                                      />
                                      <span>Placer ici</span>
                                    </>
                                  ) : (
                                    <span className="flex flex-col items-center gap-1.5 text-muted-foreground">
                                      <Plus
                                        className="size-6 rounded-full bg-muted p-1"
                                        aria-hidden
                                      />
                                      Libre
                                      {data.settings.enabled && (
                                        <span className="text-xs">
                                          Ajouter un robot
                                        </span>
                                      )}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p>Aucun rack actif.</p>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </>
      )}
      {data && (
        <StorageSlotPicker
          data={data}
          slot={pickerSlot}
          busy={busy}
          onClose={() => setPickerSlot(null)}
          onConfirm={(source, slot) => void placeFromPicker(source, slot)}
        />
      )}
      <ConfirmDialog
        open={!!selected && !!destination}
        title="Déplacer le robot"
        message={
          selected && destination
            ? `${storageRepairLabel(selected.repair)} : ${selected.slot?.code ?? 'sans emplacement'} → ${destination.code}. Pensez à réimprimer les tickets depuis la fiche.`
            : ''
        }
        confirmText={`Confirmer ${selected?.slot?.code ?? 'Sans emplacement'} → ${destination?.code ?? ''}`}
        cancelText="Annuler"
        isLoading={busy}
        onConfirm={() => {
          if (destination) void assign(destination);
        }}
        onClose={cancelConfirmation}
      />
    </div>
  );
}
function rackLabel(rack: StorageRack) {
  const free = rack.slots.filter((slot) => !slot.repair).length;
  return `Rack ${rack.number} · ${free ? `${free} libres` : 'Complet'}`;
}
