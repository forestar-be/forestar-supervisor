import { PaymentMethod, ServiceInvoiceStatus } from './types';
import type { StatusTone } from '@forestar-be/ui';

/**
 * Calculs et libellés des factures de service, portés depuis l'ancien
 * `utils/invoiceUtils.ts`. Les règles métier (TVA 21%, arrondi au centime)
 * sont inchangées — seul le rendu (badges du design system plutôt que des
 * couleurs hexadécimales) a changé.
 */

export const formatCurrency = (amount: number): string =>
  amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

export const getInvoiceStatusLabel = (status: ServiceInvoiceStatus): string => {
  switch (status) {
    case ServiceInvoiceStatus.DRAFT:
      return 'Brouillon';
    case ServiceInvoiceStatus.SENT:
      return 'Envoyée';
    case ServiceInvoiceStatus.PAID:
      return 'Payée';
    default:
      return status;
  }
};

/** Tonalité `StatusBadge` associée à chaque statut, dans le même ordre que l'ancien code (bleu, orange, vert). */
export const getInvoiceStatusTone = (status: ServiceInvoiceStatus): StatusTone => {
  switch (status) {
    case ServiceInvoiceStatus.DRAFT:
      return 'info';
    case ServiceInvoiceStatus.SENT:
      return 'warning';
    case ServiceInvoiceStatus.PAID:
      return 'success';
    default:
      return 'neutral';
  }
};

export const getPaymentMethodLabel = (method: PaymentMethod): string => {
  switch (method) {
    case PaymentMethod.CASH:
      return 'Espèces';
    case PaymentMethod.CARD:
      return 'Carte';
    case PaymentMethod.TRANSFER:
      return 'Virement';
    default:
      return method;
  }
};

/** Taux de TVA appliqué aux factures de service (Belgique). */
export const VAT_RATE = 0.21;

export const calculateLineTotals = (
  lines: { quantity: number; unitPrice: number }[],
): { subtotalHT: number; vatAmount: number; totalTTC: number } => {
  const subtotalHT = lines.reduce(
    (sum, l) => sum + Math.round(l.quantity * l.unitPrice * 100) / 100,
    0,
  );
  const vatAmount = Math.round(subtotalHT * VAT_RATE * 100) / 100;
  const totalTTC = Math.round((subtotalHT + vatAmount) * 100) / 100;
  return { subtotalHT, vatAmount, totalTTC };
};
