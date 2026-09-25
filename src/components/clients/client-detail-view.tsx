'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, Save, SearchX } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
  Spinner,
  StatusBadge,
} from '@forestar-be/ui';
import dayjs from '@/lib/dayjs';
import { useAuth } from '@/lib/auth';
import { getClient, isHttpError, updateClient } from '@/lib/api';
import { notifyError, notifySuccess } from '@/lib/notifications';
import { formatCurrency, getInvoiceStatusLabel, getInvoiceStatusTone } from '@/lib/invoice';
import {
  clientDraftFrom,
  diffClientDraft,
  type ClientDraft,
} from '@/lib/client-fields';
import type { ClientConflict, ClientDetail } from '@/lib/types';
import { RepairField } from '@/components/repair/repair-field';

const REPAIR_STATE_TONE: Record<string, 'success' | 'warning' | 'info' | 'neutral'> = {
  Terminé: 'success',
};

/**
 * `/clients/[id]` (R009-S03, AC-02) : coordonnées modifiables du client et la
 * liste de ses passages. Même traitement du conflit que la carte client d'une
 * fiche (R009-S02, AC-05) : un 409 `client_conflict` sous le champ en cause,
 * avec un lien vers le client existant et « Fusionner avec ce client »
 * (construite par R009-S04).
 */
