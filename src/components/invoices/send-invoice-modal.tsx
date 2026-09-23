'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { sendServiceInvoice, isHttpError, HttpError } from '@/lib/api';
import type {
  DolibarrThirdparty,
  DolibarrThirdpartyMatch,
  ThirdpartyConfirmation,
  ThirdpartyDifference,
} from '@/lib/types';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@forestar-be/ui';
import { Loader2, Send, UserPlus } from 'lucide-react';

interface InvoiceClient {
  name: string;
  email: string;
  phone: string;
  address: string;
  zip: string;
  town: string;
}

interface SendInvoiceModalProps {
  invoiceId: number;
  clientEmail: string;
  onClose: () => void;
  onSent: () => void;
}

type ThirdpartyAction = 'create' | 'update' | 'use-existing' | 'select';

type ModalStep =
  | { type: 'initial' }
  | { type: 'create-client'; invoiceClient: InvoiceClient }
  | {
      type: 'select-client';
      invoiceClient: InvoiceClient;
      matches: DolibarrThirdpartyMatch[];
    }
  | {
      type: 'resolve-conflict';
      invoiceClient: InvoiceClient;
      dolibarrClient: DolibarrThirdparty;
      differences: ThirdpartyDifference[];
    };

/**
 * Modale « Valider et envoyer » d'une facture de service.
 *
 * Porte les étapes Dolibarr de l'ancien `SendInvoiceModal.tsx` (le backend
 * répond 409 avec `ThirdpartyConfirmation` quand le client de la facture ne
 * correspond pas sans ambiguïté à un tiers Dolibarr). Contrat dans
 * `ThirdpartyConfirmation` (`matches`, `differences` en tableau), calqué sur
 * `handleSendInvoice` de forestar-server.
 */
