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

describe('archivage (R001)', () => {
  it('getAllMachineRepairs ne transmet `archived` que lorsqu\'il est fourni', async () => {
    const fetchSpy = vi.fn(async () => jsonResponse({ data: [] }));
    vi.stubGlobal('fetch', fetchSpy);
    const { api } = await loadApi('legacy');

    await api.getAllMachineRepairs('jeton');
    const [, initSansFiltre] = fetchSpy.mock.calls[0] as unknown as Call;
    expect(JSON.parse(initSansFiltre.body as string)).toEqual({ filter: {} });

    await api.getAllMachineRepairs('jeton', 'archived');
    const [, initAvecFiltre] = fetchSpy.mock.calls[1] as unknown as Call;
    expect(JSON.parse(initAvecFiltre.body as string)).toEqual({
      filter: {},
      archived: 'archived',
    });
  });

  it('deleteRepair envoie `confirm` égal au numéro de la fiche', async () => {
    const fetchSpy = vi.fn(async () => jsonResponse({ message: 'Succès.' }));
    vi.stubGlobal('fetch', fetchSpy);
    const { api } = await loadApi('legacy');

    await api.deleteRepair('jeton', '1663');

    const [url, init] = fetchSpy.mock.calls[0] as unknown as Call;
    expect(url).toBe(
      `${API}/supervisor/machine-repairs/1663?confirm=1663`,
    );
    expect(init.method).toBe('DELETE');
  });

  it('archiveRepair et unarchiveRepair appellent les bonnes routes en POST', async () => {
    const fetchSpy = vi.fn(async () =>
      jsonResponse({ id: 12, archived_at: '2026-09-24T10:00:00.000Z' }),
    );
    vi.stubGlobal('fetch', fetchSpy);
    const { api } = await loadApi('legacy');

    await api.archiveRepair('jeton', '12');
    const [archiveUrl, archiveInit] = fetchSpy.mock
      .calls[0] as unknown as Call;
    expect(archiveUrl).toBe(`${API}/supervisor/machine-repairs/12/archive`);
    expect(archiveInit.method).toBe('POST');

    await api.unarchiveRepair('jeton', '12');
    const [unarchiveUrl, unarchiveInit] = fetchSpy.mock
      .calls[1] as unknown as Call;
    expect(unarchiveUrl).toBe(
      `${API}/supervisor/machine-repairs/12/unarchive`,
    );
    expect(unarchiveInit.method).toBe('POST');
  });
});

/** Réponse `application/pdf` : `parseBody` de `@forestar-be/core` se rabat sur `response.blob()`. */
function pdfResponse(): Response {
  return new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]), {
    status: 200,
    headers: { 'content-type': 'application/pdf' },
  });
}

describe('PDF du serveur et Dropbox (R002-S05)', () => {
  it('getRepairPdf appelle GET .../pdf et renvoie un Blob', async () => {
    const fetchSpy = vi.fn(async () => pdfResponse());
    vi.stubGlobal('fetch', fetchSpy);
    const { api } = await loadApi('legacy');

    const blob = await api.getRepairPdf('jeton', '12');

    const [url, init] = fetchSpy.mock.calls[0] as unknown as Call;
    expect(url).toBe(`${API}/supervisor/machine-repairs/12/pdf`);
    expect(init.method).toBe('GET');
    // `Blob` de jsdom et celui du `fetch` global de Node ne sont pas la même
    // classe : on vérifie la forme plutôt que `toBeInstanceOf(Blob)`.
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBe(4);
  });

  it('sendRepairEmail appelle POST .../email sans corps', async () => {
    const fetchSpy = vi.fn(async () =>
      jsonResponse({ message: 'Email envoyé avec succès.' }),
    );
    vi.stubGlobal('fetch', fetchSpy);
    const { api } = await loadApi('legacy');

    const result = await api.sendRepairEmail('jeton', '12');

    const [url, init] = fetchSpy.mock.calls[0] as unknown as Call;
    expect(url).toBe(`${API}/supervisor/machine-repairs/12/email`);
    expect(init.method).toBe('POST');
    expect(result).toEqual({ message: 'Email envoyé avec succès.' });
  });

  it('sendRepairToDropbox appelle POST .../dropbox et renvoie le chemin et la date', async () => {
    const fetchSpy = vi.fn(async () =>
      jsonResponse({
        dropbox_pdf_path: '/dev-local/Fiches atelier/2026/x.pdf',
        dropbox_pdf_uploaded_at: '2026-09-24T10:00:00.000Z',
      }),
    );
    vi.stubGlobal('fetch', fetchSpy);
    const { api } = await loadApi('legacy');

    const result = await api.sendRepairToDropbox('jeton', '12');

    const [url, init] = fetchSpy.mock.calls[0] as unknown as Call;
    expect(url).toBe(`${API}/supervisor/machine-repairs/12/dropbox`);
    expect(init.method).toBe('POST');
    expect(result.dropbox_pdf_path).toBe(
      '/dev-local/Fiches atelier/2026/x.pdf',
    );
  });

  it("n'expose plus les anciennes routes Drive et email (retirées R002-S05)", async () => {
    const { api } = await loadApi('legacy');
    expect(
      (api as unknown as Record<string, unknown>).sendDriveApi,
    ).toBeUndefined();
    expect(
      (api as unknown as Record<string, unknown>).sendEmailApi,
    ).toBeUndefined();
  });
});

describe('remise et passages (R003-S05)', () => {
  it('handOverRepair envoie `exitDate` en POST .../handover', async () => {
    const fetchSpy = vi.fn(async () =>
      jsonResponse({
        id: 39,
        archived_at: '2026-09-24T10:00:00.000Z',
        entry_date: '2026-09-21T07:30:00.000Z',
        exit_date: '2026-09-24T10:00:00.000Z',
        dropbox_pdf_path: '/dev-local/Fiches atelier/2026/x.pdf',
        dropbox_pdf_uploaded_at: '2026-09-24T10:00:00.000Z',
        pdf: {
          uploaded: true,
          dropbox_pdf_path: '/dev-local/Fiches atelier/2026/x.pdf',
          dropbox_pdf_uploaded_at: '2026-09-24T10:00:00.000Z',
        },
      }),
    );
    vi.stubGlobal('fetch', fetchSpy);
    const { api } = await loadApi('legacy');

    const result = await api.handOverRepair('jeton', '39', '2026-09-24');

    const [url, init] = fetchSpy.mock.calls[0] as unknown as Call;
    expect(url).toBe(`${API}/supervisor/machine-repairs/39/handover`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      exitDate: '2026-09-24',
    });
    expect(result.pdf.uploaded).toBe(true);
  });

  it('getRelatedRepairs appelle GET .../related', async () => {
    const fetchSpy = vi.fn(async () => jsonResponse([]));
    vi.stubGlobal('fetch', fetchSpy);
    const { api } = await loadApi('legacy');

    await api.getRelatedRepairs('jeton', '39');

    const [url, init] = fetchSpy.mock.calls[0] as unknown as Call;
    expect(url).toBe(`${API}/supervisor/machine-repairs/39/related`);
    expect(init.method).toBe('GET');
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
