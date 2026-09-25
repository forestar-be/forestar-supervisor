'use client';

import { useEffect, useMemo, useState } from 'react';
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
  Input,
  PageHeader,
  RadioGroup,
  RadioGroupItem,
  Spinner,
} from '@forestar-be/ui';
import { useAuth } from '@/lib/auth';
import { getClient, isHttpError, mergeClients } from '@/lib/api';
import {
  preselectAllFields,
  resolveFieldValue,
  type ClientMergeChoice,
  type ClientMergeSide,
} from '@/lib/client-merge';
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

/** Coordonnées d'un client, réduites aux 7 champs de la fusion. */
function pickFields(client: ClientDetail): Record<ClientField, string> {
  return Object.fromEntries(
    FIELD_ORDER.map((field) => [field, client[field] || '']),
  ) as Record<ClientField, string>;
}

interface FieldState {
  choice: ClientMergeChoice;
  /** Toujours à jour, même hors saisie libre : préremplit l'entrée dès qu'on
   * bascule dessus (D-29 : « un champ texte prérempli, modifiable »). */
  custom: string;
}

/** Un conflit `409 client_conflict` renvoyé par la fusion (D-29). */
interface MergeConflict {
  field: 'phone' | 'email';
  message: string;
}

/**
 * `/clients/fusionner?a=<id>&b=<id>` (R009-S04, AC-04 ; D-29) : les deux
 * clients côte à côte pour choisir lequel est gardé (son id survit, avec ses
 * liens), puis, champ par champ, la valeur de gauche, de droite, ou une
 * saisie libre — préremplie, modifiable. Les champs identiques n'imposent
 * aucun choix. Un aperçu du résultat précède la confirmation, irréversible.
 * Un conflit avec un troisième client (`409 client_conflict`) s'affiche sous
 * le champ en cause, sans perdre les choix déjà faits.
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
  const [fieldState, setFieldState] = useState<Record<
    ClientField,
    FieldState
  > | null>(null);
  const [conflict, setConflict] = useState<MergeConflict | null>(null);
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

  // Choix du client gardé : son id survit. La présélection (D-29) se calcule
  // une seule fois, à ce moment précis — la valeur de ce client si elle est
  // utilisable, sinon celle de l'autre — pour ne pas écraser des choix déjà
  // faits si l'on change ensuite d'avis sur le client gardé.
  function handleKeepClient(clientId: number) {
    setKeepId(clientId);
    if (fieldState || !a || !b) return;
    const keptSide: ClientMergeSide = clientId === a.id ? 'a' : 'b';
    const aValues = pickFields(a);
    const bValues = pickFields(b);
    const choices = preselectAllFields(aValues, bValues, FIELD_ORDER, keptSide);
    const next = {} as Record<ClientField, FieldState>;
    for (const field of FIELD_ORDER) {
      const choice = choices[field];
      next[field] = {
        choice,
        custom: choice === 'a' ? aValues[field] : bValues[field],
      };
    }
    setFieldState(next);
  }

  const mergedValues = useMemo(() => {
    if (!a || !b || !fieldState) return null;
    const aValues = pickFields(a);
    const bValues = pickFields(b);
    const result = {} as Record<ClientField, string>;
    for (const field of FIELD_ORDER) {
      const state = fieldState[field];
      result[field] = resolveFieldValue(
        state.choice,
        aValues[field],
        bValues[field],
        state.custom,
      );
    }
    return result;
  }, [a, b, fieldState]);

  function handleChoiceChange(
    field: ClientField,
    choice: ClientMergeChoice,
    aValue: string,
    bValue: string,
  ) {
    setConflict(null);
    setFieldState((prev) => {
      if (!prev) return prev;
      const current = prev[field];
      // En passant en saisie libre, on part de la valeur affichée jusque-là :
      // un champ texte prérempli, pas vide.
      const custom =
        choice === 'custom'
          ? resolveFieldValue(current.choice, aValue, bValue, current.custom)
          : current.custom;
      return { ...prev, [field]: { choice, custom } };
    });
  }

  function handleCustomChange(field: ClientField, value: string) {
    setConflict(null);
    setFieldState((prev) =>
      prev ? { ...prev, [field]: { choice: 'custom', custom: value } } : prev,
    );
  }

  const handleMerge = async () => {
    if (!a || !b || !keepId || !mergedValues) return;
    const loserId = keepId === a.id ? b.id : a.id;
    setMerging(true);
    setConflict(null);
    try {
      const result = await mergeClients(
        auth.token,
        loserId,
        keepId,
        mergedValues,
      );
      notifySuccess(
        `Clients fusionnés : ${result.movedRepairs} fiche${result.movedRepairs > 1 ? 's' : ''} et ${result.movedInvoices} facture${result.movedInvoices > 1 ? 's' : ''} reprises.`,
      );
      router.push(`/clients/${result.client.id}`);
    } catch (error) {
      console.error('Error merging clients:', error);
      const data = isHttpError(error)
        ? (error.data as
            | { code?: string; field?: 'phone' | 'email' }
            | undefined)
        : undefined;
      if (isHttpError(error) && error.status === 409 && data?.field) {
        setConflict({ field: data.field, message: error.message });
        setConfirmOpen(false);
        setMerging(false);
        return;
      }
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
  const aValues = pickFields(a);
  const bValues = pickFields(b);

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
        description="Choisissez d'abord le client à garder : son identifiant survit, avec ses fiches et factures."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[a, b].map((client) => (
          <Card
            key={client.id}
            className={cn(
              'cursor-pointer border-2 transition-colors',
              keepId === client.id ? 'border-primary' : 'border-transparent',
            )}
            onClick={() => handleKeepClient(client.id)}
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
            <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
              <span>{client.phone || '—'}</span>
              <span>{client.email || '—'}</span>
              <div className="flex justify-between gap-2 border-t border-border pt-2">
                <span>Passages :</span>
                <span>{client.machineRepairs.length}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {keepId && fieldState && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Coordonnées à garder
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {FIELD_ORDER.map((field) => (
              <FieldRow
                key={field}
                field={field}
                label={FIELD_LABELS[field]}
                aValue={aValues[field]}
                bValue={bValues[field]}
                state={fieldState[field]}
                conflictMessage={
                  conflict?.field === field ? conflict.message : undefined
                }
                onChoiceChange={(choice) =>
                  handleChoiceChange(field, choice, aValues[field], bValues[field])
                }
                onCustomChange={(value) => handleCustomChange(field, value)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {keepId && mergedValues && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Aperçu du client final
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5 text-sm">
            {FIELD_ORDER.map((field) => (
              <div key={field} className="flex justify-between gap-2">
                <span className="text-muted-foreground">
                  {FIELD_LABELS[field]} :
                </span>
                <span className="font-medium">
                  {mergedValues[field] || '—'}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Button
        disabled={!keepId || !mergedValues}
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
            ? `${kept.firstName} ${kept.lastName} sera gardé, avec les coordonnées choisies ci-dessus ; ${other.firstName} ${other.lastName} disparaîtra. Ses fiches et factures seront reprises par ${kept.firstName} ${kept.lastName}. Cette fusion est irréversible.`
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

/**
 * Une ligne de coordonnée (D-29) : affichage simple si les deux clients
 * portent la même valeur (avec une saisie libre disponible sur demande),
 * sinon un choix entre la valeur de gauche, de droite, ou une saisie libre.
 */
