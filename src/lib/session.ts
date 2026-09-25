/**
 * Mode d'authentification et client de session partagé.
 *
 * L'application embarque les deux chemins et n'en active qu'un, décidé par
 * `NEXT_PUBLIC_AUTH_MODE` au build : `oidc` en production, `legacy` pour le
 * `forestar-server` local, qui tourne sans `HUMAN_AUTH_MODE`.
 *
 * Le client de session est unique et vit au niveau du module : le provider
 * React et le client HTTP doivent lire le **même** jeton CSRF, sinon la
 * première mutation après une reconnexion partirait avec un jeton périmé.
 */
import { createSessionClient, type SessionClient } from '@forestar-be/core';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

/** Vrai quand l'application doit utiliser le SSO plutôt que l'ancien login. */
export const SSO_ENABLED = process.env.NEXT_PUBLIC_AUTH_MODE === 'oidc';

/** Racine de l'IdP, pour les liens de gestion de compte du menu utilisateur. */
export const SSO_ISSUER =
  process.env.NEXT_PUBLIC_SSO_ISSUER ?? 'https://auth.forestar.be';

/** Console Zitadel, où se gèrent désormais les utilisateurs. */
export const SSO_CONSOLE_URL =
  process.env.NEXT_PUBLIC_SSO_CONSOLE_URL ?? `${SSO_ISSUER}/ui/console`;

export const ROBOT_URL =
  process.env.NEXT_PUBLIC_ROBOT_URL ?? 'https://robot.forestar.be';

/** Application de la tablette de l'atelier, ouverte depuis l'en-tête. */
export const OPERATOR_URL =
  process.env.NEXT_PUBLIC_OPERATOR_URL ?? 'https://operateur.forestar.be';

/**
 * Valeur de `useAuth().token` en mode SSO.
 *
 * Ce n'est pas un jeton : aucun secret n'atteint le JavaScript. C'est une
 * **sentinelle non vide**, parce que le code se sert de `token` comme synonyme
 * de « connecté » (garde des chargements) et le passe à chaque fonction
 * d'endpoint. Corollaire : **aucun en-tête `Authorization` ne doit être
 * construit à partir de cette valeur** — `api.ts` la retire en mode SSO.
 */
export const SSO_SESSION_TOKEN = 'sso-cookie-session';

/**
 * Rôles admis. Le serveur reste l'autorité — la matrice R005 protège
 * `/supervisor` — mais refuser ici évite d'afficher une interface complète à
 * quelqu'un dont chaque appel repartira en 403.
 */
export const ALLOWED_ROLES = ['forestar.supervisor', 'forestar.admin'] as const;

let client: SessionClient | null = null;

/**
 * Client de session, créé à la première demande et une seule fois.
 *
 * `currentUrl` est absolu : la redirection finale est exécutée par
 * `/auth/callback`, servi par l'API. Sans l'origine, l'utilisateur
 * atterrirait sur l'API au lieu de revenir ici.
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
