'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { useAuth } from '@/lib/auth';
import { makeStore } from './index';
import { fetchConfigAsync } from './configSlice';
import { fetchAllInstallationTextsThunk } from './installationTextsSlice';
import { useAppDispatch } from './hooks';

/** Charge la configuration et les textes d'installation dès la connexion. */
function InitialLoader() {
  const { token } = useAuth();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!token) return;
    void dispatch(fetchConfigAsync(token));
    void dispatch(fetchAllInstallationTextsThunk(token));
  }, [token, dispatch]);

  return null;
}

export default function StoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(makeStore);
  return (
    <Provider store={store}>
      <InitialLoader />
      {children}
    </Provider>
  );
}
