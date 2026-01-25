import { ConfigElement } from '../components/settings/EditConfig';
import {
  InventoryPlan,
  InventorySummary,
  PurchaseOrder,
  RobotInventory,
  InstallationPreparationText,
  MachineRepair,
} from './types';

export const API_URL = process.env.REACT_APP_API_URL;

export class HttpError extends Error {
  constructor(
    public message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'HttpError';

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const isHttpError = (error: any): error is HttpError => {
  return error && error.name === 'HttpError';
};

const apiRequest = async (
  endpoint: string,
  method: string,
  token: string,
  body?: any,
  additionalHeaders: HeadersInit = { 'Content-Type': 'application/json' },
  stringifyBody: boolean = true,
) => {
  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
    ...additionalHeaders,
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = stringifyBody ? JSON.stringify(body) : body;
  }

  const response: Response = await fetch(`${API_URL}${endpoint}`, options);

  let data;

  try {
    // Check if the response is a binary type
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else if (contentType && contentType.includes('text/html')) {
      data = await response.text();
    } else {
      data = await response.blob();
    }
  } catch (error) {
    console.warn('Error parsing response', response, error);
  }

  if (
    response.status === 403 &&
    data?.message &&
    data?.message === 'jwt expired'
  ) {
    window.location.href = `/login?redirect=${window.location.pathname}`;
  }

  if (
    response.status === 403 &&
    data?.message &&
    data?.message === 're_auth_gg_required'
  ) {
    window.location.href = `/connection-google?redirect=${window.location.pathname}`;
  }

  if (!response.ok) {
    console.error(`${response.statusText} ${response.status}`, data);
    if (typeof data === 'string' && data) {
      throw new HttpError(data, response.status);
    }
    throw new HttpError(
      data?.message || `${response.statusText} ${response.status}`,
      response.status,
    );
  }

  return data;
};

export const login = async (data: any) => {
  return apiRequest('/supervisor/login', 'POST', '', data);
};

export const getAllMachineRepairs = async (token: string) => {
  const response = await apiRequest(
    '/supervisor/machine-repairs',
    'POST',
    token,
    {
      filter: {},
    },
  );
  return response.data;
};

export const fetchRepairById = (id: string, token: string) =>
  apiRequest(`/supervisor/machine-repairs/${id}`, 'GET', token);

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

export const updateRepair = (token: string, id: string, data: any) =>
  apiRequest(`/supervisor/machine-repairs/${id}`, 'PATCH', token, data);

export const fetchUsers = (token: string) =>
  apiRequest('/admin/users', 'GET', token);

export const addUser = (token: string, user: any) =>
  apiRequest('/admin/users', 'PUT', token, user);

export const updateUser = (token: string, id: string, user: any) =>
  apiRequest(`/admin/users/${id}`, 'PATCH', token, user);

export const deleteUser = (token: string, id: string) =>
  apiRequest(`/admin/users/${id}`, 'DELETE', token);

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

export const deleteRepair = (token: string, id: string) =>
  apiRequest(`/supervisor/machine-repairs/${id}`, 'DELETE', token);

export const sendEmailApi = (
  token: string,
  id: number | string,
  data: FormData,
) =>
  apiRequest(
    `/supervisor/machine-repairs/email/${id}`,
    'PUT',
    token,
    data,
    {},
    false,
  );

export const sendDriveApi = (
  token: string,
  id: number | string,
  data: FormData,
) =>
  apiRequest(
    `/supervisor/machine-repairs/drive/${id}`,
    'PUT',
    token,
    data,
    {},
    false,
  );

export const fetchConfig = (token: string) =>
  apiRequest('/supervisor/config', 'GET', token);

export const addConfig = (
  token: string,
  config: { key: string; value: string },
) => apiRequest('/supervisor/config', 'PUT', token, config);

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

export const addImage = async (token: string, id: string, file: File) => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(
    `${API_URL}/supervisor/machine-repairs/${id}/image`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    },
  );

  if (!response.ok) {
    throw new Error(`${response.statusText} ${response.status}`);
  }

  return await response.json();
};

