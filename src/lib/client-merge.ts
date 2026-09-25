import type { ClientField } from './types';

/**
 * Fusion de clients, choix par champ (R009-S04, D-29). Logique pure, sans
 * React : présélection de la valeur de chaque champ avant affichage.
 */

/**
 * Une valeur compte comme vide si elle ne contient aucune lettre ni aucun
 * chiffre : chaîne vide, espaces, ou remplissage de pure ponctuation (`/`,
 * `-`, `.`, `´`…). Même règle que la reprise (D-28), appliquée ici à la
 * présélection du champ le plus utile.
 */
export function isMeaningfulValue(value: string | null | undefined): boolean {
  if (!value) return false;
  return /[\p{L}\p{N}]/u.test(value);
}

/** Client dont on choisit la valeur : `a` (gauche) ou `b` (droite). */
export type ClientMergeSide = 'a' | 'b';
/** Choix retenu pour un champ : la gauche, la droite, ou une saisie libre. */
export type ClientMergeChoice = ClientMergeSide | 'custom';

/**
 * Présélection d'un champ (D-29) : la valeur du client gardé si elle est
 * utilisable, sinon celle de l'autre. Si aucune des deux ne l'est, la valeur
 * du client gardé est gardée par défaut (les deux sont vides ou équivalentes).
 */
export function preselectMergeChoice(
  aValue: string,
  bValue: string,
  keptSide: ClientMergeSide,
): ClientMergeSide {
  const keptValue = keptSide === 'a' ? aValue : bValue;
  if (isMeaningfulValue(keptValue)) return keptSide;
  const otherSide: ClientMergeSide = keptSide === 'a' ? 'b' : 'a';
  const otherValue = keptSide === 'a' ? bValue : aValue;
  return isMeaningfulValue(otherValue) ? otherSide : keptSide;
}

/** Présélection de tous les champs de coordonnées d'un coup. */
export function preselectAllFields(
  a: Record<ClientField, string>,
  b: Record<ClientField, string>,
  fields: readonly ClientField[],
  keptSide: ClientMergeSide,
): Record<ClientField, ClientMergeSide> {
  const result = {} as Record<ClientField, ClientMergeSide>;
  for (const field of fields) {
    result[field] = preselectMergeChoice(a[field], b[field], keptSide);
  }
  return result;
}

/**
 * Valeur finale d'un champ selon le choix retenu : la valeur du client
 * concerné, ou la saisie libre.
 */
export function resolveFieldValue(
  choice: ClientMergeChoice,
  aValue: string,
  bValue: string,
  customValue: string,
): string {
  if (choice === 'a') return aValue;
  if (choice === 'b') return bValue;
  return customValue;
}
