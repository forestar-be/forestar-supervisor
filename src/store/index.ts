import { configureStore } from '@reduxjs/toolkit';
import configReducer from './configSlice';
import installationTextsReducer from './installationTextsSlice';

export const store = configureStore({
  reducer: {
    config: configReducer,
    installationTexts: installationTextsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
