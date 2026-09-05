/**
 * R018 — Mode d'authentification et client de session partagé.
 *
 * L'application embarque les deux chemins et n'en active qu'un, décidé par
 * `REACT_APP_AUTH_MODE`. C-06 impose que l'ancien login reste le seul visible
 * jusqu'à la fenêtre de bascule globale, et C-12 que chaque application soit
 * prête sans être activée : bascule et rollback sont un changement de variable,
 * pas un redéploiement de code différent.
 *
 * Les imports viennent de l'entrée racine de `@forestar-be/core`, jamais de son
 * sous-chemin `/auth` : celui-ci dépend de `next/navigation`, et ce bundle
 * react-scripts ne doit embarquer ni Next ni une seconde copie de React.
 */

import { createSessionClient, type SessionClient } from '@forestar-be/core';

export const API_URL = process.env.REACT_APP_API_URL ?? '';

/** Vrai quand l'application doit utiliser le SSO plutôt que l'ancien login. */
export const SSO_ENABLED = process.env.REACT_APP_AUTH_MODE === 'oidc';

/**
 * Rôles admis. Le serveur reste l'autorité — la matrice R005 protège
 * `/supervisor` — mais refuser ici évite d'afficher une interface complète à
 * quelqu'un dont chaque appel repartira en 403.
 */
export const ALLOWED_ROLES = ['forestar.supervisor', 'forestar.admin'] as const;

let client: SessionClient | null = null;

/**
 * `currentUrl` est fourni explicitement : le défaut de `@forestar-be/core` est
 * un chemin nu, et la redirection finale est exécutée par `/auth/callback`,
 * servi par l'API. Sans l'origine, l'utilisateur atterrirait sur l'API.
 */
export function getSessionClient(): SessionClient {
  if (!client) {
    client = createSessionClient({
      baseUrl: API_URL,
      currentUrl: () =>
        typeof window === 'undefined' ? '/' : window.location.href,
    });
  }
  return client;
}
