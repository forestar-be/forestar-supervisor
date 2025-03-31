import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  fetchAllInstallationTexts,
  createInstallationText,
  updateInstallationText,
  deleteInstallationText,
  reorderInstallationTexts,
} from '../utils/api';
import {
  InstallationPreparationText,
  InstallationTextType,
} from '../utils/types';
import { notifySuccess, notifyError } from '../utils/notifications';

interface InstallationTextsState {
  texts: InstallationPreparationText[];
  loading: boolean;
  error: string | null;
}

const initialState: InstallationTextsState = {
  texts: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchAllInstallationTextsThunk = createAsyncThunk(
  'installationTexts/fetchAll',
  async (token: string) => {
    return await fetchAllInstallationTexts(token);
  },
);

export const createInstallationTextThunk = createAsyncThunk(
  'installationTexts/create',
  async ({
    token,
    content,
    type,
    order,
  }: {
    token: string;
    content: string;
    type: InstallationTextType;
    order: number;
  }) => {
    const result = await createInstallationText(token, {
      content,
      type,
      order,
    });
    notifySuccess("Texte d'installation créé avec succès");
    return result;
  },
);

export const updateInstallationTextThunk = createAsyncThunk(
  'installationTexts/update',
  async ({
    token,
    id,
    updates,
  }: {
    token: string;
    id: number;
    updates: { content?: string; type?: InstallationTextType; order?: number };
  }) => {
    const result = await updateInstallationText(token, id, updates);
    notifySuccess("Texte d'installation mis à jour avec succès");
    return result;
  },
);

export const deleteInstallationTextThunk = createAsyncThunk(
  'installationTexts/delete',
  async ({ token, id }: { token: string; id: number }) => {
    await deleteInstallationText(token, id);
    notifySuccess("Texte d'installation supprimé avec succès");
    return id;
  },
);

export const reorderInstallationTextsThunk = createAsyncThunk(
  'installationTexts/reorder',
  async ({ token, textIds }: { token: string; textIds: number[] }) => {
    const result = await reorderInstallationTexts(token, textIds);
    notifySuccess("Ordre des textes d'installation mis à jour avec succès");
    return result;
  },
);

// Slice
const installationTextsSlice = createSlice({
  name: 'installationTexts',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all texts
      .addCase(fetchAllInstallationTextsThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllInstallationTextsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.texts = action.payload;
      })
      .addCase(fetchAllInstallationTextsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || 'Failed to fetch installation texts';
      })

      // Create text
      .addCase(createInstallationTextThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createInstallationTextThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.texts.push(action.payload);
        state.texts.sort((a, b) => a.order - b.order);
      })
      .addCase(createInstallationTextThunk.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || 'Failed to create installation text';
        notifyError("Échec de la création du texte d'installation");
      })

      // Update text
      .addCase(updateInstallationTextThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateInstallationTextThunk.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.texts.findIndex(
          (text) => text.id === action.payload.id,
        );
        if (index !== -1) {
          state.texts[index] = action.payload;
        }
        state.texts.sort((a, b) => a.order - b.order);
      })
      .addCase(updateInstallationTextThunk.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || 'Failed to update installation text';
        notifyError("Échec de la mise à jour du texte d'installation");
      })

      // Delete text
      .addCase(deleteInstallationTextThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteInstallationTextThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.texts = state.texts.filter((text) => text.id !== action.payload);
      })
      .addCase(deleteInstallationTextThunk.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || 'Failed to delete installation text';
        notifyError("Échec de la suppression du texte d'installation");
      })

      // Reorder texts
      .addCase(reorderInstallationTextsThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(reorderInstallationTextsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.texts = action.payload;
      })
      .addCase(reorderInstallationTextsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || 'Failed to reorder installation texts';
        notifyError("Échec de la réorganisation des textes d'installation");
      });
  },
});

export const { clearError } = installationTextsSlice.actions;
export default installationTextsSlice.reducer;
