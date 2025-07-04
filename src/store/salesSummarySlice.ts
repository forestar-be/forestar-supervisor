import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  fetchSalesSummary,
  downloadSalesExcel,
  SalesItem,
  SalesSummary,
} from '../utils/api';

interface SalesSummaryState {
  items: SalesItem[];
  summary: SalesSummary | null;
  loading: boolean;
  error: string | null;
}

const initialState: SalesSummaryState = {
  items: [],
  summary: null,
  loading: false,
  error: null,
};

export const fetchSalesSummaryAsync = createAsyncThunk(
  'salesSummary/fetchSalesSummary',
  async ({
    token,
    startDate,
    endDate,
  }: {
    token: string;
    startDate: string;
    endDate: string;
  }) => {
    const response = await fetchSalesSummary(token, startDate, endDate);
    return response;
  },
);

export const downloadSalesExcelAsync = createAsyncThunk(
  'salesSummary/downloadSalesExcel',
  async ({
    token,
    startDate,
    endDate,
  }: {
    token: string;
    startDate: string;
    endDate: string;
  }) => {
    const blob = await downloadSalesExcel(token, startDate, endDate);

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    const start = new Date(startDate).toISOString().split('T')[0];
    const end = new Date(endDate).toISOString().split('T')[0];
    link.download = `recap_ventes_${start}_${end}.xlsx`;

    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return { success: true };
  },
);

export const salesSummarySlice = createSlice({
  name: 'salesSummary',
  initialState,
  reducers: {
    clearSalesData: (state) => {
      state.items = [];
      state.summary = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch sales summary
      .addCase(fetchSalesSummaryAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSalesSummaryAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
        state.summary = action.payload.summary;
      })
      .addCase(fetchSalesSummaryAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch sales summary';
      })
      // Download Excel
      .addCase(downloadSalesExcelAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(downloadSalesExcelAsync.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(downloadSalesExcelAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to download Excel file';
      });
  },
});

export const { clearSalesData } = salesSummarySlice.actions;

export default salesSummarySlice.reducer;
