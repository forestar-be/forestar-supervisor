'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { History } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Spinner,
  StatusBadge,
} from '@forestar-be/ui';
import dayjs from '@/lib/dayjs';
import { getRelatedRepairs, isHttpError } from '@/lib/api';
import { notifyError } from '@/lib/notifications';
import type { RelatedRepair, RelatedRepairMatch } from '@/lib/types';

const MATCH_LABELS: Record<RelatedRepairMatch, string> = {
  phone: 'même téléphone',
  name: 'même nom',
};

function formatDate(value: string | null): string {
  return value ? dayjs(value).format('DD/MM/YYYY') : '—';
}

function machineLabel(repair: RelatedRepair): string {
  const parts = [repair.machine_type_name, repair.brand_name].filter(
    (value): value is string => Boolean(value),
  );
  return parts.length ? parts.join(' — ') : 'Machine non renseignée';
}

/**
 * R003-S05 — « Passages précédents de ce client » (`GET /:id/related`, AC-06,
 * AC-07) : un bouton en haut à droite des coordonnées du client, avec le
 * nombre de passages, qui ouvre la liste dans une fenêtre (retour du PO du
 * 2026-09-24). Se recharge à chaque changement de fiche (l'effet dépend de
 * `id`, pas d'un état posé par le parent), archivées comprises, avec leur
 * motif de lien en clair.
 */
export function RelatedRepairsButton({
  id,
  token,
}: {
  id: string;
  token: string;
}) {
  const [related, setRelated] = useState<RelatedRepair[] | null>(null);
  // Pas de remise à `true` ici : le parent remonte ce composant (`key={id}`)
  // à chaque changement de fiche, ce qui réinitialise cet état par un nouveau
  // montage plutôt que par un `setState` synchrone dans l'effet (interdit
  // par `react-hooks/set-state-in-effect`).
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getRelatedRepairs(token, id)
      .then((data) => {
        if (!cancelled) setRelated(data);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Error fetching related repairs:', error);
        notifyError(
          isHttpError(error)
            ? error.message
            : "Une erreur s'est produite lors de la récupération des passages précédents",
        );
        setRelated([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, id]);

  const count = related?.length ?? 0;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="ml-auto"
        onClick={() => setOpen(true)}
        disabled={loading}
        aria-label={
          loading ? 'Passages précédents' : `Passages précédents (${count})`
        }
      >
        {loading ? <Spinner size="sm" /> : <History />}
        Passages précédents
        {!loading && (
          <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground tabular-nums">
            {count}
          </span>
        )}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[min(92vw,40rem)]">
          <DialogHeader>
            <DialogTitle>Passages précédents de ce client</DialogTitle>
            <DialogDescription>
              Les autres fiches du même client, archivées comprises : même
              téléphone, ou même nom et prénom.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {/* Le bouton reste désactivé pendant le chargement : la fenêtre
              ne s'ouvre qu'une fois la liste connue. */}
            {!related || related.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun autre passage trouvé pour ce client.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {related.map((repair) => (
                  <li
                    key={repair.id}
                    className="flex flex-col gap-1 py-2 text-sm first:pt-0 last:pb-0"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/reparation/${repair.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        Fiche n°{repair.id}
                      </Link>
                      <span className="text-muted-foreground">
                        {repair.repair_or_maintenance}
                      </span>
                      {repair.archived_at && (
                        <StatusBadge tone="neutral">Archivée</StatusBadge>
                      )}
                    </div>
                    <div className="text-muted-foreground">
                      {machineLabel(repair)}
                    </div>
                    <div className="text-muted-foreground">
                      Entrée : {formatDate(repair.entry_date)} — Sortie :{' '}
                      {formatDate(repair.exit_date)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Lien :{' '}
                      {repair.match
                        .map((match) => MATCH_LABELS[match])
                        .join(', ')}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