export default function ClientDetailView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const auth = useAuth();

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [editable, setEditable] = useState(false);
  const [draft, setDraft] = useState<ClientDraft | null>(null);
  const [conflict, setConflict] = useState<ClientConflict | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getClient(auth.token, Number(id))
      .then((data) => {
        if (cancelled) return;
        setClient(data);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error('Error fetching client:', error);
        if (isHttpError(error) && error.status === 404) {
          setNotFound(true);
        } else {
          notifyError(
            "Une erreur s'est produite lors de la récupération du client",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, auth.token]);

  const startEdit = () => {
    if (!client) return;
    setDraft(clientDraftFrom(client));
    setConflict(null);
    setEditable(true);
  };

  const handleDraftChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setDraft((prev) => (prev ? { ...prev, [name]: value } : prev));
    if (conflict && name === conflict.field) setConflict(null);
  };

  const handleSave = async () => {
    if (!client || !draft) return;
    const changed = diffClientDraft(draft, clientDraftFrom(client));
    if (Object.keys(changed).length === 0) {
      setEditable(false);
      setDraft(null);
      return;
    }
    setSaving(true);
    setConflict(null);
    try {
      const updated = await updateClient(auth.token, client.id, changed);
      setClient((prev) => (prev ? { ...prev, ...updated } : prev));
      notifySuccess('Client mis à jour avec succès');
      setEditable(false);
      setDraft(null);
    } catch (error) {
      console.error('Error updating client:', error);
      const data = isHttpError(error)
        ? (error.data as Partial<ClientConflict & { code: string }> | undefined)
        : undefined;
      if (data?.code === 'client_conflict' && data.field && data.client) {
        setConflict({ field: data.field, client: data.client });
      } else {
        notifyError(
          isHttpError(error)
            ? error.message
            : "Une erreur s'est produite lors de la mise à jour du client",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const renderConflict = (field: 'phone' | 'email') => {
    if (!conflict || conflict.field !== field || !client) return undefined;
    const name =
      `${conflict.client.firstName} ${conflict.client.lastName}`.trim() ||
      `n° ${conflict.client.id}`;
    return (
      <span className="flex flex-wrap items-center gap-x-2">
        <span>
          Un client a déjà {field === 'phone' ? 'ce téléphone' : 'cet email'} :{' '}
          {name}.
        </span>
        <Link href={`/clients/${conflict.client.id}`} className="underline">
          Voir ce client
        </Link>
        <Link
          href={`/clients/fusionner?a=${client.id}&b=${conflict.client.id}`}
          className="underline"
        >
          Fusionner avec ce client
        </Link>
      </span>
    );
  };

  if (notFound) {
    return (
      <EmptyState
        icon={SearchX}
        title="Client introuvable"
        description="Ce client n'existe pas ou a été fusionné avec un autre."
      />
    );
  }

  if (loading && !client) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner size="lg" label="Chargement du client…" />
      </div>
    );
  }

  if (!client) return null;

  const displayField = (field: keyof ClientDraft): string =>
    editable && draft ? draft[field] : (client[field] ?? '');

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
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
        title={`${client.firstName} ${client.lastName}`.trim() || 'Client'}
      />

      <Card>
        <CardHeader className="flex items-center gap-2">
          <CardTitle className="text-lg font-semibold">Coordonnées</CardTitle>
          <button
            type="button"
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            disabled={saving}
            onClick={() => (editable ? void handleSave() : startEdit())}
            aria-label={editable ? 'Enregistrer' : 'Modifier'}
          >
            {editable ? <Save className="size-4" /> : <Pencil className="size-4" />}
          </button>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div
            className={
              editable
                ? 'grid grid-cols-1 items-end gap-3 sm:grid-cols-2'
                : 'grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 gap-y-2.5 sm:grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)]'
            }
          >
            <RepairField
              label="Prénom"
              name="firstName"
              value={displayField('firstName')}
              editable={editable}
              onChange={handleDraftChange}
            />
            <RepairField
              label="Nom"
              name="lastName"
              value={displayField('lastName')}
              editable={editable}
              onChange={handleDraftChange}
            />
            <RepairField
              label="Adresse"
              name="address"
              value={displayField('address')}
              editable={editable}
              onChange={handleDraftChange}
              className={editable ? 'sm:col-span-2' : undefined}
            />
            <RepairField
              label="Code postal"
              name="postalCode"
              value={displayField('postalCode')}
              editable={editable}
              onChange={handleDraftChange}
            />
            <RepairField
              label="Ville"
              name="city"
              value={displayField('city')}
              editable={editable}
              onChange={handleDraftChange}
            />
            <RepairField
              label="Téléphone"
              name="phone"
              value={displayField('phone')}
              editable={editable}
              onChange={handleDraftChange}
              error={renderConflict('phone')}
            />
            <RepairField
              label="Email"
              name="email"
              value={displayField('email')}
              editable={editable}
              onChange={handleDraftChange}
              className={editable ? 'sm:col-span-2' : undefined}
              error={renderConflict('email')}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Passages</CardTitle>
        </CardHeader>
        <CardContent>
          {client.machineRepairs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun passage.</p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="px-2 py-2 text-left">N°</th>
                    <th className="px-2 py-2 text-left">Entrée</th>
                    <th className="px-2 py-2 text-left">Sortie</th>
                    <th className="px-2 py-2 text-left">Machine</th>
                    <th className="px-2 py-2 text-left">État</th>
                  </tr>
                </thead>
                <tbody>
                  {client.machineRepairs.map((repair) => (
                    <tr
                      key={repair.id}
                      className="cursor-pointer border-b border-border last:border-0 hover:bg-accent"
                      onClick={() => router.push(`/reparation/${repair.id}`)}
                    >
                      <td className="px-2 py-2 font-medium">#{repair.id}</td>
                      <td className="px-2 py-2">
                        {dayjs(repair.entry_date).format('DD/MM/YYYY')}
                      </td>
                      <td className="px-2 py-2">
                        {repair.exit_date
                          ? dayjs(repair.exit_date).format('DD/MM/YYYY')
                          : '—'}
                      </td>
                      <td className="px-2 py-2">
                        {[repair.machine_type_name, repair.brand_name]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </td>
                      <td className="px-2 py-2">
                        <StatusBadge
                          tone={REPAIR_STATE_TONE[repair.state ?? ''] ?? 'neutral'}
                        >
                          {repair.state || 'Non commencé'}
                        </StatusBadge>
                        {repair.archived_at && (
                          <StatusBadge tone="neutral" className="ml-1">
                            Archivée
                          </StatusBadge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg font-semibold">Factures</CardTitle>
          <Button
            size="sm"
            variant="outline"
            render={<Link href={`/factures/nouveau?client=${client.id}`} />}
            nativeButton={false}
          >
            Nouvelle facture
          </Button>
        </CardHeader>
        <CardContent>
          {client.serviceInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune facture.</p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="px-2 py-2 text-left">N°</th>
                    <th className="px-2 py-2 text-left">Date</th>
                    <th className="px-2 py-2 text-left">État</th>
                    <th className="px-2 py-2 text-left">Total TTC</th>
                    <th className="px-2 py-2 text-left">Fiche</th>
                  </tr>
                </thead>
                <tbody>
                  {client.serviceInvoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="cursor-pointer border-b border-border last:border-0 hover:bg-accent"
                      onClick={() => router.push(`/factures/${invoice.id}`)}
                    >
                      <td className="px-2 py-2 font-medium">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-2 py-2">
                        {dayjs(invoice.createdAt).format('DD/MM/YYYY')}
                      </td>
                      <td className="px-2 py-2">
                        <StatusBadge tone={getInvoiceStatusTone(invoice.status)}>
                          {getInvoiceStatusLabel(invoice.status)}
                        </StatusBadge>
                      </td>
                      <td className="px-2 py-2">
                        {formatCurrency(invoice.totalTTC)}
                      </td>
                      <td className="px-2 py-2">
                        {invoice.machineRepairId ? (
                          <Link
                            href={`/reparation/${invoice.machineRepairId}`}
                            className="underline"
                            onClick={(event) => event.stopPropagation()}
                          >
                            #{invoice.machineRepairId}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
