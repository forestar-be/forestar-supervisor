import { configureStore } from '@reduxjs/toolkit';
import robotInventoryReducer from './robotInventorySlice';
import configReducer from './configSlice';
import installationTextsReducer from './installationTextsSlice';
import salesSummaryReducer from './salesSummarySlice';

export const store = configureStore({
  reducer: {
    robotInventory: robotInventoryReducer,
    config: configReducer,
    installationTexts: installationTextsReducer,
    salesSummary: salesSummaryReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
