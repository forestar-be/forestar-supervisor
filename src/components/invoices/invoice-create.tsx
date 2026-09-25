'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  checkClient,
  createServiceInvoice,
  fetchRepairById,
  getClient,
  isHttpError,
  searchClients,
  searchRepairsForInvoice,
} from '@/lib/api';
import { notifyError, notifySuccess } from '@/lib/notifications';
import type {
  Client,
  ClientConflict,
  ClientSummary,
  RepairForInvoice,
} from '@/lib/types';
import InvoiceForm, { type InvoiceFormData } from './invoice-form';
import {
  Alert,
  AlertDescription,
  Button,
  PageHeader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@forestar-be/ui';
import { ArrowLeft, Loader2, Search } from 'lucide-react';

type InvoiceCreateTab = 'client' | 'import';

/** Coordonnées d'un client existant, choisi pour la facture (AC-10). */
type ClientCoordinates = Pick<
  Client,
  | 'id'
  | 'firstName'
  | 'lastName'
  | 'phone'
  | 'email'
  | 'address'
  | 'postalCode'
  | 'city'
>;

/**
 * Création d'une facture de réparation, portée depuis
 * `ServiceInvoiceCreate.tsx` : soit un client Forestar (existant, recherché,
 * ou nouveau — R009-S05, AC-10), soit un import depuis une réparation
 * existante (recherche puis pré-remplissage).
 *
 * Deux paramètres d'URL pré-remplissent la page (AC-08, AC-09) :
 * `?fiche=<id>` (bouton « Créer la facture » d'une fiche atelier, sans
 * facture) sélectionne directement cette réparation dans l'onglet Import ;
 * `?client=<id>` (bouton « Nouvelle facture » d'une fiche client) sélectionne
 * ce client dans l'onglet Client, sans fiche.
 */
export default function InvoiceCreate() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const [saving, setSaving] = useState(false);

  const ficheParam = searchParams.get('fiche');
  const clientParam = searchParams.get('client');
  const [tab, setTab] = useState<InvoiceCreateTab>(
    ficheParam ? 'import' : 'client',
  );

  // ── Onglet Import depuis réparation ──
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RepairForInvoice[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState<RepairForInvoice | null>(
    null,
  );
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  // ── Onglet Client (AC-10) ──
  const [clientQuery, setClientQuery] = useState('');
  const [clientResults, setClientResults] = useState<ClientSummary[]>([]);
  const [searchingClient, setSearchingClient] = useState(false);
  const [selectedClient, setSelectedClient] =
    useState<ClientCoordinates | null>(null);
  const [similarPending, setSimilarPending] = useState<{
    data: InvoiceFormData;
    similar: ClientSummary[];
  } | null>(null);
  // Le conflit et la suggestion s'affichent au-dessus du formulaire, loin du
  // bouton « Créer la facture » : on les amène dans le champ de vision.
  const clientNoticeRef = useRef<HTMLDivElement>(null);
  const [clientConflict, setClientConflict] = useState<ClientConflict | null>(
    null,
  );
  const clientSearchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  /**
   * AC-08 — une fiche qui a déjà sa facture (une par fiche) renvoie sur elle,
   * au lieu d'un message d'erreur : c'est le cas d'une page ouverte avant que la
   * facture existe.
   */
  const goToExistingInvoice = async (repairId: string | number) => {
    try {
      const repair = await fetchRepairById(String(repairId), token);
      if (repair?.serviceInvoice) {
        notifyError(
          `Cette fiche a déjà une facture : ${repair.serviceInvoice.invoiceNumber}.`,
        );
        router.replace(`/factures/${repair.serviceInvoice.id}`);
        return true;
      }
    } catch (error) {
      console.error('Error fetching repair for invoice:', error);
    }
    notifyError('Cette fiche est introuvable.');
    return false;
  };

  // Pré-remplissage depuis `?fiche=` ou `?client=`, une seule fois au montage
  // (le token n'est connu qu'après l'hydratation de l'authentification).
  useEffect(() => {
    if (!token) return;
    if (ficheParam) {
      searchRepairsForInvoice(token, ficheParam)
        .then((results) => {
          const repair = results.find((r) => String(r.id) === ficheParam);
          if (repair) {
            setSelectedRepair(repair);
            setTab('import');
          } else {
            void goToExistingInvoice(ficheParam);
          }
        })
        .catch((error: unknown) => {
          console.error('Error fetching repair for invoice:', error);
        });
    } else if (clientParam) {
      getClient(token, Number(clientParam))
        .then((client) => {
          setSelectedClient(client);
          setTab('client');
        })
        .catch((error: unknown) => {
          console.error('Error fetching client for invoice:', error);
          notifyError(
            isHttpError(error)
              ? error.message
              : "Une erreur s'est produite lors de la récupération du client",
          );
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSearch = useCallback(
    (q: string) => {
      setSearchQuery(q);
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      if (!q.trim() || !token) {
        setSearchResults([]);
        return;
      }
      searchTimeout.current = setTimeout(async () => {
        setSearching(true);
        try {
          const results = await searchRepairsForInvoice(token, q.trim());
          setSearchResults(results);
        } catch {
          setSearchResults([]);
        } finally {
          setSearching(false);
        }
      }, 400);
    },
    [token],
  );

  const handleSelectRepair = (repair: RepairForInvoice) => {
    setSelectedRepair(repair);
    setSearchResults([]);
    setSearchQuery('');
  };

  useEffect(() => {
    if (clientConflict || similarPending) {
      clientNoticeRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [clientConflict, similarPending]);

  const handleClientSearch = useCallback(
    (q: string) => {
      setClientQuery(q);
      if (clientSearchTimeout.current)
        clearTimeout(clientSearchTimeout.current);
      if (!q.trim() || !token) {
        setClientResults([]);
        return;
      }
      clientSearchTimeout.current = setTimeout(async () => {
        setSearchingClient(true);
        try {
          const results = await searchClients(token, q.trim());
          setClientResults(results);
        } catch {
          setClientResults([]);
        } finally {
          setSearchingClient(false);
        }
      }, 300);
    },
    [token],
  );

  const handleSelectClient = (client: ClientCoordinates) => {
    setSelectedClient(client);
    setClientResults([]);
    setClientQuery('');
    setClientConflict(null);
  };

  const getImportInitialData = (): Partial<InvoiceFormData> | undefined => {
    if (!selectedRepair) return undefined;
    return {
      clientFirstName: selectedRepair.client.firstName,
      clientLastName: selectedRepair.client.lastName,
      clientPhone: selectedRepair.client.phone,
      clientEmail: selectedRepair.client.email,
      clientAddress: selectedRepair.client.address || '',
      clientCity: selectedRepair.client.city || '',
      clientPostalCode: selectedRepair.client.postalCode || '',
      machineRepairId: selectedRepair.id,
    };
  };

  const getClientInitialData = (): Partial<InvoiceFormData> | undefined => {
    if (!selectedClient) return undefined;
    return {
      clientFirstName: selectedClient.firstName,
      clientLastName: selectedClient.lastName,
      clientPhone: selectedClient.phone,
      clientEmail: selectedClient.email,
      clientAddress: selectedClient.address || '',
      clientCity: selectedClient.city || '',
      clientPostalCode: selectedClient.postalCode || '',
      clientId: selectedClient.id,
    };
  };

  const createInvoice = async (data: InvoiceFormData) => {
    setSaving(true);
    setClientConflict(null);
    setSimilarPending(null);
    try {
      const result = await createServiceInvoice(token, {
        ...data,
        type: 'REPAIR',
      });
      notifySuccess('Facture créée');
      router.push(`/factures/${result.id}`);
    } catch (err) {
      console.error('Error creating invoice:', err);
      if (isHttpError(err) && err.status === 409 && data.machineRepairId) {
        const redirected = await goToExistingInvoice(data.machineRepairId);
        if (redirected) return;
      }
      const errData = isHttpError(err)
        ? (err.data as Partial<ClientConflict & { code: string }> | undefined)
        : undefined;
      if (
        errData?.code === 'client_conflict' &&
        errData.field &&
        errData.client
      ) {
        setClientConflict({ field: errData.field, client: errData.client });
      }
      notifyError(
        isHttpError(err) ? err.message : 'Erreur lors de la création',
      );
    } finally {
      setSaving(false);
    }
  };

  /**
   * AC-10 — même contrôle que la tablette (R008) pour un nouveau client : un
   * conflit bloque (le serveur le refait, 409), un nom proche est seulement
   * suggéré. Une facture liée à une fiche ou à un client choisi n'en a pas
   * besoin.
   */
  const handleSubmit = async (data: InvoiceFormData) => {
    if (data.clientId || data.machineRepairId) return createInvoice(data);
    setSaving(true);
    let check: Awaited<ReturnType<typeof checkClient>> | null = null;
    try {
      check = await checkClient(token, {
        firstName: data.clientFirstName,
        lastName: data.clientLastName,
        phone: data.clientPhone,
        email: data.clientEmail,
      });
    } catch {
      // Contrôle indisponible : le serveur refera celui d'unicité.
    } finally {
      setSaving(false);
    }
    if (check?.conflicts.length) {
      setClientConflict(check.conflicts[0]);
      return;
    }
    if (check?.similar.length) {
      setSimilarPending({ data, similar: check.similar });
      return;
    }
    return createInvoice(data);
  };

  /** « Utiliser ce client » sur une suggestion : la facture part avec lui. */
  const pickSimilarClient = (client: ClientSummary) => {
    if (!similarPending) return;
    return createInvoice({
      ...similarPending.data,
      clientId: client.id,
      clientFirstName: client.firstName,
      clientLastName: client.lastName,
      clientPhone: client.phone,
      clientEmail: client.email,
      clientAddress: client.address || '',
      clientCity: client.city || '',
      clientPostalCode: client.postalCode || '',
    });
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/factures" />}
        nativeButton={false}
      >
        <ArrowLeft />
        Retour aux factures
      </Button>

      <PageHeader title="Nouvelle facture de réparation" />

      <Tabs
        value={tab}
        onValueChange={(v) => {
          if (!v) return;
          setTab(v as InvoiceCreateTab);
          setSelectedRepair(null);
        }}
      >
        <TabsList>
          <TabsTrigger value="client">Client</TabsTrigger>
          <TabsTrigger value="import">Import depuis réparation</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-3">
          {!selectedRepair && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                Rechercher une réparation
              </p>
              <div className="relative">
                {searching ? (
                  <Loader2 className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                ) : (
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                )}
                <input
                  className="h-9 w-full rounded-xl border border-input bg-transparent pl-8 pr-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                  placeholder="Nom, téléphone, email..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
              {searchResults.length > 0 && (
                <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
                  {searchResults.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                        onClick={() => handleSelectRepair(r)}
                      >
                        <p className="font-medium">
                          #{r.id} — {r.client.firstName} {r.client.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {[
                            r.client.phone,
                            r.repair_or_maintenance,
                            r.brand_name,
                            r.robot_type_name,
                          ]
                            .filter(Boolean)
                            .join(' • ')}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {searchQuery.trim() &&
                !searching &&
                searchResults.length === 0 && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Aucune réparation trouvée
                  </p>
                )}
            </div>
          )}

          {selectedRepair && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-900 dark:bg-blue-950/40">
              <p className="text-blue-800 dark:text-blue-300">
                Import depuis la réparation #{selectedRepair.id} —{' '}
                {selectedRepair.client.firstName}{' '}
                {selectedRepair.client.lastName}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedRepair(null)}
              >
                Changer
              </Button>
            </div>
          )}

          {selectedRepair && (
            <InvoiceForm
              key={selectedRepair.id}
              initialData={getImportInitialData()}
              onSubmit={handleSubmit}
              submitLabel="Créer la facture"
              saving={saving}
            />
          )}
        </TabsContent>

        <TabsContent value="client" className="space-y-3">
          {!selectedClient && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                Rechercher un client existant
              </p>
              <div className="relative">
                {searchingClient ? (
                  <Loader2 className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                ) : (
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                )}
                <input
                  className="h-9 w-full rounded-xl border border-input bg-transparent pl-8 pr-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                  placeholder="Nom, téléphone, email..."
                  value={clientQuery}
                  onChange={(e) => handleClientSearch(e.target.value)}
                />
              </div>
              {clientResults.length > 0 && (
                <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
                  {clientResults.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                        onClick={() => handleSelectClient(c)}
                      >
                        <p className="font-medium">
                          {c.firstName} {c.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {c.phone || 'sans téléphone'}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {clientQuery.trim() &&
                !searchingClient &&
                clientResults.length === 0 && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Aucun client trouvé — renseignez un nouveau client
                    ci-dessous.
                  </p>
                )}
            </div>
          )}

          {selectedClient && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-900 dark:bg-blue-950/40">
              <p className="text-blue-800 dark:text-blue-300">
                Client existant : {selectedClient.firstName}{' '}
                {selectedClient.lastName}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedClient(null)}
              >
                Changer
              </Button>
            </div>
          )}

          <div ref={clientNoticeRef} />
          {clientConflict && (
            <Alert variant="destructive">
              <AlertDescription className="flex flex-wrap items-center gap-2">
                <span>
                  Un client a déjà{' '}
                  {clientConflict.field === 'phone'
                    ? 'ce téléphone'
                    : 'cet email'}{' '}
                  :{' '}
                  {`${clientConflict.client.firstName} ${clientConflict.client.lastName}`.trim() ||
                    `n° ${clientConflict.client.id}`}
                  .
                </span>
                <Link
                  href={`/clients/${clientConflict.client.id}`}
                  className="underline"
                >
                  Voir ce client
                </Link>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!clientConflict) return;
                    setSelectedClient(clientConflict.client);
                    setClientConflict(null);
                  }}
                >
                  Utiliser ce client
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {similarPending && (
            <Alert>
              <AlertDescription className="flex flex-col gap-2">
                <span className="font-medium">
                  Ce client existe peut-être déjà :
                </span>
                <ul className="flex flex-col gap-1">
                  {similarPending.similar.map((client) => (
                    <li
                      key={client.id}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <Link
                        href={`/clients/${client.id}`}
                        className="underline"
                      >
                        {`${client.firstName} ${client.lastName}`.trim()}
                      </Link>
                      <span className="text-muted-foreground">
                        {[client.phone, client.city]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={saving}
                        onClick={() => pickSimilarClient(client)}
                      >
                        Utiliser ce client
                      </Button>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={saving}
                    onClick={() => createInvoice(similarPending.data)}
                  >
                    Créer un nouveau client
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setSimilarPending(null)}
                  >
                    Annuler
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <InvoiceForm
            key={selectedClient ? `client-${selectedClient.id}` : 'new'}
            initialData={getClientInitialData()}
            onSubmit={handleSubmit}
            submitLabel="Créer la facture"
            saving={saving}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
