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
} from '@/lib/api';
import type {
  RepairStorage,
  StorageCommand,
  StorageOverview,
} from '@/lib/storage';

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
                          state_move: 'Déplacement lié au statut',
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
