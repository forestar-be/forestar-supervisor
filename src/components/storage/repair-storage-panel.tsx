'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { History, Info } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Button,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@forestar-be/ui';
import {
  commandRepairStorage,
  getRepairStorage,
  getStorage,
  isHttpError,
  previewRepairStorageResize,
} from '@/lib/api';
import {
  storageSizeLabel,
  type RepairStorage,
  type StorageCommand,
  type StorageOverview,
  type StorageResizePreview,
  type StorageSize,
} from '@/lib/storage';

/** Phrase d'aperçu du changement de taille d'un robot rangé. */
function resizeMessage(preview: StorageResizePreview) {
  const from = preview.fromCode ?? 'sans place';
  const to = preview.toCode ?? 'sans place';
  switch (preview.kind) {
    case 'extend':
      return `Extension sur place : ${from} → ${to}. Le robot occupera deux places voisines.`;
    case 'move':
      return `Déplacement vers ${to} : ${from} → ${to}. La place voisine n’est pas libre, le robot change de paire.`;
    case 'reduce':
      return `Réduction à une place : ${from} → ${to}. La seconde place est libérée.`;
    case 'refused':
      return `Refusé : aucune paire libre, place et taille conservées${preview.fromCode ? ` (${preview.fromCode})` : ''}.`;
    case 'update':
      return 'Seule la taille de la fiche change ; elle n’a pas de place.';
    default:
      return 'Aucun changement.';
  }
}

