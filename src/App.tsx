import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import getTheme from './theme/theme';
import ColorModeContext from './utils/ColorModeContext';
import Layout from './layout/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import AuthRoute from './components/AuthRoute';
import AuthProvider, { useAuth } from './hooks/AuthProvider';
import SingleRepair from './pages/SingleRepair';
import Settings from './pages/Settings';

import PhoneCallbacks from './pages/PhoneCallbacks';
import Inventory from './pages/Inventory';
import DevisPage from './pages/DevisPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import PurchaseOrderForm from './pages/PurchaseOrderForm';
import PurchaseOrderSignature from './pages/PurchaseOrderSignature';
import ClientDevisSignature from './pages/ClientDevisSignature';
import DailyCalendar from './pages/DailyCalendar';
import { useAppDispatch } from './store/hooks';
import { fetchConfigAsync } from './store/configSlice';
import { fetchInventorySummaryAsync } from './store/robotInventorySlice';
import { fetchAllInstallationTextsThunk } from './store/installationTextsSlice';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { Provider } from 'react-redux';
import { store } from './store';
import LoginGoogle from './pages/LoginGoogle';
import NotFoundPage from './pages/NotFoundPage';
import 'dayjs/locale/fr';

dayjs.extend(utc);
dayjs.extend(timezone);

const defaultTheme = 'light';
//
// const AppTestPdf = () => (
//   <PDFViewer width={'100%'} height={'100%'}>
//     <MyDocument
//       dateDuDepot="2021-10-10"
//       gSMClient="123456789"
//       nom="John Doe"
//       code="123456"
//       type="dkhdehsdjkfh"
//       codeRobot="123456"
//       avecDevis="Oui"
//       modele="hgfhgfj"
//       typeReparation="sdghggh"
//       avecGarantie="Oui"
//       remarques="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
//       prix="100€"
//       tempsPasse="10h"
//       piecesRemplacees="fedioiifjefe, feoifjef, fjdsiofjdsf, fdsiofsdf, fdsjfh"
//       travailEffectue="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
//     />
//   </PDFViewer>
// );

const InitStoreLoader = () => {
  const auth = useAuth();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (auth.token) {
      dispatch(fetchConfigAsync(auth.token));
      dispatch(fetchInventorySummaryAsync(auth.token));
      dispatch(fetchAllInstallationTextsThunk(auth.token));
    }
  }, [auth.token, dispatch]);

  return null;
};

const App = (): JSX.Element => {
  const [mode, setMode] = useState('dark');
  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        window.localStorage.setItem(
          'themeMode',
          mode === 'dark' ? 'light' : 'dark',
        );
        setMode((prevMode) => (prevMode === 'dark' ? 'light' : 'dark'));
      },
    }),
    [mode],
  );

  useEffect(() => {
    try {
      const localTheme = window.localStorage.getItem('themeMode');
      localTheme ? setMode(localTheme) : setMode(defaultTheme);
    } catch {
      setMode(defaultTheme);
    }
  }, []);

  return (
    <HelmetProvider>
      <Helmet
        titleTemplate="%s | Forestar Shop Atelier"
        defaultTitle="Forestar Shop Atelier"
      >
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <ColorModeContext.Provider value={colorMode}>
        <ThemeProvider theme={getTheme(mode)}>
          <CssBaseline />
          <BrowserRouter>
            <AuthProvider>
              <LocalizationProvider
                dateAdapter={AdapterDayjs}
                adapterLocale={'fr'}
              >
                <Layout>
                  <ToastContainer />{' '}
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route
                      path="/devis/client/signature"
                      element={<ClientDevisSignature />}
                    />
                    <Route element={<AuthRoute />}>
                      <Route
                        path="/connection-google"
                        element={<LoginGoogle />}
                      />
                      <Route
                        path="/"
                        element={
                          <Provider store={store}>
                            <InitStoreLoader />
                            <Outlet />
                          </Provider>
                        }
                      >
                        <Route index element={<Home />} />
                        <Route
                          path="reparation/:id"
                          element={<SingleRepair />}
                        />
                        <Route path="parametres" element={<Settings />} />
                        <Route path="appels" element={<PhoneCallbacks />} />
                        <Route
                          path="inventaire-robots"
                          element={<Inventory />}
                        />
                        <Route path="devis" element={<DevisPage />} />
                        <Route
                          path="bons-commande"
                          element={<PurchaseOrdersPage />}
                        />
                        <Route
                          path="bons-commande/create"
                          element={<PurchaseOrderForm />}
                        />
                        <Route
                          path="bons-commande/edit/:id"
                          element={<PurchaseOrderForm />}
                        />
                        <Route
                          path="devis/signature/:id"
                          element={<PurchaseOrderSignature />}
                        />
                        <Route path="calendrier" element={<DailyCalendar />} />
                      </Route>
                    </Route>
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </Layout>
              </LocalizationProvider>
            </AuthProvider>
          </BrowserRouter>
        </ThemeProvider>
      </ColorModeContext.Provider>
    </HelmetProvider>
  );
};

export default App;
