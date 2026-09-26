'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  getServiceInvoice,
  getServiceInvoicePdf,
  isHttpError,
  markServiceInvoicePaid,
  markServiceInvoiceSent,
  resyncServiceInvoice,
} from '@/lib/api';
import { notifyError, notifySuccess, notifyWarning } from '@/lib/notifications';
import dayjs from '@/lib/dayjs';
import {
  formatCurrency,
  getInvoiceStatusLabel,
  getInvoiceStatusTone,
  getPaymentMethodLabel,
} from '@/lib/invoice';
import {
  ServiceInvoice,
  ServiceInvoiceStatus,
  ServiceInvoiceType,
} from '@/lib/types';
import SendInvoiceModal from './send-invoice-modal';
import DeleteInvoiceModal from './delete-invoice-modal';
import {
  Button,
  ConfirmDialog,
  PageHeader,
  Skeleton,
  StatusBadge,
} from '@forestar-be/ui';
import BackButton from '@/components/back-button';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Mail,
  Pencil,
  Phone,
  RefreshCw,
  Send,
  Trash2,
  Undo2,
} from 'lucide-react';

/** Réponse des actions Dolibarr (marquage payé/envoyé, resync) : l'API peut y ajouter un avertissement. */
type WithDolibarrWarning<T> = T & { dolibarrWarning?: string };

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const [invoice, setInvoice] = useState<ServiceInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showZeroWarning, setShowZeroWarning] = useState(false);

  // Réutilisable par les actions (marquer payée, resync…), qui rechargent la
  // facture après coup — un gestionnaire d'événement, pas un effet.
  const fetchInvoice = useCallback(async () => {
    if (!token || !id) return;
    try {
      const data = await getServiceInvoice(token, parseInt(id, 10));
      setInvoice(data);
      setError(null);
    } catch (err) {
      setError(
        isHttpError(err)
          ? err.message
          : 'Erreur lors du chargement de la facture',
      );
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  // Chargement initial : une chaîne de promesses plutôt qu'un appel direct à
  // `fetchInvoice`, pour que l'effet ne déclenche jamais de `setState`
  // synchrone (voir `delete-invoice-modal.tsx` pour le même choix).
  useEffect(() => {
    if (!token || !id) return;
    getServiceInvoice(token, parseInt(id, 10))
      .then((data) => {
        setInvoice(data);
        setError(null);
      })
      .catch((err) => {
        setError(
          isHttpError(err)
            ? err.message
            : 'Erreur lors du chargement de la facture',
        );
      })
      .finally(() => setLoading(false));
  }, [token, id]);

  const handleMarkPaid = async () => {
    if (!invoice) return;
    try {
      setActionLoading('paid');
      const result = (await markServiceInvoicePaid(
        token,
        invoice.id,
      )) as WithDolibarrWarning<ServiceInvoice>;
      setInvoice(result);
      if (result.dolibarrWarning) notifyWarning(result.dolibarrWarning);
      else notifySuccess('Facture marquée comme payée');
    } catch (err) {
      notifyError(isHttpError(err) ? err.message : "Une erreur s'est produite");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevertToSent = async () => {
    if (!invoice) return;
    try {
      setActionLoading('revert');
      const result = (await markServiceInvoiceSent(
        token,
        invoice.id,
      )) as WithDolibarrWarning<ServiceInvoice>;
      setInvoice(result);
      if (result.dolibarrWarning) notifyWarning(result.dolibarrWarning);
      else notifySuccess('Facture remise en statut envoyée');
    } catch (err) {
      notifyError(isHttpError(err) ? err.message : "Une erreur s'est produite");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResync = async () => {
    if (!invoice) return;
    try {
      setActionLoading('resync');
      await resyncServiceInvoice(token, invoice.id);
      await fetchInvoice();
      notifySuccess('Synchronisation Dolibarr effectuée');
    } catch (err) {
      notifyError(
        isHttpError(err)
          ? err.message
          : 'Erreur lors de la synchronisation Dolibarr',
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    try {
      setActionLoading('pdf');
      const blob = await getServiceInvoicePdf(token, invoice.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Facture_${invoice.invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      notifyError(isHttpError(err) ? err.message : 'Erreur téléchargement PDF');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <BackButton fallback="/factures" />
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error || 'Facture introuvable'}
        </div>
      </div>
    );
  }

  const netToPay = invoice.totalTTC - invoice.deposit;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <BackButton fallback="/factures" />

      {/* Zero amount warning */}
      <ConfirmDialog
        open={showZeroWarning}
        title="Facture avec montant à 0"
        message={
          invoice.totalTTC === 0
            ? "Le total de cette facture est de 0 €. Voulez-vous vraiment la valider et l'envoyer ?"
            : "Cette facture contient une ou plusieurs lignes avec un prix unitaire à 0 €. Voulez-vous vraiment la valider et l'envoyer ?"
        }
        type="warning"
        confirmText="Continuer"
        cancelText="Annuler"
        onConfirm={() => {
          setShowZeroWarning(false);
          setShowSendModal(true);
        }}
        onClose={() => setShowZeroWarning(false)}
      />

      {showSendModal && (
        <SendInvoiceModal
          invoiceId={invoice.id}
          clientEmail={invoice.clientEmail}
          onClose={() => setShowSendModal(false)}
          onSent={() => {
            setShowSendModal(false);
            fetchInvoice();
            notifySuccess('Facture envoyée avec succès');
          }}
        />
      )}

      {showDeleteModal && (
        <DeleteInvoiceModal
          invoiceId={invoice.id}
          invoiceNumber={invoice.invoiceNumber}
          onClose={() => setShowDeleteModal(false)}
          onDeleted={() => router.push('/factures')}
        />
      )}

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {invoice.invoiceNumber}
            <StatusBadge tone={getInvoiceStatusTone(invoice.status)}>
              {getInvoiceStatusLabel(invoice.status)}
            </StatusBadge>
            {invoice.type === ServiceInvoiceType.INSTALLATION && (
              <StatusBadge tone="info">Installation</StatusBadge>
            )}
          </span>
        }
        description={
          <span className="flex items-center gap-2">
            Créée le {dayjs(invoice.createdAt).format('DD/MM/YYYY')}
            {invoice.dolibarrSyncStatus === 'synced' && (
              <span className="inline-flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> Synced Dolibarr
              </span>
            )}
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {invoice.status === ServiceInvoiceStatus.DRAFT && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={`/factures/${invoice.id}/edit`} />}
                  nativeButton={false}
                >
                  <Pencil />
                  Modifier
                </Button>
                <Button
                  size="sm"
                  disabled={!invoice.clientEmail || invoice.lines.length === 0}
                  onClick={() => {
                    if (
                      invoice.totalTTC === 0 ||
                      invoice.lines.some((l) => l.unitPrice === 0)
                    ) {
                      setShowZeroWarning(true);
                    } else {
                      setShowSendModal(true);
                    }
                  }}
                >
                  <Send />
                  Valider et envoyer
                </Button>
              </>
            )}
            {invoice.status !== ServiceInvoiceStatus.PAID && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => setShowDeleteModal(true)}
              >
                <Trash2 />
                Supprimer
              </Button>
            )}
            {invoice.status === ServiceInvoiceStatus.SENT && (
              <Button
                size="sm"
                disabled={actionLoading === 'paid'}
                onClick={handleMarkPaid}
              >
                <CheckCircle2 />
                Marquer payée
              </Button>
            )}
            {invoice.status === ServiceInvoiceStatus.PAID && (
              <Button
                variant="outline"
                size="sm"
                disabled={actionLoading === 'revert'}
                onClick={handleRevertToSent}
              >
                <Undo2 />
                Remettre en non payée
              </Button>
            )}
            {invoice.status !== ServiceInvoiceStatus.DRAFT && (
              <Button
                variant="outline"
                size="sm"
                disabled={actionLoading === 'pdf'}
                onClick={handleDownloadPdf}
              >
                <Download />
                PDF
              </Button>
            )}
          </div>
        }
      />

      {invoice.dolibarrSyncStatus === 'error' && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Erreur de synchronisation Dolibarr
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={actionLoading === 'resync'}
            onClick={handleResync}
          >
            <RefreshCw
              className={actionLoading === 'resync' ? 'animate-spin' : ''}
            />
            Resync Dolibarr
          </Button>
        </div>
      )}

      {/* Client info */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Client
        </h2>
        <p className="font-bold">
          {invoice.clientFirstName} {invoice.clientLastName}
        </p>
        {invoice.clientPhone && (
          <a
            href={`tel:${invoice.clientPhone}`}
            className="mt-1 flex items-center gap-2 text-sm hover:underline"
          >
            <Phone className="h-4 w-4 text-muted-foreground" />
            {invoice.clientPhone}
          </a>
        )}
        {invoice.clientEmail && (
          <a
            href={`mailto:${invoice.clientEmail}`}
            className="mt-1 flex items-center gap-2 text-sm hover:underline"
          >
            <Mail className="h-4 w-4 text-muted-foreground" />
            {invoice.clientEmail}
          </a>
        )}
        {(invoice.clientAddress || invoice.clientCity) && (
          <p className="mt-1 text-sm text-muted-foreground">
            {[
              invoice.clientAddress,
              invoice.clientPostalCode,
              invoice.clientCity,
            ]
              .filter(Boolean)
              .join(', ')}
          </p>
        )}
      </div>

      {invoice.clientId && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-900 dark:bg-blue-950/40">
          <span className="text-blue-800 dark:text-blue-300">Client : </span>
          <Link
            href={`/clients/${invoice.clientId}`}
            className="font-bold text-blue-800 underline dark:text-blue-300"
          >
            {invoice.clientFirstName} {invoice.clientLastName}
          </Link>
        </div>
      )}

      {invoice.machineRepairId && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-900 dark:bg-blue-950/40">
          <span className="text-blue-800 dark:text-blue-300">
            Liée à la réparation{' '}
          </span>
          <Link
            href={`/reparation/${invoice.machineRepairId}`}
            className="font-bold text-blue-800 underline dark:text-blue-300"
          >
            #{invoice.machineRepairId}
          </Link>
        </div>
      )}

      {/* Lines */}
      <div className="overflow-auto rounded-xl border border-border bg-card">
        <h2 className="px-5 pt-5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Prestations
        </h2>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-5 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-center">Qté</th>
              <th className="px-3 py-2 text-right">P.U. HT</th>
              <th className="px-5 py-2 text-right">Total HT</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line) => (
              <tr
                key={line.id}
                className="border-b border-border last:border-0"
              >
                <td className="px-5 py-2.5">{line.description}</td>
                <td className="px-3 py-2.5 text-center">
                  {line.quantity} {line.unit}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {formatCurrency(line.unitPrice)}
                </td>
                <td className="px-5 py-2.5 text-right font-medium">
                  {formatCurrency(line.totalPrice)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-col items-end gap-1 p-5">
          <div className="flex w-64 justify-between text-sm">
            <span className="text-muted-foreground">Sous-total HT</span>
            <span className="font-medium">
              {formatCurrency(invoice.subtotalHT)}
            </span>
          </div>
          <div className="flex w-64 justify-between text-sm">
            <span className="text-muted-foreground">
              TVA ({invoice.vatRate}%)
            </span>
            <span className="font-medium">
              {formatCurrency(invoice.vatAmount)}
            </span>
          </div>
          <div className="flex w-64 justify-between border-t border-border pt-1 text-base font-bold">
            <span>Total TTC</span>
            <span className="text-primary">
              {formatCurrency(invoice.totalTTC)}
            </span>
          </div>
          {invoice.deposit > 0 && (
            <>
              <div className="flex w-64 justify-between text-sm text-green-600">
                <span>Acompte versé</span>
                <span>- {formatCurrency(invoice.deposit)}</span>
              </div>
              <div className="flex w-64 justify-between border-t border-border pt-1 text-base font-bold">
                <span>Net à payer</span>
                <span className="text-primary">{formatCurrency(netToPay)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Payment method */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Paiement
        </h2>
        <p className="font-semibold">
          {getPaymentMethodLabel(invoice.paymentMethod)}
        </p>
      </div>

      {invoice.remarks && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Remarques
          </h2>
          <p className="whitespace-pre-wrap text-sm">{invoice.remarks}</p>
        </div>
      )}
    </div>
  );
}
