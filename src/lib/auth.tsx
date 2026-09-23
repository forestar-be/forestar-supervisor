'use client';

import {
  AuthProvider as SsoProvider,
  useAuth as useSsoSession,
  type ForestarRole,
  type SessionUser,
} from '@forestar-be/core';
import { createAuth, type LoginResult } from '@forestar-be/core/auth';
import type { ReactNode } from 'react';
import { login } from './api';
import {
  API_URL,
  getSessionClient,
  SSO_ENABLED,
  SSO_SESSION_TOKEN,
} from './session';

/**
 * Authentification de l'atelier.
 *
 * Les deux implémentations coexistent et se choisissent **au chargement du
 * module**, jamais au rendu : `useAuth` est une référence de fonction fixée
 * une fois pour toutes. Un `if` dans le corps d'un composant appellerait des
 * hooks différents d'un rendu à l'autre, ce que React interdit.
 */
export interface AppAuth {
  /** Sentinelle non vide en mode SSO : aucun jeton n'atteint le navigateur. */
  token: string;
  isAdmin: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  roles: readonly ForestarRole[];
  hasRole: (...roles: ForestarRole[]) => boolean;
  loginAction: (credentials: {
    username: string;
    password: string;
  }) => Promise<LoginResult>;
  logOut: () => void;
  /** Repart vers l'IdP en demandant le sélecteur de comptes. */
  switchAccount: () => void;
  /** Identité de la session SSO. `null` en mode historique. */
  user: SessionUser | null;
  ssoEnabled: boolean;
}

const legacy = createAuth<{ username: string; password: string }>({
  login,
  publicPaths: ['/login', '/demenage'],
  homePath: '/',
});

function useLegacyAuth(): AppAuth {
  const { token, isAdmin, loginAction, logOut } = legacy.useAuth();
  return {
    token,
    isAdmin,
    isLoading: false,
    isAuthenticated: Boolean(token),
    roles: [],
    // Le chemin historique ne connaît que le drapeau `isAdmin`.
    hasRole: (...roles: ForestarRole[]) =>
      roles.length === 0 ? Boolean(token) : isAdmin,
    loginAction,
    logOut,
    switchAccount: () => {},
    user: null,
    ssoEnabled: false,
  };
}

function useSsoAuth(): AppAuth {
  const session = useSsoSession();
  return {
    token: SSO_SESSION_TOKEN,
    isAdmin: session.hasRole('forestar.admin'),
    isLoading: session.isLoading,
    isAuthenticated: session.isAuthenticated,
    roles: session.roles,
    hasRole: session.hasRole,
    loginAction: async () => {
      // Aucun mot de passe n'est saisi ici en mode SSO : la branche ne sert
      // qu'à honorer le type commun.
      session.login();
      return { success: true, message: "Redirection vers l'authentification" };
    },
    logOut: () => {
      void session.logout();
    },
    switchAccount: () => session.switchAccount(),
    user: session.user,
    ssoEnabled: true,
  };
}

export const useAuth: () => AppAuth = SSO_ENABLED ? useSsoAuth : useLegacyAuth;

export function AuthProvider({ children }: { children: ReactNode }) {
  if (!SSO_ENABLED) {
    return <legacy.AuthProvider>{children}</legacy.AuthProvider>;
  }
  return (
    <SsoProvider client={getSessionClient()} baseUrl={API_URL}>
      {children}
    </SsoProvider>
  );
}
