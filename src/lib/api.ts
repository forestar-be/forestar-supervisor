import { createApiClient, isHttpError } from '@forestar-be/core';
import type { LoginResponse } from '@forestar-be/core/auth';
import { API_URL, getSessionClient, SSO_ENABLED } from './session';
import type {
  ArchiveFilter,
  ClientSummary,
  ConfigElement,
  DolibarrBankAccount,
  InstallationPreparationText,
  MachineRepair,
  MachineRepairArchiveResult,
  MachineRepairHandoverResult,
  MachineRepairListItemFromApi,
  RelatedRepair,
  RepairForInvoice,
  ServiceInvoice,
  ServiceInvoiceItemConfig,
} from './types';

export { HttpError, isHttpError } from '@forestar-be/core';

/**
 * Transport de l'atelier : erreurs, en-têtes et session viennent de
 * `@forestar-be/core`. En mode SSO, `session` fait partir le cookie `__Host-`
 * avec chaque requête et relit le jeton CSRF à chaque mutation — y compris
 * pour les envois `FormData`, qui passent eux aussi par ce client.
 */
const client = createApiClient({
  baseUrl: API_URL,
  onTokenExpired: () => {
    if (typeof window !== 'undefined') {
      window.location.href = `/login?redirect=${window.location.pathname}`;
    }
  },
  ...(SSO_ENABLED
    ? {
        session: {
          csrfToken: () => getSessionClient().getState().csrfToken,
          onUnauthorized: () => getSessionClient().login(),
        },
      }
    : {}),
});

/**
 * Le compte Google qui tient l'agenda de l'atelier doit parfois être
 * ré-autorisé : l'API répond alors 403 `re_auth_gg_required` sur toute route
 * `/supervisor`. Ce n'est pas un problème de session utilisateur.
 */
function isGoogleReauthRequired(error: unknown): boolean {
  if (!isHttpError(error) || error.status !== 403) return false;
  const data = error.data as { message?: unknown } | undefined;
  return (
    error.message === 're_auth_gg_required' ||
    data?.message === 're_auth_gg_required'
  );
}

/**
 * Adaptateur vers la signature positionnelle des fonctions d'endpoints.
 *
 * En mode SSO, `token` vaut la sentinelle `SSO_SESSION_TOKEN` : il ne doit
 * surtout pas devenir un en-tête `Authorization`, d'où son retrait ici.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function apiRequest<T = any>(
  endpoint: string,
  method: string,
  token: string,
  body?: unknown,
  headers: HeadersInit = { 'Content-Type': 'application/json' },
  stringifyBody = true,
): Promise<T> {
  try {
    return await client.request<T>(endpoint, {
      method,
      token: SSO_ENABLED ? undefined : token || undefined,
      body,
      headers,
      stringifyBody,
    });
  } catch (error) {
    if (isGoogleReauthRequired(error) && typeof window !== 'undefined') {
      window.location.href = `/connection-google?redirect=${encodeURIComponent(
        window.location.pathname,
      )}`;
    }
    throw error;
  }
}

// ── Authentification ──

export const login = (data: {
  username: string;
  password: string;
}): Promise<LoginResponse> =>
  apiRequest('/supervisor/login', 'POST', '', data);

export const isAuthenticatedGg = (
  token: string,
): Promise<{ isAuthenticated: boolean }> =>
  apiRequest('/auth-google/is-authenticated', 'GET', token);

export const getAuthUrlGg = (
  token: string,
  redirectUrl: string,
): Promise<{ url: string; email: string }> =>
  apiRequest(`/auth-google/url?redirect=${redirectUrl}`, 'GET', token);

// ── Réparations ──

/**
 * Liste des fiches. `archived` pilote le filtre d'archivage côté serveur
 * (`active` par défaut si omis) : « active », « archived » ou « all ».
 */
