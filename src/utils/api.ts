import { ConfigElement } from '../components/settings/EditConfig';

const API_URL = process.env.REACT_APP_API_URL;

const apiRequest = async (
  endpoint: string,
  method: string,
  token: string,
  body?: any,
  additionalHeaders: HeadersInit = { 'Content-Type': 'application/json' },
  stringifyBody: boolean = true,
  throwError: boolean = true,
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
    data = await response.json();
  } catch (error) {
    console.warn('Error parsing JSON of response', response, error);
  }

  if (
    response.status === 403 &&
    data?.message &&
    data?.message === 'jwt expired'
  ) {
    window.location.href = `/login?redirect=${window.location.pathname}`;
    return;
  }

  if (throwError && !response.ok) {
    console.error(`${response.statusText} ${response.status}`, data);
    throw new Error(`${response.statusText} ${response.status}`);
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
