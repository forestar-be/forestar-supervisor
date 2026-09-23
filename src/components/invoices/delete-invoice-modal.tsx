'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import {
  deleteServiceInvoice,
  getServiceInvoiceDeletionInfo,
  isHttpError,
} from '@/lib/api';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@forestar-be/ui';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface DeletionInfo {
  isDraft: boolean;
  hasDolibarrInvoice: boolean;
  dolibarrStatus: number | null;
}

interface DeleteResult {
  dolibarrWarning?: string;
  dolibarrWarningDetail?: string;
}

interface DeleteInvoiceModalProps {
  invoiceId: number;
  invoiceNumber: string;
  onClose: () => void;
  onDeleted: () => void;
}

/**
 * Modale de suppression d'une facture de service, portée depuis
 * `DeleteInvoiceModal.tsx`. Rappelle le cadre légal belge (numérotation
 * séquentielle) et prévient si la facture est déjà payée dans Dolibarr.
 */
export default function DeleteInvoiceModal({
  invoiceId,
  invoiceNumber,
  onClose,
  onDeleted,
}: DeleteInvoiceModalProps) {
  const { token } = useAuth();
  const [info, setInfo] = useState<DeletionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [warningDetail, setWarningDetail] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    if (!token) return;
    getServiceInvoiceDeletionInfo(token, invoiceId)
      .then(setInfo)
      .catch(() => setInfo(null))
      .finally(() => setLoading(false));
  }, [token, invoiceId]);

  const isDolibarrPaid = info?.hasDolibarrInvoice && info.dolibarrStatus === 2;

  const handleDelete = async () => {
    try {
      setDeleting(true);
      setError(null);
      const result = (await deleteServiceInvoice(
        token,
        invoiceId,
      )) as DeleteResult;
      setDeleted(true);
      if (result?.dolibarrWarning) {
        setWarning(result.dolibarrWarning);
        if (result.dolibarrWarningDetail) {
          setWarningDetail(result.dolibarrWarningDetail);
        }
      } else {
        onDeleted();
      }
    } catch (err) {
      setError(
        isHttpError(err) ? err.message : 'Erreur lors de la suppression',
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && !deleting && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {deleted ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            )}
            {deleted ? 'Facture supprimée' : 'Supprimer la facture'}
          </DialogTitle>
          <DialogDescription>{invoiceNumber}</DialogDescription>
        </DialogHeader>

        <div>
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : deleted ? (
            <div className="space-y-3">
              {warning ? (
                <div className="space-y-2">
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400">
                    <p className="font-medium">
                      Facture supprimée uniquement localement
                    </p>
                    <p className="mt-1">{warning}</p>
                  </div>
                  {warningDetail && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowDetail(!showDetail)}
                        className="cursor-pointer text-xs text-muted-foreground hover:text-foreground"
                      >
                        {showDetail ? 'Masquer' : 'Détail technique'}
                      </button>
                      {showDetail && (
                        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded border border-border bg-muted p-2 text-xs text-muted-foreground">
                          {warningDetail}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  La facture a été supprimée avec succès.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {info?.isDraft ? (
                <p className="text-sm text-muted-foreground">
                  Ce brouillon n&apos;a pas de numéro de facture définitif. Sa
                  suppression n&apos;a aucun impact sur la numérotation.
                </p>
              ) : (
                <div className="space-y-3">
                  {isDolibarrPaid && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                        Facture payée dans Dolibarr
                      </p>
                      <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                        Cette facture est payée dans Dolibarr et ne peut pas y
                        être supprimée automatiquement. Vous devrez créer un
                        avoir ou l&apos;annuler manuellement dans
                        l&apos;interface Dolibarr.
                      </p>
                      <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                        La suppression ici n&apos;affectera que l&apos;application
                        locale, pas la comptabilité Dolibarr.
                      </p>
                    </div>
                  )}
                  {info?.hasDolibarrInvoice && !isDolibarrPaid && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                        Facture Dolibarr
                      </p>
                      <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                        Cette facture est liée à Dolibarr. Elle sera également
                        supprimée dans Dolibarr lors de la suppression.
                      </p>
                    </div>
                  )}
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                    <p className="text-sm font-medium text-destructive">
                      Attention — Cadre légal
                    </p>
                    <p className="mt-1 text-sm text-destructive/90">
                      En Belgique, l&apos;article 5 de l&apos;Arrêté royal n° 1
                      (TVA) et l&apos;article 226 de la Directive européenne
                      2006/112/CE imposent une numérotation séquentielle et
                      ininterrompue des factures. Privilégiez l&apos;émission
                      d&apos;une note de crédit plutôt que la suppression.
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {deleted ? (
            <Button onClick={onDeleted}>OK</Button>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={loading || deleting}
              >
                {deleting && <Loader2 className="animate-spin" />}
                Supprimer{isDolibarrPaid ? ' localement' : ' définitivement'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
