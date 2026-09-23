import { configureStore } from '@reduxjs/toolkit';
import configReducer from './configSlice';
import installationTextsReducer from './installationTextsSlice';

/**
 * Un store par client, jamais un singleton de module : sous Next, un module
 * peut être évalué côté serveur et partagé entre requêtes.
 */
export const makeStore = () =>
  configureStore({
    reducer: {
      config: configReducer,
      installationTexts: installationTextsReducer,
    },
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
