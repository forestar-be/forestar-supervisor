/**
 * Le choix du chemin d'authentification a lieu au chargement du module.
 *
 * C'est la propriété que ni les types ni le lint ne couvrent : `useAuth` est
 * une référence fixée une fois pour toutes, et se tromper de sens ferait
 * cohabiter les deux systèmes — exactement ce que C-06 interdit.
 *
 * Chaque cas recharge donc réellement les modules avec l'environnement voulu.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { SSO_SESSION_TOKEN } from './session';

const API = 'https://api.test.forestar.be';

const SESSION_BODY = {
  authenticated: true,
  user: {
    sub: 'sub-1',
    displayName: 'Charles',
    email: 'charles@forestar.be',
    roles: ['forestar.supervisor'],
  },
  csrfToken: 'csrf-1',
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function loadAuth(mode: 'legacy' | 'oidc') {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_AUTH_MODE', mode);
  vi.stubEnv('NEXT_PUBLIC_API_URL', API);
  return import('./auth');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('mode historique', () => {
  it("n'ouvre aucune session serveur et garde le jeton local", async () => {
    const fetchSpy = vi.fn(async () => jsonResponse({}));
    vi.stubGlobal('fetch', fetchSpy);

    const { useAuth, AuthProvider } = await loadAuth('legacy');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.ssoEnabled).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    // Aucune lecture de /auth/session : le socle serveur reste dormant.
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('mode SSO', () => {
  it('lit /auth/session avec le cookie et expose les rôles du contrat', async () => {
    const fetchSpy = vi.fn(async () => jsonResponse(SESSION_BODY));
    vi.stubGlobal('fetch', fetchSpy);

    const { useAuth, AuthProvider } = await loadAuth('oidc');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    const [url, init] = fetchSpy.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe(`${API}/auth/session`);
    expect(init.credentials).toBe('include');

    expect(result.current.ssoEnabled).toBe(true);
    expect(result.current.hasRole('forestar.supervisor')).toBe(true);
    expect(result.current.hasRole('forestar.operator')).toBe(false);
    expect(result.current.isAdmin).toBe(false);
    // AC-03 : aucun jeton ne parvient au navigateur.
    //
    // `token` n'est pas vide, et c'est délibéré depuis le 2026-09-06 : le code
    // hérité s'en sert comme synonyme de « connecté » à 134 endroits, et une
    // chaîne vide faisait rendre `null` à `AppShell`, donc une page blanche.
    // Ce qui compte n'est pas que la valeur soit vide, c'est qu'elle ne soit
    // pas un secret et qu'elle ne devienne jamais un en-tête `Authorization` —
    // les deux assertions ci-dessous, et celle du test de mutation plus bas.
    expect(result.current.token).toBe(SSO_SESSION_TOKEN);
    expect(result.current.token).not.toMatch(/^ey/);
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('un compte admin est reconnu comme tel', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          ...SESSION_BODY,
          user: { ...SESSION_BODY.user, roles: ['forestar.admin'] },
        }),
      ),
    );

    const { useAuth, AuthProvider } = await loadAuth('oidc');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(result.current.isAdmin).toBe(true);
  });

  it("une session absente laisse l'application anonyme, sans erreur", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ authenticated: false })),
    );

    const { useAuth, AuthProvider } = await loadAuth('oidc');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.roles).toEqual([]);
  });
});