function FieldRow({
  field,
  label,
  aValue,
  bValue,
  state,
  conflictMessage,
  onChoiceChange,
  onCustomChange,
}: {
  field: ClientField;
  label: string;
  aValue: string;
  bValue: string;
  state: FieldState;
  conflictMessage?: string;
  onChoiceChange: (choice: ClientMergeChoice) => void;
  onCustomChange: (value: string) => void;
}) {
  const identical = aValue === bValue;
  const editingIdentical = identical && state.choice === 'custom';

  if (identical && !editingIdentical) {
    return (
      <div className="flex items-center justify-between gap-2 py-1.5 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium">{aValue || '—'}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto px-1.5 py-0.5 text-xs"
            onClick={() => onChoiceChange('custom')}
            aria-label={`Modifier ${label}`}
          >
            Modifier
          </Button>
        </div>
        {conflictMessage && (
          <p className="text-sm text-destructive">{conflictMessage}</p>
        )}
      </div>
    );
  }

  if (editingIdentical) {
    return (
      <div className="flex flex-col gap-1.5 py-1.5">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">{label}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto px-1.5 py-0.5 text-xs"
            onClick={() => onChoiceChange('a')}
            aria-label={`Annuler la modification de ${label}`}
          >
            Annuler
          </Button>
        </div>
        <Input
          value={state.custom}
          onChange={(event) => onCustomChange(event.target.value)}
          className="h-8"
          aria-label={`${label} — saisie libre`}
        />
        {conflictMessage && (
          <p className="text-sm text-destructive">{conflictMessage}</p>
        )}
      </div>
    );
  }

  const customValue =
    state.choice === 'custom'
      ? state.custom
      : resolveFieldValue(state.choice, aValue, bValue, state.custom);
  const idA = `merge-${field}-a`;
  const idB = `merge-${field}-b`;
  const idCustom = `merge-${field}-custom`;

  return (
    <div className="flex flex-col gap-2 rounded-md bg-warning/15 p-2.5">
      <span className="text-sm font-medium">{label}</span>
      <RadioGroup
        value={state.choice}
        onValueChange={(value) => onChoiceChange(value as ClientMergeChoice)}
        className="flex flex-col gap-1.5"
      >
        <div className="flex items-center gap-2 text-sm">
          <RadioGroupItem value="a" id={idA} />
          <label htmlFor={idA} className="min-w-0 flex-1 truncate">
            {aValue || '(vide)'}
          </label>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <RadioGroupItem value="b" id={idB} />
          <label htmlFor={idB} className="min-w-0 flex-1 truncate">
            {bValue || '(vide)'}
          </label>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <RadioGroupItem value="custom" id={idCustom} />
          <label htmlFor={idCustom} className="shrink-0">
            Autre :
          </label>
          <Input
            value={customValue}
            readOnly={state.choice !== 'custom'}
            onFocus={() => {
              if (state.choice !== 'custom') onChoiceChange('custom');
            }}
            onChange={(event) => onCustomChange(event.target.value)}
            className="h-8 min-w-0 flex-1"
            aria-label={`${label} — saisie libre`}
          />
        </div>
      </RadioGroup>
      {conflictMessage && (
        <p className="text-sm text-destructive">{conflictMessage}</p>
      )}
    </div>
  );
}
