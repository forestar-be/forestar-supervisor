import { describe, expect, it } from 'vitest';
import { HttpError } from '@forestar-be/core';
import {
  COUNTER_PRINT_GENERIC_MESSAGE,
  COUNTER_PRINT_SUCCESS_MESSAGE,
  COUNTER_PRINT_UNREACHABLE_MESSAGE,
  describeCounterPrintError,
} from './counter-print';

const erreur = (status: number, data?: unknown, message = `Erreur ${status}`) =>
  new HttpError(message, status, data);

describe('describeCounterPrintError', () => {
  it('succès : le message est celui du cahier des charges', () => {
    expect(COUNTER_PRINT_SUCCESS_MESSAGE).toBe(
      "Tickets envoyés à l'imprimante du comptoir",
    );
  });

  it('503 injoignable ou non configuré : propose « Imprimer sur ce poste »', () => {
    for (const code of [
      'print_relay_unreachable',
      'print_relay_not_configured',
    ]) {
      expect(describeCounterPrintError(erreur(503, { code }))).toBe(
        'Le PC du comptoir ne répond pas. Réessayez, ou utilisez « Imprimer sur ce poste ».',
      );
    }
    expect(describeCounterPrintError(erreur(503, undefined))).toBe(
      COUNTER_PRINT_UNREACHABLE_MESSAGE,
    );
  });

  it('erreur réseau (pas de réponse) : le PC ne répond pas', () => {
    expect(describeCounterPrintError(new TypeError('Failed to fetch'))).toBe(
      COUNTER_PRINT_UNREACHABLE_MESSAGE,
    );
  });

  it('502 : refus de l’imprimante avec le détail', () => {
    expect(
      describeCounterPrintError(
        erreur(502, { code: 'print_failed', detail: 'imprimante hors ligne' }),
      ),
    ).toBe(
      "L'imprimante du comptoir a refusé l'impression : imprimante hors ligne",
    );
    expect(describeCounterPrintError(erreur(502, {}))).toBe(
      "L'imprimante du comptoir a refusé l'impression",
    );
  });

  it('429, 422, 503 paused, 409', () => {
    expect(
      describeCounterPrintError(erreur(429, { code: 'rate_limited' })),
    ).toBe("Trop d'impressions demandées, réessayez dans une minute");
    expect(
      describeCounterPrintError(erreur(422, { code: 'too_many_pages' })),
    ).toBe("Ticket trop long pour l'imprimante");
    expect(describeCounterPrintError(erreur(503, { code: 'paused' }))).toBe(
      'Impression au comptoir suspendue',
    );
    expect(
      describeCounterPrintError(erreur(409, { code: 'print_in_progress' })),
    ).toBe('Impression déjà en cours pour cette fiche');
  });

  it('404 reprend le message du serveur, un 500 reste générique', () => {
    expect(
      describeCounterPrintError(
        erreur(
          404,
          { message: 'Réparation non trouvée.' },
          'Réparation non trouvée.',
        ),
      ),
    ).toBe('Réparation non trouvée.');
    expect(describeCounterPrintError(erreur(500))).toBe(
      COUNTER_PRINT_GENERIC_MESSAGE,
    );
  });
});
