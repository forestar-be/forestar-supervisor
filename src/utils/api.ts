import { ConfigElement } from '../components/settings/EditConfig';
import {
  InventoryPlan,
  InventorySummary,
  PurchaseOrder,
  PurchaseOrderFormData,
  RobotInventory,
  InstallationPreparationText,
} from './types';

const API_URL = process.env.REACT_APP_API_URL;

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
      throw new Error(data);
    }
    throw new Error(
      data?.message || `${response.statusText} ${response.status}`,
    );
  }

  return data;
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

// Purchase Orders API functions
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
  orderData: PurchaseOrderFormData,
  pdfBlob?: Blob,
): Promise<PurchaseOrder> => {
  if (pdfBlob) {
    // If we have a PDF blob, use FormData
    const formData = new FormData();
    // Add all order data as JSON
    formData.append('orderData', JSON.stringify(orderData));
    // Add PDF file
    formData.append(
      'pdf',
      new File([pdfBlob], 'purchase_order.pdf', { type: 'application/pdf' }),
    );

    return apiRequest(
      '/supervisor/purchase-orders',
      'POST',
      token,
      formData,
      {}, // No content-type header, browser will set it with boundary
      false, // Don't stringify the body
    );
  } else {
    // Standard JSON request without PDF
    return apiRequest('/supervisor/purchase-orders', 'POST', token, orderData);
  }
};

export const updatePurchaseOrder = (
  token: string,
  id: number,
  orderData: Partial<PurchaseOrderFormData>,
  pdfBlob?: Blob,
): Promise<PurchaseOrder> => {
  if (pdfBlob) {
    // If we have a PDF blob, use FormData
    const formData = new FormData();
    // Add all order data as JSON
    formData.append('orderData', JSON.stringify(orderData));
    // Add PDF file
    formData.append(
      'pdf',
      new File([pdfBlob], 'purchase_order.pdf', { type: 'application/pdf' }),
    );

    return apiRequest(
      `/supervisor/purchase-orders/${id}`,
      'PUT',
      token,
      formData,
      {}, // No content-type header, browser will set it with boundary
      false, // Don't stringify the body
    );
  } else {
    // Standard JSON request without PDF
    return apiRequest(
      `/supervisor/purchase-orders/${id}`,
      'PUT',
      token,
      orderData,
    );
  }
};

export const updatePurchaseOrderStatus = (
  token: string,
  id: number,
  statusData: {
    hasAppointment?: boolean;
    isInstalled?: boolean;
  },
): Promise<PurchaseOrder> => {
  return apiRequest(
    `/supervisor/purchase-orders/${id}/status`,
    'PATCH',
    token,
    statusData,
  );
};

export const deletePurchaseOrder = (token: string, id: number): Promise<void> =>
  apiRequest(`/supervisor/purchase-orders/${id}`, 'DELETE', token);

export const getPurchaseOrderPdf = (token: string, id: number): Promise<Blob> =>
  apiRequest(`/supervisor/purchase-orders/${id}/pdf`, 'GET', token);

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
