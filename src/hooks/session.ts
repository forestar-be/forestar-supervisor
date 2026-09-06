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
 * Racine de l'IdP, pour les liens de gestion de compte du menu utilisateur.
 *
 * Valeur par défaut plutôt que variable obligatoire : l'adresse est publique et
 * stable, et l'exiger aurait demandé de la poser sur sept projets Vercel avant
 * que le menu ne fonctionne nulle part.
 */
export const SSO_ISSUER =
  process.env.REACT_APP_SSO_ISSUER ?? 'https://auth.forestar.be';

/**
 * Valeur de `useAuth().token` en mode SSO.
 *
 * Ce n'est pas un jeton : aucun secret n'atteint le JavaScript, c'est tout
 * l'objet du programme. C'est une **sentinelle non vide**, et elle existe
 * parce que le code hérité se sert de `token` comme synonyme de « connecté »
 * bien plus souvent que pour construire un en-tête `Authorization` — 134
 * endroits contre 13, comptés le 2026-09-06. Avec une chaîne vide, tous ces
 * tests devenaient faux : menus et boutons disparaissaient, des chargements
 * ne partaient jamais, et `AppShell` de forestar-robot renvoyait `null`, donc
 * une page entièrement blanche sur une session parfaitement valide.
 *
 * Corollaire indispensable : **aucun en-tête `Authorization` ne doit être
 * construit à partir de cette valeur**. Tous les points qui le font sont
 * gardés par `SSO_ENABLED`.
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
