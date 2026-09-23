/**
 * Transport de l'atelier : ce que ni les types ni le lint ne prouvent.
 *
 * - en SSO, la sentinelle `token` ne devient jamais un en-tête `Authorization`,
 *   et chaque mutation — `FormData` compris — porte cookie et jeton CSRF ;
 * - en mode historique, le jeton porteur reste le seul mécanisme ;
 * - un 403 `re_auth_gg_required` renvoie vers la ré-autorisation Google.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const API = 'https://api.test.forestar.be';

const SESSION_BODY = {
  authenticated: true,
  user: {
    sub: 'sub-1',
    displayName: 'Atelier',
    email: 'atelier@forestar.be',
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

async function loadApi(mode: 'legacy' | 'oidc') {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_AUTH_MODE', mode);
  vi.stubEnv('NEXT_PUBLIC_API_URL', API);
  const session = await import('./session');
  const api = await import('./api');
  return { session, api };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

type Call = [string, RequestInit];

describe('mode SSO', () => {
  it('une mutation JSON porte le cookie et le jeton CSRF, sans Authorization', async () => {
    const fetchSpy = vi.fn(async (url: string) =>
      url.endsWith('/auth/session')
        ? jsonResponse(SESSION_BODY)
        : jsonResponse({ ok: true }),
    );
    vi.stubGlobal('fetch', fetchSpy);
    const { session, api } = await loadApi('oidc');
    await session.getSessionClient().refresh();

    await api.updateRepair(session.SSO_SESSION_TOKEN, '12', { state: 'x' });

    const [url, init] = fetchSpy.mock.calls.find(([u]) =>
      String(u).includes('/machine-repairs/12'),
    ) as unknown as Call;
    expect(url).toBe(`${API}/supervisor/machine-repairs/12`);
    const headers = init.headers as Record<string, string>;
    expect(init.credentials).toBe('include');
    expect(headers['X-CSRF-Token']).toBe('csrf-1');
    expect(headers.Authorization).toBeUndefined();
  });

  it('un envoi de photo (FormData) porte aussi le jeton CSRF et laisse le type au navigateur', async () => {
    const fetchSpy = vi.fn(async (url: string) =>
      url.endsWith('/auth/session')
        ? jsonResponse(SESSION_BODY)
        : jsonResponse({ imageUrls: [] }),
    );
    vi.stubGlobal('fetch', fetchSpy);
    const { session, api } = await loadApi('oidc');
    await session.getSessionClient().refresh();

    await api.addImage(
      session.SSO_SESSION_TOKEN,
      '12',
      new File(['x'], 'photo.webp'),
    );

    const [, init] = fetchSpy.mock.calls.find(([u]) =>
      String(u).includes('/image'),
    ) as unknown as Call;
    const headers = init.headers as Record<string, string>;
    expect(init.body).toBeInstanceOf(FormData);
    expect(headers['Content-Type']).toBeUndefined();
    expect(headers['X-CSRF-Token']).toBe('csrf-1');
    expect(headers.Authorization).toBeUndefined();
  });
});

describe('mode historique', () => {
  it('le jeton porteur reste le seul mécanisme', async () => {
    const fetchSpy = vi.fn(async () => jsonResponse([]));
    vi.stubGlobal('fetch', fetchSpy);
    const { api } = await loadApi('legacy');

    await api.fetchBrands('jeton-historique');

    const [, init] = fetchSpy.mock.calls[0] as unknown as Call;
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer jeton-historique',
    );
    expect(init.credentials).toBeUndefined();
  });
});

describe('ré-autorisation Google', () => {
  it('un 403 re_auth_gg_required renvoie vers /connection-google', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ message: 're_auth_gg_required' }, 403)),
    );
    const location = { pathname: '/calendrier', href: '' };
    vi.stubGlobal('location', location);
    Object.defineProperty(window, 'location', {
      value: location,
      configurable: true,
    });
    const { api } = await loadApi('legacy');

    await expect(api.fetchCalendars('jeton')).rejects.toThrow(
      're_auth_gg_required',
    );
    expect(location.href).toBe('/connection-google?redirect=%2Fcalendrier');
  });
});