export function RepairStoragePanel({
  id,
  token,
  machineType,
  exited,
  onPrint,
  printing,
}: {
  id: number;
  token: string;
  machineType: string | null;
  exited: boolean;
  onPrint: () => void;
  printing: boolean;
}) {
  const [open, setOpen] = useState<'details' | 'history' | null>(null);
  const [detail, setDetail] = useState<RepairStorage | null>(null);
  const [overview, setOverview] = useState<StorageOverview | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [overflow, setOverflow] = useState(false);
  const [changed, setChanged] = useState(false);
  const pending = useRef<StorageCommand | null>(null);
  const pendingResize = useRef<StorageCommand | null>(null);
  const [resize, setResize] = useState<StorageResizePreview | null>(null);
  const running = useRef(false);
  useEffect(() => {
    let active = true;
    Promise.all([getRepairStorage(token, id), getStorage(token)])
      .then(([storage, data]) => {
        if (active) {
          setDetail(storage);
          setOverview(data);
        }
      })
      .catch(() => {
        if (active)
          setError('Impossible de charger le rangement. Rechargez la fiche.');
      });
    return () => {
      active = false;
    };
  }, [id, token, exited]);
  async function submit(confirmOverflow = false) {
    if (running.current || !detail) return;
    running.current = true;
    setBusy(true);
    setError('');
    const command = pending.current ?? {
      commandId: crypto.randomUUID(),
      action: detail.depositedAt ? ('assign' as const) : ('deposit' as const),
    };
    // La confirmation de débordement constitue une nouvelle commande après le refus sans écriture.
    pending.current = command;
    try {
      setDetail(
        await commandRepairStorage(token, id, {
          ...command,
          ...(confirmOverflow ? { confirmOverflow: true } : {}),
        }),
      );
      pending.current = null;
      setOverflow(false);
      setChanged(true);
    } catch (e) {
      const code = isHttpError(e) ? (e.data as { code?: string })?.code : null;
      if (code === 'storage_full_confirmation_required') {
        pending.current = null;
        setOverflow(true);
      } else {
        setError(
          e instanceof Error
            ? e.message
            : 'Enregistrement impossible. Réessayez.',
        );
        if (isHttpError(e)) pending.current = null;
      }
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  async function reload() {
    try {
      const [storage, data] = await Promise.all([
        getRepairStorage(token, id),
        getStorage(token),
      ]);
      setDetail(storage);
      setOverview(data);
    } catch {
      /* L'affichage actuel reste ; un rechargement de la fiche relira tout. */
    }
  }
  /** Fiche sans place : le champ change directement ; robot rangé : aperçu puis confirmation. */
  async function requestSize(size: StorageSize) {
    if (running.current || !detail || size === (detail.size ?? 'STANDARD'))
      return;
    if (!detail.location) {
      pendingResize.current = null;
      await applyResize(size, null);
      return;
    }
    running.current = true;
    setBusy(true);
    setError('');
    try {
      const preview = await previewRepairStorageResize(token, id, size);
      if (preview.kind === 'none') return;
      pendingResize.current = null;
      setResize(preview);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Aperçu impossible. Réessayez.',
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  async function applyResize(
    size: StorageSize,
    preview: StorageResizePreview | null,
  ) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError('');
    const location = detail?.location;
    // Même commande rejouée après une coupure : le serveur la dédoublonne.
    const command: StorageCommand = pendingResize.current ?? {
      commandId: crypto.randomUUID(),
      action: 'resize',
      size,
      ...(location
        ? {
            expectedSlotId: location.slotId,
            expectedToCode: preview?.toCode ?? null,
          }
        : {}),
    };
    pendingResize.current = command;
    try {
      setDetail(await commandRepairStorage(token, id, command));
      pendingResize.current = null;
      setResize(null);
      setChanged(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Changement de taille impossible. Réessayez.',
      );
      if (isHttpError(e)) {
        // Le rangement a changé entre l'aperçu et la confirmation : relire avant de reproposer.
        pendingResize.current = null;
        setResize(null);
        await reload();
      }
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  const eligible = overview?.machineTypes.some(
    (type) => type.name === machineType && type.isRobot,
  );
  if (!detail)
    return error ? (
      <Alert>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    ) : null;
  if (
    !detail.depositedAt &&
    detail.history.length === 0 &&
    (!eligible || !overview?.settings.enabled || exited)
  )
    return null;
  return (
    <div
      className="flex min-w-0 flex-wrap items-center gap-2 text-sm"
      aria-label="Rangement du robot"
    >
      <span className="font-medium text-muted-foreground">Rangement :</span>
      <span>
        {detail.location?.code ??
          (exited
            ? 'Robot rendu au client'
            : detail.depositedAt
              ? 'Sans emplacement'
              : 'Non déposé')}
      </span>
      {detail.size === 'LARGE' && (
        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">
          Large · 2 places
        </span>
      )}
      <div className="flex items-center gap-1">
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Détails du rangement"
          title="Détails du rangement"
          onClick={() => setOpen('details')}
        >
          <Info className="size-4" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Historique du rangement"
          title="Historique du rangement"
          onClick={() => setOpen('history')}
        >
          <History className="size-4" />
        </Button>
      </div>
      <Dialog
        open={open !== null}
        onOpenChange={(value) => {
          if (!value) setOpen(null);
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {open === 'history'
                ? 'Historique du rangement'
                : 'Détails du rangement'}
            </DialogTitle>
          </DialogHeader>
          {open === 'details' && (
            <div>
              {error && (
                <p role="alert" className="my-2 text-destructive">
                  {error}
                </p>
              )}
              <p className="my-2 text-lg font-semibold">
                {detail.location?.code ??
                  (exited
                    ? 'Robot rendu au client'
                    : detail.depositedAt
                      ? 'Robot déposé sans emplacement'
                      : 'Robot non déposé')}
              </p>
              <div
                role="group"
                aria-label="Taille du robot"
                className="mb-3 space-y-2"
              >
                <p className="text-sm text-muted-foreground">
                  Taille : {storageSizeLabel(detail.size)}
                </p>
                {!exited && (
                  <div className="flex flex-wrap gap-2">
                    {(['STANDARD', 'LARGE'] as const).map((size) => (
                      <Button
                        key={size}
                        size="sm"
                        variant={
                          (detail.size ?? 'STANDARD') === size
                            ? 'default'
                            : 'outline'
                        }
                        aria-pressed={(detail.size ?? 'STANDARD') === size}
                        disabled={busy}
                        onClick={() => void requestSize(size)}
                      >
                        {size === 'LARGE' ? 'Large (2 places)' : 'Standard'}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
              {detail.depositedAt && (
                <p className="mb-3 text-sm text-muted-foreground">
                  Déposé le{' '}
                  {new Date(detail.depositedAt).toLocaleString('fr-BE')}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {detail.location ? (
                  <Button
                    variant="outline"
                    nativeButton={false}
                    render={<Link href={`/rangement?fiche=${id}`} />}
                  >
                    Voir et déplacer dans le rack
                  </Button>
                ) : !exited && eligible && overview?.settings.enabled ? (
                  <Button disabled={busy} onClick={() => void submit()}>
                    {busy
                      ? 'Enregistrement…'
                      : detail.depositedAt
                        ? 'Attribuer une place libre'
                        : 'Enregistrer le dépôt à l’atelier'}
                  </Button>
                ) : null}
                {detail.depositedAt && !detail.location && !exited && (
                  <Button
                    variant="outline"
                    nativeButton={false}
                    render={<Link href={`/rangement?fiche=${id}`} />}
                  >
                    Choisir une place
                  </Button>
                )}
                {changed && (
                  <Button
                    variant="outline"
                    disabled={printing}
                    onClick={onPrint}
                  >
                    Réimprimer les tickets
                  </Button>
                )}
              </div>
            </div>
          )}
          {open === 'history' &&
            (detail.history.length > 0 ? (
              <div>
                <p className="text-sm text-muted-foreground">
                  Historique des emplacements ({detail.history.length})
                </p>
                <ol className="mt-2 space-y-2 text-sm">
                  {detail.history.map((event) => (
                    <li key={event.id}>
                      {new Date(event.createdAt).toLocaleString('fr-BE')} ·{' '}
                      {(
                        {
                          deposit: 'Dépôt à l’atelier',
                          assign: 'Attribution d’une place',
                          move: 'Déplacement',
                          resize: 'Changement de taille',
                          state_move: 'Déplacement Atelier / Hivernage',
                          release: 'Libération de la place',
                        } as Record<string, string>
                      )[event.action] ?? 'Modification du rangement'}{' '}
                      · {event.fromCode ?? 'sans place'} →{' '}
                      {event.toCode ?? 'sans place'} ·{' '}
                      {event.actor ?? 'Système'}
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucun mouvement enregistré.
              </p>
            ))}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={resize !== null}
        title="Changer la taille du robot"
        message={
          resize ? (
            <>
              <span className="block">{resizeMessage(resize)}</span>
              {resize.feasible && resize.kind !== 'refused' && (
                <span className="mt-2 block">
                  Pensez à réimprimer les tickets ensuite.
                </span>
              )}
            </>
          ) : (
            ''
          )
        }
        type={resize?.kind === 'refused' ? 'warning' : 'info'}
        hideConfirm={!resize || !resize.feasible || resize.kind === 'refused'}
        confirmText={`Confirmer ${resize?.fromCode ?? 'sans place'} → ${resize?.toCode ?? ''}`}
        cancelText={resize?.kind === 'refused' ? 'Fermer' : 'Annuler'}
        isLoading={busy}
        onClose={() => {
          if (!busy) {
            setResize(null);
            pendingResize.current = null;
          }
        }}
        onConfirm={() => resize && void applyResize(resize.size, resize)}
      />
      <ConfirmDialog
        open={overflow}
        title="Tous les racks sont complets"
        message="Confirmer le dépôt sans emplacement ? Le robot sera signalé dans les exceptions à affecter."
        confirmText="Confirmer sans emplacement"
        isLoading={busy}
        onClose={() => {
          if (!busy) {
            setOverflow(false);
            pending.current = null;
          }
        }}
        onConfirm={() => void submit(true)}
      />
    </div>
  );
}
