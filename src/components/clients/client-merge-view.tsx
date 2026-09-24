'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  cn,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  Spinner,
} from '@forestar-be/ui';
import { useAuth } from '@/lib/auth';
import { getClient, isHttpError, mergeClients } from '@/lib/api';
import { notifyError, notifySuccess } from '@/lib/notifications';
import type { ClientDetail, ClientField } from '@/lib/types';

const FIELD_LABELS: Record<ClientField, string> = {
  firstName: 'Prénom',
  lastName: 'Nom',
  phone: 'Téléphone',
  email: 'Email',
  address: 'Adresse',
  postalCode: 'Code postal',
  city: 'Ville',
};

const FIELD_ORDER: ClientField[] = [
  'firstName',
  'lastName',
  'phone',
  'email',
  'address',
  'postalCode',
  'city',
];

/**
 * `/clients/fusionner?a=<id>&b=<id>` (R009-S04, AC-04) : les deux clients
 * côte à côte, champ par champ, différences marquées ; le client gardé
 * l'emporte, ses champs vides sont complétés par l'autre (R007, AC-07 de la
 * fusion serveur). Confirmation par `ConfirmDialog`, puis retour sur le
 * client gardé, avec tous les passages.
 */
export default function ClientMergeView() {
  const router = useRouter();
  const auth = useAuth();
  const searchParams = useSearchParams();
  const aId = Number(searchParams.get('a'));
  const bId = Number(searchParams.get('b'));
  // Dérivé des paramètres d'URL, jamais posé par un effet : un lien de fusion
  // sans les deux identifiants, ou vers le même client, ne se corrige pas de
  // lui-même une fois affiché.
  const paramsInvalid = !aId || !bId || aId === bId;

  const [a, setA] = useState<ClientDetail | null>(null);
  const [b, setB] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [keepId, setKeepId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    if (paramsInvalid) return;
    let cancelled = false;
    Promise.all([getClient(auth.token, aId), getClient(auth.token, bId)])
      .then(([clientA, clientB]) => {
        if (cancelled) return;
        setA(clientA);
        setB(clientB);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error('Error fetching clients to merge:', error);
        notifyError(
          isHttpError(error)
            ? error.message
            : "Une erreur s'est produite lors de la récupération des clients",
        );
        setInvalid(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [paramsInvalid, aId, bId, auth.token]);

  const handleMerge = async () => {
    if (!a || !b || !keepId) return;
    const loserId = keepId === a.id ? b.id : a.id;
    setMerging(true);
    try {
      const result = await mergeClients(auth.token, loserId, keepId);
      notifySuccess(
        `Clients fusionnés : ${result.movedRepairs} fiche${result.movedRepairs > 1 ? 's' : ''} et ${result.movedInvoices} facture${result.movedInvoices > 1 ? 's' : ''} reprises.`,
      );
      router.push(`/clients/${result.client.id}`);
    } catch (error) {
      console.error('Error merging clients:', error);
      notifyError(
        isHttpError(error)
          ? error.message
          : "Une erreur s'est produite lors de la fusion",
      );
      setMerging(false);
      setConfirmOpen(false);
    }
  };

  if (paramsInvalid) {
    return (
      <EmptyState
        title="Fusion impossible"
        description="Ce lien de fusion doit désigner deux clients différents."
      />
    );
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner size="lg" label="Chargement des clients…" />
      </div>
    );
  }

  if (invalid || !a || !b) {
    return (
      <EmptyState
        title="Fusion impossible"
        description="Ce lien de fusion n'est plus valide : un des deux clients n'existe plus, ou a déjà été fusionné."
      />
    );
  }

  const kept = keepId === a.id ? a : keepId === b.id ? b : null;
  const other = kept ? (kept.id === a.id ? b : a) : null;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/clients" />}
        nativeButton={false}
      >
        <ArrowLeft />
        Retour aux clients
      </Button>

      <PageHeader
        title="Fusionner deux clients"
        description="Choisissez le client à garder : ses valeurs l'emportent, ses champs vides sont complétés par l'autre."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[a, b].map((client) => {
          const otherClient = client.id === a.id ? b : a;
          return (
            <Card
              key={client.id}
              className={cn(
                'cursor-pointer border-2 transition-colors',
                keepId === client.id ? 'border-primary' : 'border-transparent',
              )}
              onClick={() => setKeepId(client.id)}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base font-semibold">
                  <span>
                    {client.firstName} {client.lastName}
                  </span>
                  {keepId === client.id && (
                    <span className="text-xs font-medium text-primary">
                      À garder
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                {FIELD_ORDER.map((field) => {
                  const value = client[field] || '—';
                  const differs =
                    (client[field] || '') !== (otherClient[field] || '');
                  return (
                    <div
                      key={field}
                      className={cn(
                        'flex justify-between gap-2',
                        differs && 'font-medium text-warning-foreground',
                      )}
                    >
                      <span className="text-muted-foreground">
                        {FIELD_LABELS[field]} :
                      </span>
                      <span>{value}</span>
                    </div>
                  );
                })}
                <div className="flex justify-between gap-2 border-t border-border pt-2 text-muted-foreground">
                  <span>Passages :</span>
                  <span>{client.machineRepairs.length}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button
        disabled={!keepId}
        onClick={() => setConfirmOpen(true)}
        className="self-start"
      >
        Fusionner
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        title="Fusionner ces deux clients"
        message={
          kept && other
            ? `${kept.firstName} ${kept.lastName} sera gardé ; ${other.firstName} ${other.lastName} disparaîtra. Ses fiches et factures seront reprises par ${kept.firstName} ${kept.lastName}.`
            : ''
        }
        type="warning"
        confirmText="Fusionner"
        cancelText="Annuler"
        isLoading={merging}
        onConfirm={() => void handleMerge()}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}
