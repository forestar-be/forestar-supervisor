import { configureStore } from '@reduxjs/toolkit';
import configReducer from './configSlice';
import robotInventoryReducer from './robotInventorySlice';

export const store = configureStore({
  reducer: {
    config: configReducer,
    robotInventory: robotInventoryReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