export const deleteImage = (token: string, id: string, imageIndex: number) =>
  apiRequest(
    `/supervisor/machine-repairs/${id}/image/${imageIndex}`,
    'DELETE',
    token,
  );

export const fetchRobotTypes = (token: string) =>
  apiRequest('/supervisor/robot-types', 'GET', token);

export const addRobotType = (token: string, type: string) =>
  apiRequest('/supervisor/robot-types', 'PUT', token, { name: type });

export const deleteRobotType = (token: string, type: string) =>
  apiRequest(`/supervisor/robot-types/${type}`, 'DELETE', token);

// Types pour les rappels téléphoniques
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

export interface PhoneCallbacksResponse {
  data: PhoneCallback[];
  pagination: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    itemsPerPage: number;
  };
}

// Fonctions API pour les rappels téléphoniques
export const fetchPhoneCallbacks = (
  token: string,
  page: number,
  itemsPerPage: number,
  completed?: boolean,
  sortBy: string = 'createdAt',
  sortOrder: string = 'desc',
): Promise<PhoneCallbacksResponse> => {
  let endpoint = `/supervisor/phone-callbacks?page=${page}&itemsPerPage=${itemsPerPage}&sortBy=${sortBy}&sortOrder=${sortOrder}`;

  if (completed !== undefined) {
    endpoint += `&completed=${completed}`;
  }

  return apiRequest(endpoint, 'GET', token);
};

// New function to fetch all callbacks without pagination or filters
export const fetchAllPhoneCallbacks = (
  token: string,
): Promise<{ data: PhoneCallback[] }> => {
  return apiRequest('/supervisor/phone-callbacks/all', 'GET', token);
};

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
): Promise<PhoneCallback> => {
  const updatedCallback = { ...callback, completed: !callback.completed };
  return apiRequest(
    `/supervisor/phone-callbacks/${callback.id}`,
    'PUT',
    token,
    updatedCallback,
  );
};

// Robot Inventory API functions
export const fetchRobotInventory = (
  token: string,
): Promise<{ data: RobotInventory[] }> =>
  apiRequest('/supervisor/robot-inventory', 'GET', token);

export const createRobotInventory = (
  token: string,
  robotData: Partial<RobotInventory>,
): Promise<RobotInventory> =>
  apiRequest('/supervisor/robot-inventory', 'POST', token, robotData);

export const fetchRobotInventoryById = (
  token: string,
  id: number,
): Promise<RobotInventory> =>
  apiRequest(`/supervisor/robot-inventory/${id}`, 'GET', token);

export const updateRobotInventory = (
  token: string,
  id: number,
  robotData: Partial<RobotInventory>,
): Promise<RobotInventory> =>
  apiRequest(`/supervisor/robot-inventory/${id}`, 'PUT', token, robotData);

export const deleteRobotInventory = (
  token: string,
  id: number,
): Promise<void> =>
  apiRequest(`/supervisor/robot-inventory/${id}`, 'DELETE', token);

// Upload robot catalog image
export const uploadRobotImage = async (
  token: string,
  id: number,
  file: File,
): Promise<{ message: string; robot: RobotInventory; imageUrl: string }> => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(
    `${API_URL}/supervisor/robot-inventory/${id}/image`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new HttpError(
      error.message || `${response.statusText} ${response.status}`,
      response.status,
    );
  }

  return await response.json();
};

// Delete robot catalog image
export const deleteRobotImage = (
  token: string,
  id: number,
): Promise<{ message: string; robot: RobotInventory }> =>
  apiRequest(`/supervisor/robot-inventory/${id}/image`, 'DELETE', token);

