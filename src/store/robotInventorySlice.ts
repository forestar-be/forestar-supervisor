import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  fetchRobotInventory,
  createRobotInventory,
  updateRobotInventory as apiUpdateInventory,
  deleteRobotInventory as apiDeleteInventory,
  fetchInventorySummary,
  updateInventoryPlans,
} from '../utils/api';
import {
  RobotInventory,
  InventoryPlan,
  InventorySummary,
} from '../utils/types';

interface RobotInventoryState {
  items: RobotInventory[];
  periods: { year: number; month: number }[];
  loading: boolean;
  error: string | null;
}

const initialState: RobotInventoryState = {
  items: [],
  periods: [],
  loading: false,
  error: null,
};

export const fetchInventoryAsync = createAsyncThunk(
  'robotInventory/fetchInventory',
  async (token: string) => {
    const response = await fetchRobotInventory(token);
    return response.data;
  },
);

export const fetchInventorySummaryAsync = createAsyncThunk(
  'robotInventory/fetchInventorySummary',
  async (token: string) => {
    const response = await fetchInventorySummary(token);
    return response;
  },
);

export const addInventoryItemAsync = createAsyncThunk(
  'robotInventory/addInventoryItem',
  async ({
    token,
    itemData,
  }: {
    token: string;
    itemData: Partial<RobotInventory>;
  }) => {
    const response = await createRobotInventory(token, itemData);
    return response;
  },
);

export const updateInventoryItemAsync = createAsyncThunk(
  'robotInventory/updateInventoryItem',
  async ({
    token,
    id,
    itemData,
  }: {
    token: string;
    id: number;
    itemData: Partial<RobotInventory>;
  }) => {
    const response = await apiUpdateInventory(token, id, itemData);
    return response;
  },
);

export const deleteInventoryItemAsync = createAsyncThunk(
  'robotInventory/deleteInventoryItem',
  async ({ token, id }: { token: string; id: number }) => {
    await apiDeleteInventory(token, id);
    return id;
  },
);

export const updateInventoryPlansAsync = createAsyncThunk(
  'robotInventory/updateInventoryPlans',
  async ({
    token,
    plans,
  }: {
    token: string;
    plans: Partial<InventoryPlan>[];
  }) => {
    await updateInventoryPlans(token, plans);
    const response = await fetchInventorySummary(token);
    return response;
  },
);

export const robotInventorySlice = createSlice({
  name: 'robotInventory',
  initialState,
  reducers: {
    setInventory: (state, action: PayloadAction<RobotInventory[]>) => {
      state.items = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch inventory
      .addCase(fetchInventoryAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventoryAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchInventoryAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch inventory';
      })
      // Fetch inventory summary
      .addCase(fetchInventorySummaryAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventorySummaryAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.robots;
        state.periods = action.payload.periods;
      })
      .addCase(fetchInventorySummaryAsync.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || 'Failed to fetch inventory summary';
      })
      // Add inventory item
      .addCase(addInventoryItemAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addInventoryItemAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.items.push(action.payload);
      })
      .addCase(addInventoryItemAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to add inventory item';
      })
      // Update inventory item
      .addCase(updateInventoryItemAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateInventoryItemAsync.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex(
          (item) => item.id === action.payload.id,
        );
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(updateInventoryItemAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update inventory item';
      })
      // Delete inventory item
      .addCase(deleteInventoryItemAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteInventoryItemAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter((item) => item.id !== action.payload);
      })
      .addCase(deleteInventoryItemAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete inventory item';
      })
      // Update inventory plans
      .addCase(updateInventoryPlansAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateInventoryPlansAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.robots;
        state.periods = action.payload.periods;
      })
      .addCase(updateInventoryPlansAsync.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || 'Failed to update inventory plans';
      });
  },
});

export const { setInventory } = robotInventorySlice.actions;

export default robotInventorySlice.reducer;