export const getAllMachineRepairs = async (
  token: string,
  archived?: ArchiveFilter,
): Promise<MachineRepairListItemFromApi[]> => {
  const response = await apiRequest<{ data: MachineRepairListItemFromApi[] }>(
    '/supervisor/machine-repairs',
    'POST',
    token,
    { filter: {}, ...(archived ? { archived } : {}) },
  );
  return response.data;
};

export const fetchRepairById = (id: string, token: string) =>
  apiRequest(`/supervisor/machine-repairs/${id}`, 'GET', token);

export const updateRepair = (token: string, id: string, data: unknown) =>
  apiRequest(`/supervisor/machine-repairs/${id}`, 'PATCH', token, data);

/** Suppression définitive : `confirm` doit valoir le numéro de la fiche. */
export const deleteRepair = (token: string, id: string) =>
  apiRequest(
    `/supervisor/machine-repairs/${id}?confirm=${encodeURIComponent(id)}`,
    'DELETE',
    token,
  );

/** « Archiver sans sortie » (R003) : archive puis envoie le PDF (D-02, D-03). */
export const archiveRepair = (
  token: string,
  id: string,
): Promise<MachineRepairHandoverResult> =>
  apiRequest(`/supervisor/machine-repairs/${id}/archive`, 'POST', token);

export const unarchiveRepair = (
  token: string,
  id: string,
): Promise<MachineRepairArchiveResult> =>
  apiRequest(`/supervisor/machine-repairs/${id}/unarchive`, 'POST', token);

/**
 * « Machine rendue au client » (R003) : pose la date de sortie (le jour
 * choisi, `AAAA-MM-JJ`) et archive la fiche en une seule écriture serveur,
 * sans toucher à son état, puis envoie le PDF (D-02, D-03).
 */
export const handOverRepair = (
  token: string,
  id: number | string,
  exitDate: string,
): Promise<MachineRepairHandoverResult> =>
  apiRequest(`/supervisor/machine-repairs/${id}/handover`, 'POST', token, {
    exitDate,
  });

/** R003 — passages précédents du même client (téléphone, nom, code robot). */
export const getRelatedRepairs = (
  token: string,
  id: number | string,
): Promise<RelatedRepair[]> =>
  apiRequest(`/supervisor/machine-repairs/${id}/related`, 'GET', token);

/**
 * R002-S05 — PDF complet de la fiche, généré par le serveur. `@forestar-be/core`
 * ne sait exposer ni JSON ni texte pour `application/pdf` : `parseBody` se
 * rabat sur `response.blob()`, d'où le type de retour.
 */
export const getRepairPdf = (
  token: string,
  id: number | string,
): Promise<Blob> => apiRequest(`/supervisor/machine-repairs/${id}/pdf`, 'GET', token);

/** R002-S05 — envoie le PDF généré par le serveur à l'email de la fiche. */
export const sendRepairEmail = (
  token: string,
  id: number | string,
): Promise<{ message: string }> =>
  apiRequest(`/supervisor/machine-repairs/${id}/email`, 'POST', token);

/**
 * R002-S05 — « Envoyer sur Dropbox » (ex-« Sauvegarder Google Drive ») :
 * envoie le PDF généré par le serveur sur Dropbox, écrase l'envoi précédent.
 */
export const sendRepairToDropbox = (
  token: string,
  id: number | string,
): Promise<{ dropbox_pdf_path: string; dropbox_pdf_uploaded_at: string }> =>
  apiRequest(`/supervisor/machine-repairs/${id}/dropbox`, 'POST', token);

export const addImage = (token: string, id: string, file: File) => {
  const formData = new FormData();
  formData.append('image', file);
  return apiRequest(
    `/supervisor/machine-repairs/${id}/image`,
    'PUT',
    token,
    formData,
    {},
    false,
  );
};

export const deleteImage = (token: string, id: string, imageIndex: number) =>
  apiRequest(
    `/supervisor/machine-repairs/${id}/image/${imageIndex}`,
    'DELETE',
    token,
  );

