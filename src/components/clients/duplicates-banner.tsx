'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@forestar-be/ui';
import { getClientDuplicates, isHttpError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { notifyError } from '@/lib/notifications';
import type { ClientDuplicatePair } from '@/lib/types';

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

  return (
    <>
      <Alert>
        <AlertTitle>
          {pairs.length} doublon{pairs.length > 1 ? 's' : ''} probable
          {pairs.length > 1 ? 's' : ''}
        </AlertTitle>
        <AlertDescription>
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            Voir les paires
          </Button>
        </AlertDescription>
      </Alert>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Doublons probables</DialogTitle>
          </DialogHeader>
          <ul className="flex flex-col divide-y divide-border">
            {pairs.map((pair) => (
              <li key={`${pair.a.id}-${pair.b.id}`}>
                <button
                  type="button"
                  className="w-full px-1 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => openPair(pair)}
                >
                  <p className="font-medium">
                    {pair.a.firstName} {pair.a.lastName} (
                    {pair.a.phone || 'sans téléphone'}) —{' '}
                    {pair.b.firstName} {pair.b.lastName} (
                    {pair.b.phone || 'sans téléphone'})
                  </p>
                  {pair.sameName && (
                    <p className="text-xs text-muted-foreground">Même nom</p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
