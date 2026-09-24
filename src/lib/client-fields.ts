import type { Client, ClientField } from './types';

/**
 * Atelier R009 (D-19, D-20) — coordonnées d'un client, dans l'ordre affiché
 * par les deux endroits qui les modifient : la carte « Coordonnées du
 * client » d'une fiche (R009-S02) et la fiche client elle-même (R009-S03).
 * Regroupé ici pour que la même règle de diff ne soit écrite qu'une fois.
 */
export const CLIENT_DRAFT_FIELDS: ClientField[] = [
  'firstName',
  'lastName',
  'address',
  'postalCode',
  'city',
  'phone',
  'email',
];

export type ClientDraft = Record<ClientField, string>;

export function clientDraftFrom(client: Client): ClientDraft {
  return {
    firstName: client.firstName,
    lastName: client.lastName,
    phone: client.phone,
    email: client.email,
    address: client.address,
    postalCode: client.postalCode,
    city: client.city,
  };
}

/** Champs du brouillon qui diffèrent de leur valeur d'origine. */
export function diffClientDraft(
  draft: ClientDraft,
  current: ClientDraft,
): Partial<ClientDraft> {
  return CLIENT_DRAFT_FIELDS.reduce<Partial<ClientDraft>>((acc, field) => {
    if (draft[field] !== current[field]) acc[field] = draft[field];
    return acc;
  }, {});
}