/**
 * R004-S04 — HTML des deux tickets 80 mm (D-11 : un seul gabarit, côté
 * serveur). `client.request` renvoie déjà du texte pour `text/html`
 * (`parseBody`) : pas de `.json()` à appeler ici.
 */
export const getRepairTicketHtml = (
  token: string,
  id: number | string,
): Promise<string> =>
  apiRequest(`/supervisor/machine-repairs/${id}/ticket`, 'GET', token);

// ── Clients (R007-S04, R009) ──

/** `/clients` (AC-01) et « Changer de client » (AC-06) : recherche, sans requête = tous. */
export const searchClients = (
  token: string,
  q = '',
): Promise<ClientSummary[]> =>
  apiRequest(
    `/supervisor/clients${q ? `?q=${encodeURIComponent(q)}` : ''}`,
    'GET',
    token,
  );

// ── Référentiels ──

export const fetchReplacedParts = (token: string) =>
  apiRequest('/supervisor/replaced-parts', 'GET', token);

export const deleteReplacedPart = (token: string, name: string) =>
  apiRequest(`/supervisor/replaced-parts/${name}`, 'DELETE', token);

export const putReplacedParts = (
  token: string,
  data: { name: string; price: number }[],
) => apiRequest('/supervisor/replaced-parts', 'PUT', token, data);

export const fetchRepairers = (token: string) =>
  apiRequest('/supervisor/repairer_names', 'GET', token);

export const addRepairer = (token: string, repairer: string) =>
  apiRequest('/supervisor/repairer_names', 'PUT', token, { name: repairer });

export const deleteRepairer = (token: string, repairer: string) =>
  apiRequest(`/supervisor/repairer_names/${repairer}`, 'DELETE', token);

export const fetchBrands = (token: string) =>
  apiRequest('/supervisor/brands', 'GET', token);

export const addBrand = (token: string, brand: string) =>
  apiRequest('/supervisor/brands', 'PUT', token, { name: brand });

export const deleteBrand = (token: string, brand: string) =>
  apiRequest(`/supervisor/brands/${brand}`, 'DELETE', token);

export const fetchMachineType = (token: string) =>
  apiRequest('/supervisor/machine_types', 'GET', token);

export const addMachineType = (token: string, machineType: string) =>
  apiRequest('/supervisor/machine_types', 'PUT', token, { name: machineType });

export const deleteMachineType = (token: string, machineType: string) =>
  apiRequest(`/supervisor/machine_types/${machineType}`, 'DELETE', token);

export const fetchRobotTypes = (token: string) =>
  apiRequest('/supervisor/robot-types', 'GET', token);

export const addRobotType = (token: string, type: string) =>
  apiRequest('/supervisor/robot-types', 'PUT', token, { name: type });

export const deleteRobotType = (token: string, type: string) =>
  apiRequest(`/supervisor/robot-types/${type}`, 'DELETE', token);

// ── Configuration ──

export const fetchConfig = (token: string) =>
  apiRequest('/supervisor/config', 'GET', token);

export const addConfig = (token: string, config: ConfigElement) =>
  apiRequest('/supervisor/config', 'PUT', token, config);

export const deleteConfig = (token: string, key: string) =>
  apiRequest(`/supervisor/config/${key}`, 'DELETE', token);

export const updateConfig = (token: string, configToUpdate: ConfigElement) =>
  apiRequest(
    `/supervisor/config/${configToUpdate.key}`,
    'PATCH',
    token,
    configToUpdate,
  );

export const fetchAllConfig = (token: string) =>
  apiRequest('/supervisor/allConfig', 'GET', token);

// ── Rappels téléphoniques ──

export interface PhoneCallback {
  id: number;
  phoneNumber: string;
  clientName: string;
  reason: string;
  description: string;
  responsiblePerson: string;
  createdAt: string;
  completed: boolean;
  eventId?: string;
}

