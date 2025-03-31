import { configureStore } from '@reduxjs/toolkit';
import robotInventoryReducer from './robotInventorySlice';
import configReducer from './configSlice';
import installationTextsReducer from './installationTextsSlice';

export const store = configureStore({
  reducer: {
    robotInventory: robotInventoryReducer,
    config: configReducer,
    installationTexts: installationTextsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