export default function SendInvoiceModal({
  invoiceId,
  clientEmail,
  onClose,
  onSent,
}: SendInvoiceModalProps) {
  const { token } = useAuth();
  const [step, setStep] = useState<ModalStep>({ type: 'initial' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<number | 'new' | null>(
    null,
  );
  const [conflictChoice, setConflictChoice] = useState<
    'update' | 'use-existing' | 'create' | null
  >(null);

  const doSend = async (action?: ThirdpartyAction, thirdpartyId?: number) => {
    setLoading(true);
    setError(null);
    try {
      const body = action
        ? { thirdpartyAction: action, thirdpartyId }
        : undefined;
      await sendServiceInvoice(token, invoiceId, body);
      onSent();
    } catch (err) {
      if (err instanceof HttpError && err.status === 409) {
        const data = err.data as ThirdpartyConfirmation | undefined;
        if (data?.confirmationType === 'create-client') {
          setStep({ type: 'create-client', invoiceClient: data.invoiceClient });
        } else if (
          data?.confirmationType === 'resolve-conflict' &&
          data.dolibarrClient &&
          data.differences
        ) {
          setConflictChoice(null);
          setStep({
            type: 'resolve-conflict',
            invoiceClient: data.invoiceClient,
            dolibarrClient: data.dolibarrClient,
            differences: data.differences,
          });
        } else if (data?.confirmationType === 'select-client' && data.matches) {
          setSelectedMatchId(null);
          setStep({
            type: 'select-client',
            invoiceClient: data.invoiceClient,
            matches: data.matches,
          });
        } else {
          setError('Réponse inattendue du serveur');
        }
      } else if (isHttpError(err)) {
        setError(err.message);
      } else {
        setError("Une erreur s'est produite");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInitialSend = () => doSend();
  const handleCreate = () => doSend('create');

  const handleSelectConfirm = () => {
    if (selectedMatchId === 'new') {
      handleCreate();
    } else if (typeof selectedMatchId === 'number') {
      doSend('select', selectedMatchId);
    }
  };

  const handleConflictConfirm = (dolibarrId: number) => {
    if (conflictChoice === 'update') doSend('update', dolibarrId);
    else if (conflictChoice === 'use-existing')
      doSend('use-existing', dolibarrId);
    else if (conflictChoice === 'create') handleCreate();
  };

  const renderClientCard = (client: InvoiceClient, label: string) => (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <dl className="space-y-1 text-sm">
        {client.name && (
          <div className="flex justify-between gap-2">
            <dt className="shrink-0 text-muted-foreground">Nom</dt>
            <dd className="text-right font-medium">{client.name}</dd>
          </div>
        )}
        {client.email && (
          <div className="flex justify-between gap-2">
            <dt className="shrink-0 text-muted-foreground">Email</dt>
            <dd className="text-right font-medium">{client.email}</dd>
          </div>
        )}
        {client.phone && (
          <div className="flex justify-between gap-2">
            <dt className="shrink-0 text-muted-foreground">Tél.</dt>
            <dd className="text-right font-medium">{client.phone}</dd>
          </div>
        )}
        {client.address && (
          <div className="flex justify-between gap-2">
            <dt className="shrink-0 text-muted-foreground">Adresse</dt>
            <dd className="text-right font-medium">{client.address}</dd>
          </div>
        )}
        {(client.zip || client.town) && (
          <div className="flex justify-between gap-2">
            <dt className="shrink-0 text-muted-foreground">Ville</dt>
            <dd className="text-right font-medium">
              {[client.zip, client.town].filter(Boolean).join(' ')}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );

  const renderDiffTable = (
    differences: { field: string; invoice: string; dolibarr: string }[],
  ) => (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
            <th className="px-3 py-2 text-left">Champ</th>
            <th className="px-3 py-2 text-left">Facture</th>
            <th className="px-3 py-2 text-left">Dolibarr</th>
          </tr>
        </thead>
        <tbody>
          {differences.map((d) => (
            <tr key={d.field} className="border-t border-border">
              <td className="px-3 py-1.5 font-medium">{d.field}</td>
              <td className="px-3 py-1.5 text-primary">
                {d.invoice || (
                  <span className="italic text-muted-foreground">vide</span>
                )}
              </td>
              <td className="px-3 py-1.5 text-blue-700 dark:text-blue-400">
                {d.dolibarr || (
                  <span className="italic text-muted-foreground">vide</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const getTitle = () => {
    switch (step.type) {
      case 'initial':
        return 'Valider et envoyer la facture';
      case 'create-client':
        return 'Nouveau client Dolibarr';
      case 'select-client':
        return 'Sélectionner un client';
      case 'resolve-conflict':
        return 'Conflit de données client';
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && !loading && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>
            {step.type === 'initial' && 'Cette action est irréversible.'}
            {step.type === 'create-client' &&
              "Aucun client correspondant n'a été trouvé dans Dolibarr."}
            {step.type === 'select-client' &&
              'Plusieurs clients correspondent dans Dolibarr.'}
            {step.type === 'resolve-conflict' &&
              'Les informations client diffèrent entre la facture et Dolibarr.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {step.type === 'initial' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Action irréversible
              </p>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                Un numéro de facture définitif sera attribué et la facture sera
                envoyée par email à{' '}
                <span className="font-medium">{clientEmail}</span>. Le brouillon
                ne pourra plus être modifié.
              </p>
            </div>
          )}

          {step.type === 'create-client' && (
            <>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/40">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                    Nouveau client
                  </p>
                </div>
                <p className="mt-1 text-sm text-blue-700 dark:text-blue-400">
                  Un nouveau client va être créé dans Dolibarr :
                </p>
              </div>
              {renderClientCard(step.invoiceClient, 'Client à créer')}
            </>
          )}

          {step.type === 'select-client' && (
            <>
              {renderClientCard(step.invoiceClient, 'Client de la facture')}
              <fieldset className="space-y-2">
                <legend className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Clients Dolibarr
                </legend>
                {step.matches.map((match) => (
                  <label
                    key={match.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all ${
                      selectedMatchId === match.id
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:border-border/80'
                    }`}
                  >
                    <input
                      type="radio"
                      name="selectClient"
                      checked={selectedMatchId === match.id}
                      onChange={() => setSelectedMatchId(match.id)}
                      className="mt-0.5 h-4 w-4 accent-primary"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{match.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {match.email}
                      </p>
                      {match.differences.length > 0 && (
                        <p className="mt-1 text-xs text-warning">
                          {match.differences.length} différence
                          {match.differences.length > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all ${
                    selectedMatchId === 'new'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-border/80'
                  }`}
                >
                  <input
                    type="radio"
                    name="selectClient"
                    checked={selectedMatchId === 'new'}
                    onChange={() => setSelectedMatchId('new')}
                    className="mt-0.5 h-4 w-4 accent-primary"
                  />
                  <div>
                    <p className="text-sm font-medium">
                      Créer un nouveau client
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Un nouveau client séparé sera créé dans Dolibarr
                    </p>
                  </div>
                </label>
              </fieldset>
            </>
          )}

          {step.type === 'resolve-conflict' && (
            <>
              {renderDiffTable(step.differences)}
              <fieldset className="space-y-2">
                <legend className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Que souhaitez-vous faire ?
                </legend>
                {(
                  [
                    {
                      value: 'update' as const,
                      label: 'Mettre à jour Dolibarr',
                      desc: 'Le client Dolibarr sera mis à jour avec les données de la facture',
                    },
                    {
                      value: 'use-existing' as const,
                      label: 'Utiliser le client Dolibarr',
                      desc: 'La facture sera mise à jour avec les coordonnées de Dolibarr',
                    },
                    {
                      value: 'create' as const,
                      label: 'Créer un nouveau client',
                      desc: 'Un nouveau client séparé sera créé dans Dolibarr',
                    },
                  ] as const
                ).map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all ${
                      conflictChoice === opt.value
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:border-border/80'
                    }`}
                  >
                    <input
                      type="radio"
                      name="conflictChoice"
                      checked={conflictChoice === opt.value}
                      onChange={() => setConflictChoice(opt.value)}
                      className="mt-0.5 h-4 w-4 accent-primary"
                    />
                    <div>
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {opt.desc}
                      </p>
                    </div>
                  </label>
                ))}
              </fieldset>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          {step.type === 'initial' && (
            <Button onClick={handleInitialSend} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : <Send />}
              Confirmer l&apos;envoi
            </Button>
          )}
          {step.type === 'create-client' && (
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : <UserPlus />}
              Créer le client et envoyer
            </Button>
          )}
          {step.type === 'select-client' && (
            <Button
              onClick={handleSelectConfirm}
              disabled={loading || selectedMatchId === null}
            >
              {loading ? <Loader2 className="animate-spin" /> : <Send />}
              Valider et envoyer
            </Button>
          )}
          {step.type === 'resolve-conflict' && (
            <Button
              onClick={() => handleConflictConfirm(step.dolibarrClient.id)}
              disabled={loading || conflictChoice === null}
            >
              {loading ? <Loader2 className="animate-spin" /> : <Send />}
              Valider et envoyer
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