export const fetchInventoryPlans = (
  token: string,
  year?: number,
  month?: number,
): Promise<{ data: InventoryPlan[] }> => {
  let endpoint = '/supervisor/inventory-plans';

  if (year || month) {
    endpoint += '?';
    if (year) endpoint += `year=${year}`;
    if (year && month) endpoint += '&';
    if (month) endpoint += `month=${month}`;
  }

  return apiRequest(endpoint, 'GET', token);
};

export const fetchInventorySummary = (
  token: string,
): Promise<InventorySummary> =>
  apiRequest('/supervisor/inventory-summary', 'GET', token);

export const createOrUpdateInventoryPlan = (
  token: string,
  planData: Partial<InventoryPlan>,
): Promise<InventoryPlan> =>
  apiRequest('/supervisor/inventory-plans', 'POST', token, planData);

export const deleteInventoryPlan = (token: string, id: number): Promise<void> =>
  apiRequest(`/supervisor/inventory-plans/${id}`, 'DELETE', token);

export const updateInventoryPlans = (
  token: string,
  plans: Partial<InventoryPlan>[],
): Promise<{ message: string; count: number }> =>
  apiRequest('/supervisor/inventory-plans/batch', 'POST', token, { plans });

// Client endpoints pour la signature des devis
export const fetchClientDevis = (
  token: string,
  id: string,
): Promise<{
  purchaseOrder: PurchaseOrder;
  installationPreparationTexts: InstallationPreparationText[];
}> =>
  apiRequest(`/client/purchase-orders/devis/signature?id=${id}`, 'GET', token);

export const getClientDevisPdf = (token: string, id: string): Promise<Blob> =>
  apiRequest(
    `/client/purchase-orders/devis/signature/pdf?id=${id}`,
    'GET',
    token,
  );

export const updateClientDevisStatus = async (
  token: string,
  id: string,
  statusData: {
    devis?: boolean;
    clientSignature?: string;
  },
): Promise<PurchaseOrder> => {
  const formData = new FormData();

  if (statusData.devis !== undefined) {
    formData.append('devis', statusData.devis.toString());
  }

  if (statusData.clientSignature) {
    formData.append('clientSignature', statusData.clientSignature);
  }

  return apiRequest(
    `/client/purchase-orders/devis/signature/status?id=${id}`,
    'PATCH',
    token,
    formData,
    {},
    false,
  );
};

export const fetchPurchaseOrders = (
  token: string,
): Promise<{ data: PurchaseOrder[] }> =>
  apiRequest('/supervisor/purchase-orders', 'GET', token);

export const fetchPurchaseOrderById = (
  token: string,
  id: number,
): Promise<PurchaseOrder> =>
  apiRequest(`/supervisor/purchase-orders/${id}`, 'GET', token);

export const createPurchaseOrder = async (
  token: string,
  formData: FormData,
): Promise<PurchaseOrder> => {
  return apiRequest(
    '/supervisor/purchase-orders',
    'POST',
    token,
    formData,
    {}, // No content-type header, browser will set it with boundary
    false, // Don't stringify the body
  );
};

export const updatePurchaseOrder = (
  token: string,
  id: number,
  formData: FormData,
): Promise<PurchaseOrder> => {
  return apiRequest(
    `/supervisor/purchase-orders/${id}`,
    'PUT',
    token,
    formData,
    {}, // No content-type header, browser will set it with boundary
    false, // Don't stringify the body
  );
};

