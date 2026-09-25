'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, TriangleAlert } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@forestar-be/ui';
import { getClientDuplicates, isHttpError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { notifyError } from '@/lib/notifications';
import type { ClientDuplicatePair } from '@/lib/types';

type PairClient = ClientDuplicatePair['a'];

/** « Jean Dupont (+32 470…) » : le nom seul ne distingue pas deux homonymes. */
const describe = (client: PairClient) =>
  `${`${client.firstName} ${client.lastName}`.trim() || 'Sans nom'} (${
    client.phone || 'sans téléphone'
  })`;

/**
 * R009-S04 (AC-03) — encart « Doublons probables » en tête de `/clients` :
 * les paires de clients au nom proche (`GET /supervisor/clients/duplicates`).
 * Chaque paire ouvre la fusion (AC-04, `/clients/fusionner`).
 */
export function DuplicatesBanner() {
  const auth = useAuth();
  const router = useRouter();
  const [pairs, setPairs] = useState<ClientDuplicatePair[] | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getClientDuplicates(auth.token)
      .then((data) => {
        if (!cancelled) setPairs(data);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error('Error fetching client duplicates:', error);
        notifyError(
          isHttpError(error)
            ? error.message
            : "Une erreur s'est produite lors de la récupération des doublons",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [auth.token]);

  if (!pairs || pairs.length === 0) return null;

  const openPair = (pair: ClientDuplicatePair) => {
    setOpen(false);
    router.push(`/clients/fusionner?a=${pair.a.id}&b=${pair.b.id}`);
  };

  const count = pairs.length;

  return (
    <>
      <div
        role="status"
        className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-warning/40 bg-warning/15 px-3 py-2 text-sm"
      >
        <TriangleAlert className="size-4 shrink-0 text-warning" />
        <span className="flex-1 font-medium">
          {count} doublon{count > 1 ? 's' : ''} probable{count > 1 ? 's' : ''}{' '}
          <span className="font-normal text-muted-foreground">
            : des clients au nom proche, peut-être la même personne.
          </span>
        </span>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          Voir les paires
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Doublons probables</DialogTitle>
            <DialogDescription>
              Choisissez une paire pour comparer les deux clients et décider
              quoi garder.
            </DialogDescription>
          </DialogHeader>
          <ul className="flex flex-col gap-2">
            {pairs.map((pair) => (
              <li key={`${pair.a.id}-${pair.b.id}`}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:border-primary/50 hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  onClick={() => openPair(pair)}
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="font-medium">{describe(pair.a)}</span>
                    <span className="font-medium">{describe(pair.b)}</span>
                    {pair.sameName && (
                      <span className="text-xs text-muted-foreground">
                        Même nom
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
                    Comparer
                    <ChevronRight className="size-4" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