export interface PhoneCallbackFormData {
  phoneNumber: string;
  clientName: string;
  reason: string;
  description: string;
  responsiblePerson: string;
}

export const fetchAllPhoneCallbacks = (
  token: string,
): Promise<{ data: PhoneCallback[] }> =>
  apiRequest('/supervisor/phone-callbacks/all', 'GET', token);

export const createPhoneCallback = (
  token: string,
  callbackData: PhoneCallbackFormData,
): Promise<PhoneCallback> =>
  apiRequest('/supervisor/phone-callbacks', 'POST', token, callbackData);

export const updatePhoneCallback = (
  token: string,
  id: number,
  callbackData: PhoneCallbackFormData,
): Promise<PhoneCallback> =>
  apiRequest(`/supervisor/phone-callbacks/${id}`, 'PUT', token, callbackData);

export const deletePhoneCallback = (token: string, id: number): Promise<void> =>
  apiRequest(`/supervisor/phone-callbacks/${id}`, 'DELETE', token);

export const togglePhoneCallbackStatus = (
  token: string,
  callback: PhoneCallback,
): Promise<PhoneCallback> =>
  apiRequest(`/supervisor/phone-callbacks/${callback.id}`, 'PUT', token, {
    ...callback,
    completed: !callback.completed,
  });

// ── Textes de préparation d'installation ──

export const fetchAllInstallationTexts = (
  token: string,
): Promise<InstallationPreparationText[]> =>
  apiRequest('/supervisor/installation-preparation-texts', 'GET', token);

export const createInstallationText = (
  token: string,
  data: { content: string; type: string; order: number },
): Promise<InstallationPreparationText> =>
  apiRequest('/supervisor/installation-preparation-texts', 'POST', token, data);

export const updateInstallationText = (
  token: string,
  id: number,
  updates: { content?: string; type?: string; order?: number },
): Promise<InstallationPreparationText> =>
  apiRequest(
    `/supervisor/installation-preparation-texts/${id}`,
    'PATCH',
    token,
    updates,
  );

export const deleteInstallationText = (
  token: string,
  id: number,
): Promise<void> =>
  apiRequest(
    `/supervisor/installation-preparation-texts/${id}`,
    'DELETE',
    token,
  );

export const reorderInstallationTexts = (
  token: string,
  textIds: number[],
): Promise<InstallationPreparationText[]> =>
  apiRequest(
    '/supervisor/installation-preparation-texts/reorder',
    'POST',
    token,
    { textIds },
  );

// ── Agenda Google ──

export interface Calendar {
  id: string;
  name: string;
  color: string;
}

export interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  location?: string;
}

export const fetchCalendars = (token: string): Promise<Calendar[]> =>
  apiRequest('/supervisor/calendars', 'GET', token);

export const fetchCalendarEvents = (
  token: string,
  calendarIds: string[],
  date: string,
): Promise<CalendarEvent[]> =>
  apiRequest(
    `/supervisor/calendar-events?calendarIds=${calendarIds.join(',')}&date=${date}`,
    'GET',
    token,
  );

export interface CreateRepairCalendarEventRequest {
  repairId: number;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  isFullDay: boolean;
}

export interface RepairCalendarEventResponse {
  success: boolean;
  eventId: string;
  repair?: MachineRepair;
  message?: string;
}

export const createRepairCalendarEvent = (
  token: string,
  eventData: CreateRepairCalendarEventRequest,
): Promise<RepairCalendarEventResponse> =>
  apiRequest('/supervisor/repair-calendar-event', 'POST', token, eventData);

// ── Factures de service ──

export const getServiceInvoices = (
  token: string,
  params?: { status?: string; type?: string; search?: string },
): Promise<ServiceInvoice[]> => {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.type) searchParams.set('type', params.type);
  if (params?.search) searchParams.set('search', params.search);
  const qs = searchParams.toString();
  return apiRequest(
    `/supervisor/service-invoices${qs ? `?${qs}` : ''}`,
    'GET',
    token,
  );
};

