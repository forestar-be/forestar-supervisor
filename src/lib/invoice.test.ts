import { describe, expect, it } from 'vitest';
import {
  calculateLineTotals,
  formatCurrency,
  getInvoiceStatusLabel,
  getInvoiceStatusTone,
  getPaymentMethodLabel,
} from './invoice';
import { PaymentMethod, ServiceInvoiceStatus } from './types';

describe('calculateLineTotals', () => {
  it('renvoie des totaux nuls pour une liste vide', () => {
    expect(calculateLineTotals([])).toEqual({
      subtotalHT: 0,
      vatAmount: 0,
      totalTTC: 0,
    });
  });

  it('additionne plusieurs lignes et applique 21% de TVA', () => {
    const totals = calculateLineTotals([
      { quantity: 2, unitPrice: 50 },
      { quantity: 1, unitPrice: 30 },
    ]);
    expect(totals.subtotalHT).toBe(130);
    expect(totals.vatAmount).toBe(27.3);
    expect(totals.totalTTC).toBe(157.3);
  });

  it('arrondit chaque ligne au centime avant de sommer', () => {
    const totals = calculateLineTotals([{ quantity: 3, unitPrice: 10.005 }]);
    // 3 * 10.005 = 30.015 -> arrondi à 30.02 avant sommation
    expect(totals.subtotalHT).toBe(30.02);
  });

  it('arrondit le total TTC au centime malgré les erreurs de flottants', () => {
    const totals = calculateLineTotals([{ quantity: 1, unitPrice: 0.1 }]);
    expect(totals.subtotalHT).toBe(0.1);
    expect(totals.vatAmount).toBe(0.02);
    expect(totals.totalTTC).toBe(0.12);
  });

  it('gère des quantités et prix nuls', () => {
    expect(
      calculateLineTotals([{ quantity: 0, unitPrice: 100 }]),
    ).toEqual({ subtotalHT: 0, vatAmount: 0, totalTTC: 0 });
  });
});

describe('getInvoiceStatusLabel', () => {
  it('traduit chaque statut en français', () => {
    expect(getInvoiceStatusLabel(ServiceInvoiceStatus.DRAFT)).toBe(
      'Brouillon',
    );
    expect(getInvoiceStatusLabel(ServiceInvoiceStatus.SENT)).toBe('Envoyée');
    expect(getInvoiceStatusLabel(ServiceInvoiceStatus.PAID)).toBe('Payée');
  });
});

describe('getInvoiceStatusTone', () => {
  it('conserve le même ordre sémantique que les anciennes couleurs (bleu, orange, vert)', () => {
    expect(getInvoiceStatusTone(ServiceInvoiceStatus.DRAFT)).toBe('info');
    expect(getInvoiceStatusTone(ServiceInvoiceStatus.SENT)).toBe('warning');
    expect(getInvoiceStatusTone(ServiceInvoiceStatus.PAID)).toBe('success');
  });
});

describe('getPaymentMethodLabel', () => {
  it('traduit chaque mode de paiement', () => {
    expect(getPaymentMethodLabel(PaymentMethod.CASH)).toBe('Espèces');
    expect(getPaymentMethodLabel(PaymentMethod.CARD)).toBe('Carte');
    expect(getPaymentMethodLabel(PaymentMethod.TRANSFER)).toBe('Virement');
  });
});

describe('formatCurrency', () => {
  it('formate en euros à la française', () => {
    // Espace insécable entre le montant et le symbole en fr-FR.
    expect(formatCurrency(1234.5)).toContain('234,50');
    expect(formatCurrency(0)).toContain('0,00');
  });
});
