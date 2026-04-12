import {
  ServiceInvoiceStatus,
  PaymentMethod,
  ServiceInvoiceLine,
} from './types';

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

export const getInvoiceStatusColor = (
  status: ServiceInvoiceStatus,
): string => {
  switch (status) {
    case ServiceInvoiceStatus.DRAFT:
      return '#2196f3'; // blue
    case ServiceInvoiceStatus.SENT:
      return '#ff9800'; // orange
    case ServiceInvoiceStatus.PAID:
      return '#4caf50'; // green
    default:
      return '#9e9e9e'; // grey
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

export const calculateLineTotals = (
  lines: Pick<ServiceInvoiceLine, 'quantity' | 'unitPrice'>[],
) => {
  const subtotalHT = lines.reduce(
    (sum, l) => sum + Math.round(l.quantity * l.unitPrice * 100) / 100,
    0,
  );
  const vatAmount = Math.round(subtotalHT * 0.21 * 100) / 100;
  const totalTTC = Math.round((subtotalHT + vatAmount) * 100) / 100;
  return { subtotalHT, vatAmount, totalTTC };
};
