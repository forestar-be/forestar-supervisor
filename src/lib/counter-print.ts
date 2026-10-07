/**
 * Impression au comptoir (R002-S04) — message affiché pour chaque réponse de
 * `POST /supervisor/machine-repairs/:id/ticket/print`.
 *
 * La logique est ici, hors du composant, pour être testée sans navigateur. Le
 * serveur ne renvoie jamais 401 pour un refus du relais : un 401 est donc bien
 * une session perdue, que le client HTTP traite déjà (`onUnauthorized`).
 */
import { isHttpError } from '@forestar-be/core';

export const COUNTER_PRINT_SUCCESS_MESSAGE =
  "Tickets envoyés à l'imprimante du comptoir";

/** Le comptoir ne répond pas : l'atelier a une issue de secours, l'impression sur ce poste. */
export const COUNTER_PRINT_UNREACHABLE_MESSAGE =
  'Le PC du comptoir ne répond pas. Réessayez, ou utilisez « Imprimer sur ce poste ».';

export const COUNTER_PRINT_GENERIC_MESSAGE =
  "Impossible d'imprimer les tickets au comptoir. Réessayez, ou utilisez « Imprimer sur ce poste ».";

/** Traduit l'erreur levée par l'appel d'impression en message pour l'utilisateur. */
export function describeCounterPrintError(error: unknown): string {
  // Pas de réponse (réseau coupé, API injoignable) : même issue que le comptoir muet.
  if (!isHttpError(error)) return COUNTER_PRINT_UNREACHABLE_MESSAGE;

  const data = error.data as { code?: unknown; detail?: unknown } | undefined;
  const code = typeof data?.code === 'string' ? data.code : undefined;

  switch (error.status) {
    case 409:
      return 'Impression déjà en cours pour cette fiche';
    case 422:
      return "Ticket trop long pour l'imprimante";
    case 429:
      return "Trop d'impressions demandées, réessayez dans une minute";
    case 502: {
      const detail =
        typeof data?.detail === 'string' && data.detail.trim() !== ''
          ? data.detail.trim()
          : null;
      return detail
        ? `L'imprimante du comptoir a refusé l'impression : ${detail}`
        : "L'imprimante du comptoir a refusé l'impression";
    }
    case 503:
      if (code === 'paused') return 'Impression au comptoir suspendue';
      // print_relay_unreachable, print_relay_not_configured, ou un 503 de passage.
      return COUNTER_PRINT_UNREACHABLE_MESSAGE;
    case 400:
    case 401:
    case 403:
    case 404:
      // Message français du serveur (« Réparation non trouvée. »…) ou du client HTTP.
      return error.message || COUNTER_PRINT_GENERIC_MESSAGE;
    default:
      return COUNTER_PRINT_GENERIC_MESSAGE;
  }
}