export const getServiceInvoice = (
  token: string,
  id: number,
): Promise<ServiceInvoice> =>
  apiRequest(`/supervisor/service-invoices/${id}`, 'GET', token);

export const createServiceInvoice = (
  token: string,
  data: unknown,
): Promise<ServiceInvoice> =>
  apiRequest('/supervisor/service-invoices', 'POST', token, data);

export const updateServiceInvoice = (
  token: string,
  id: number,
  data: unknown,
): Promise<ServiceInvoice> =>
  apiRequest(`/supervisor/service-invoices/${id}`, 'PUT', token, data);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const deleteServiceInvoice = (token: string, id: number): Promise<any> =>
  apiRequest(`/supervisor/service-invoices/${id}`, 'DELETE', token);

export const sendServiceInvoice = (
  token: string,
  id: number,
  body?: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> =>
  apiRequest(`/supervisor/service-invoices/${id}/send`, 'POST', token, body);

export const markServiceInvoicePaid = (
  token: string,
  id: number,
): Promise<ServiceInvoice> =>
  apiRequest(`/supervisor/service-invoices/${id}/mark-paid`, 'PUT', token);

export const markServiceInvoiceSent = (
  token: string,
  id: number,
): Promise<ServiceInvoice> =>
  apiRequest(`/supervisor/service-invoices/${id}/mark-sent`, 'PUT', token);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const resyncServiceInvoice = (token: string, id: number): Promise<any> =>
  apiRequest(`/supervisor/service-invoices/${id}/resync`, 'POST', token);

export const getServiceInvoicePdf = (token: string, id: number): Promise<Blob> =>
  apiRequest(`/supervisor/service-invoices/${id}/pdf`, 'GET', token);

export const getServiceInvoiceDeletionInfo = (
  token: string,
  id: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> =>
  apiRequest(`/supervisor/service-invoices/${id}/deletion-info`, 'GET', token);

export const getInvoiceItemConfigs = (
  token: string,
  params?: { category?: string; all?: boolean },
): Promise<ServiceInvoiceItemConfig[]> => {
  const p = new URLSearchParams();
  if (params?.category) p.set('category', params.category);
  if (params?.all) p.set('all', 'true');
  const qs = p.toString() ? `?${p.toString()}` : '';
  return apiRequest(
    `/supervisor/service-invoices/item-configs${qs}`,
    'GET',
    token,
  );
};

export const createInvoiceItemConfig = (
  token: string,
  data: unknown,
): Promise<ServiceInvoiceItemConfig> =>
  apiRequest('/supervisor/service-invoices/item-configs', 'POST', token, data);

export const updateInvoiceItemConfig = (
  token: string,
  id: number,
  data: unknown,
): Promise<ServiceInvoiceItemConfig> =>
  apiRequest(
    `/supervisor/service-invoices/item-configs/${id}`,
    'PUT',
    token,
    data,
  );

export const deleteInvoiceItemConfig = (
  token: string,
  id: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> =>
  apiRequest(
    `/supervisor/service-invoices/item-configs/${id}`,
    'DELETE',
    token,
  );

export const getDolibarrBankAccounts = (
  token: string,
): Promise<{
  accounts: DolibarrBankAccount[];
  selectedAccounts: Record<string, number | null>;
}> =>
  apiRequest(
    '/supervisor/service-invoices/dolibarr-bank-accounts',
    'GET',
    token,
  );

export const setDolibarrBankAccount = (
  token: string,
  data: { accountId: number; paymentMethod: string },
): Promise<unknown> =>
  apiRequest(
    '/supervisor/service-invoices/dolibarr-bank-account',
    'PUT',
    token,
    data,
  );

export const searchRepairsForInvoice = (
  token: string,
  q: string,
): Promise<RepairForInvoice[]> =>
  apiRequest(
    `/supervisor/service-invoices/repairs/search?q=${encodeURIComponent(q)}`,
    'GET',
    token,
  );