export const updatePurchaseOrderStatus = async (
  token: string,
  id: number,
  statusData: {
    hasAppointment?: boolean;
    isInstalled?: boolean;
    isInvoiced?: boolean;
    devis?: boolean;
    clientSignature?: string;
  },
): Promise<PurchaseOrder> => {
  try {
    const formData = new FormData();

    // Add status data as JSON
    formData.append(
      'hasAppointment',
      statusData.hasAppointment?.toString() || '',
    );
    formData.append('isInstalled', statusData.isInstalled?.toString() || '');
    formData.append('isInvoiced', statusData.isInvoiced?.toString() || '');
    formData.append('devis', statusData.devis?.toString() || '');

    // Add client signature if provided
    if (statusData.clientSignature) {
      formData.append('clientSignature', statusData.clientSignature);
    }

    const response = await fetch(
      `${API_URL}/supervisor/purchase-orders/${id}/status`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to update purchase order status: ${response.status}`,
      );
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating purchase order status:', error);
    throw error;
  }
};

export const deletePurchaseOrder = (token: string, id: number): Promise<void> =>
  apiRequest(`/supervisor/purchase-orders/${id}`, 'DELETE', token);

export const getPurchaseOrderPdf = (token: string, id: number): Promise<Blob> =>
  apiRequest(`/supervisor/purchase-orders/${id}/pdf`, 'GET', token);

// Function to get the invoice PDF
export const getPurchaseOrderInvoice = (
  token: string,
  id: number,
): Promise<Blob> =>
  apiRequest(`/supervisor/purchase-orders/${id}/invoice`, 'GET', token);

// Function to get a photo by index
export const getPurchaseOrderPhoto = (
  token: string,
  id: number,
  photoIndex: number,
  isClientMode = false,
): Promise<Blob> =>
  apiRequest(
    !isClientMode
      ? `/supervisor/purchase-orders/${id}/photo/${photoIndex}`
      : `/client/purchase-orders/devis/signature/photo/${photoIndex}?id=${id}`,
    'GET',
    token,
  );

// Function to send devis signature email
export const sendDevisSignatureEmail = (
  token: string,
  id: number,
): Promise<{ message: string }> =>
  apiRequest(
    `/supervisor/purchase-orders/${id}/send-devis-signature-email`,
    'POST',
    token,
  );

export const isAuthenticatedGg = async (
  token: string,
): Promise<{ isAuthenticated: boolean }> => {
  return await apiRequest('/auth-google/is-authenticated', 'GET', token);
};

export const getAuthUrlGg = async (
  token: string,
  redirectUrl: string,
): Promise<{ url: string; email: string }> => {
  return await apiRequest(
    `/auth-google/url?redirect=${redirectUrl}`,
    'GET',
    token,
  );
};

// Installation Preparation Text API functions
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

// Calendar API functions
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

// Repair Calendar Events API functions
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

export const updateRepairCalendarEvent = (
  token: string,
  repairId: number,
  eventData: Partial<CreateRepairCalendarEventRequest>,
): Promise<RepairCalendarEventResponse> =>
  apiRequest(
    `/supervisor/repair-calendar-event/${repairId}`,
    'PUT',
    token,
    eventData,
  );

export const deleteRepairCalendarEvent = (
  token: string,
  repairId: number,
): Promise<RepairCalendarEventResponse> =>
  apiRequest(`/supervisor/repair-calendar-event/${repairId}`, 'DELETE', token);

// Sales Summary API functions
export interface SalesItem {
  orderId: number;
  date: string;
  clientName: string;
  reference: string;
  name: string;
  category: string;
  price: number;
  serialNumber: string;
}

export interface SalesSummary {
  totalOrders: number;
  totalItems: number;
  totalRevenue: number;
}

export interface SalesSummaryResponse {
  data: SalesItem[];
  summary: SalesSummary;
}

export const fetchSalesSummary = (
  token: string,
  startDate: string,
  endDate: string,
): Promise<SalesSummaryResponse> =>
  apiRequest(
    `/supervisor/sales-summary?startDate=${startDate}&endDate=${endDate}`,
    'GET',
    token,
  );

export const downloadSalesExcel = async (
  token: string,
  startDate: string,
  endDate: string,
): Promise<Blob> => {
  const response = await fetch(
    `${API_URL}/supervisor/sales-summary/excel`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ startDate, endDate }),
    },
  );

  if (!response.ok) {
    throw new HttpError(
      'Failed to download Excel file',
      response.status,
    );
  }

  return response.blob();
};
