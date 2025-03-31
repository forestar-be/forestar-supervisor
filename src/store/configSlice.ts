import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  fetchAllConfig,
  fetchConfig,
  addConfig,
  updateConfig as apiUpdateConfig,
  deleteConfig as apiDeleteConfig,
} from '../utils/api';
import { ConfigElement } from '../components/settings/EditConfig';

interface ConfigState {
  brands: string[];
  repairerNames: string[];
  replacedParts: { name: string; price: number }[];
  machineType: string[];
  robotType: string[];
  config: {
    'Taux horaire': string;
    'Prix devis': string;
    'Conditions générales de réparation': string;
    Adresse: string;
    Téléphone: string;
    Email: string;
    'Site web': string;
    'Titre bon pdf': string;
    'Prix hivernage': string;
    États: string;
    'URL drive bons de commande': string;
    [key: string]: string;
  };
  loading: boolean;
  error: string | null;
}

const initialState: ConfigState = {
  brands: [],
  repairerNames: [],
  replacedParts: [],
  machineType: [],
  robotType: [],
  config: {
    'Taux horaire': '0',
    'Prix devis': '0',
    'Conditions générales de réparation': '',
    Adresse: '',
    Téléphone: '',
    Email: '',
    'Site web': '',
    'Titre bon pdf': '',
    'Prix hivernage': '0',
    États: '{}',
    'URL drive bons de commande': '',
  },
  loading: false,
  error: null,
};

export const fetchConfigAsync = createAsyncThunk(
  'config/fetchConfig',
  async (token: string) => {
    const response = await fetchAllConfig(token);
    return response;
  },
);

export const addConfigAsync = createAsyncThunk(
  'config/addConfig',
  async ({
    token,
    configElement,
  }: {
    token: string;
    configElement: ConfigElement;
  }) => {
    await addConfig(token, configElement);
    const response = await fetchAllConfig(token);
    return response;
  },
);

export const updateConfigAsync = createAsyncThunk(
  'config/updateConfig',
  async ({
    token,
    configElement,
  }: {
    token: string;
    configElement: ConfigElement;
  }) => {
    await apiUpdateConfig(token, configElement);
    const response = await fetchAllConfig(token);
    return response;
  },
);

export const deleteConfigAsync = createAsyncThunk(
  'config/deleteConfig',
  async ({ token, key }: { token: string; key: string }) => {
    await apiDeleteConfig(token, key);
    const response = await fetchAllConfig(token);
    return response;
  },
);

export const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {
    setConfig: (state, action: PayloadAction<ConfigState>) => {
      return { ...state, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConfigAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConfigAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.brands = action.payload.brands;
        state.repairerNames = action.payload.repairerNames;
        state.replacedParts = action.payload.replacedParts;
        state.machineType = action.payload.machineType;
        state.robotType = action.payload.robotType;
        state.config = action.payload.config;
      })
      .addCase(fetchConfigAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch config';
      })
      .addCase(addConfigAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addConfigAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.brands = action.payload.brands;
        state.repairerNames = action.payload.repairerNames;
        state.replacedParts = action.payload.replacedParts;
        state.machineType = action.payload.machineType;
        state.robotType = action.payload.robotType;
        state.config = action.payload.config;
      })
      .addCase(addConfigAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to add config element';
      })
      .addCase(updateConfigAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateConfigAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.brands = action.payload.brands;
        state.repairerNames = action.payload.repairerNames;
        state.replacedParts = action.payload.replacedParts;
        state.machineType = action.payload.machineType;
        state.robotType = action.payload.robotType;
        state.config = action.payload.config;
      })
      .addCase(updateConfigAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update config element';
      })
      .addCase(deleteConfigAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteConfigAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.brands = action.payload.brands;
        state.repairerNames = action.payload.repairerNames;
        state.replacedParts = action.payload.replacedParts;
        state.machineType = action.payload.machineType;
        state.robotType = action.payload.robotType;
        state.config = action.payload.config;
      })
      .addCase(deleteConfigAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete config element';
      });
  },
});

export const { setConfig } = configSlice.actions;

export default configSlice.reducer;
