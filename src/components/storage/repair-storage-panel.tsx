'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Alert,
  AlertDescription,
  Button,
  ConfirmDialog,
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
    (!eligible || !overview?.settings.enabled || exited)
  )
    return null;
  return (
    <section className="rounded-lg border p-4" aria-label="Rangement du robot">
      <h2 className="font-medium">Rangement du robot</h2>
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
      <div className="flex flex-wrap gap-2">
        {detail.location ? (
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/rangement?fiche=${id}`} />}
          >
            Voir et déplacer dans le rack
          </Button>
        ) : !exited && overview?.settings.enabled ? (
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
          <Button variant="outline" disabled={printing} onClick={onPrint}>
            Réimprimer les tickets
          </Button>
        )}
      </div>
      {detail.history.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm">
            Historique des emplacements ({detail.history.length})
          </summary>
          <ol className="mt-2 space-y-2 text-sm">
            {detail.history.map((event) => (
              <li key={event.id}>
                {new Date(event.createdAt).toLocaleString('fr-BE')} ·{' '}
                {event.action} · {event.fromCode ?? 'sans place'} →{' '}
                {event.toCode ?? 'sans place'} · {event.actor ?? 'Système'}
              </li>
            ))}
          </ol>
        </details>
      )}
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
    </section>
  );
}
