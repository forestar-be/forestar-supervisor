'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  getServiceInvoice,
  isHttpError,
  updateServiceInvoice,
} from '@/lib/api';
import { notifyError, notifySuccess } from '@/lib/notifications';
import { ServiceInvoiceStatus } from '@/lib/types';
import InvoiceForm, { type InvoiceFormData } from './invoice-form';
import { PageHeader, Skeleton } from '@forestar-be/ui';
import BackButton from '@/components/back-button';

/**
 * Édition d'une facture de réparation en brouillon, portée depuis
 * `ServiceInvoiceEdit.tsx`. Une facture qui n'est plus en brouillon renvoie
 * vers sa page de détail : elle ne peut plus être modifiée.
 */
export default function InvoiceEdit() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const [initialData, setInitialData] =
    useState<Partial<InvoiceFormData> | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Chaîne de promesses plutôt qu'une fonction appelée directement dans
  // l'effet, pour qu'aucun `setState` n'y soit synchrone (même choix que
  // `delete-invoice-modal.tsx`).
  useEffect(() => {
    if (!token || !id) return;
    getServiceInvoice(token, parseInt(id, 10))
      .then((data) => {
        if (data.status !== ServiceInvoiceStatus.DRAFT) {
          notifyError(
            'Seules les factures en brouillon peuvent être modifiées',
          );
          router.replace(`/factures/${id}`);
          return;
        }
        setInvoiceNumber(data.invoiceNumber);
        setInitialData({
          clientFirstName: data.clientFirstName,
          clientLastName: data.clientLastName,
          clientPhone: data.clientPhone,
          clientEmail: data.clientEmail,
          clientAddress: data.clientAddress,
          clientCity: data.clientCity,
          clientPostalCode: data.clientPostalCode,
          paymentMethod: data.paymentMethod,
          remarks: data.remarks || '',
          lines: data.lines.map((l) => ({
            description: l.description,
            type: l.type,
            unit: l.unit,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
          })),
          machineRepairId: data.machineRepairId ?? undefined,
        });
      })
      .catch((err) => {
        setLoadError(isHttpError(err) ? err.message : 'Erreur');
      })
      .finally(() => setLoading(false));
  }, [token, id, router]);

  const handleSubmit = async (data: InvoiceFormData) => {
    if (!id) return;
    setSaving(true);
    try {
      await updateServiceInvoice(token, parseInt(id, 10), data);
      notifySuccess('Facture mise à jour');
      router.push(`/factures/${id}`);
    } catch (err) {
      notifyError(
        isHttpError(err) ? err.message : 'Erreur lors de la mise à jour',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (loadError || !initialData) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <BackButton fallback="/factures" />
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {loadError || 'Facture introuvable'}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <BackButton fallback={`/factures/${id}`} />

      <PageHeader title={`Modifier ${invoiceNumber}`} />

      <InvoiceForm
        initialData={initialData}
        onSubmit={handleSubmit}
        submitLabel="Mettre à jour"
        saving={saving}
      />
    </div>
  );
}
