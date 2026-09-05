import { useContext, createContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../utils/api';
import {
  AuthProvider as SsoSessionProvider,
  useAuth as useSsoSession,
  type ForestarRole,
} from '@forestar-be/core';
import {
  API_URL as SSO_API_URL,
  getSessionClient,
  SSO_ENABLED,
} from './session';

interface AuthContextValue {
  /** Toujours vide en mode SSO : aucun jeton n'atteint le navigateur. */
  token: string;
  expiresAt: string;
  loginAction: (data: any) => Promise<{ success: boolean; message: string }>;
  logOut: () => void;
  isAdmin: boolean;
  /** Vrai tant que la première lecture de session n'a pas abouti (SSO). */
  isLoading: boolean;
  isAuthenticated: boolean;
  roles: readonly ForestarRole[];
  hasRole: (...roles: ForestarRole[]) => boolean;
  /** Permet aux écrans de savoir quel chemin est actif, sans relire l'env. */
  ssoEnabled: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  token: '',
  expiresAt: '',
  loginAction: async (
    data: any,
  ): Promise<{ success: boolean; message: string }> => {
    return { success: false, message: 'Impossible de vous authentifier' };
  },
  logOut: () => {},
  isAdmin: false,
  isLoading: false,
  isAuthenticated: false,
  roles: [],
  hasRole: () => false,
  ssoEnabled: false,
});

const getTokenFromLocalStorage = () => {
  const token = localStorage.getItem('token');
  const expiresAt = localStorage.getItem('expires_at');

  if (token && expiresAt) {
    if (new Date().getTime() < Number(expiresAt)) {
      return token;
    }
  }
  localStorage.removeItem('token');
  localStorage.removeItem('expires_at');
  return '';
};

const LegacyAuthProvider = ({ children }: any) => {
  const [token, setToken] = useState(getTokenFromLocalStorage());
  const [expiresAt, setExpiresAt] = useState(
    localStorage.getItem('expires_at') || '',
  );
  const [isAdmin, setIsAdmin] = useState(
    localStorage.getItem('is_admin') === 'true',
  );

  const navigate = useNavigate();
  const loginAction = async (
    data: any,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await login(data);
      if (res.authentificated) {
        setExpiresAt(res.expiresAt);
        setToken(res.token);
        setIsAdmin(res.isAdmin);
        localStorage.setItem('token', String(res.token));
        localStorage.setItem('expires_at', String(res.expiresAt));
        localStorage.setItem('is_admin', String(res.isAdmin));
        navigate('/');
        return { success: true, message: 'Vous êtes connecté' };
      }
      return {
        success: false,
        message:
          "Impossible de vous authentifier, vérifiez vos informations d'identification et réessayez",
      };
    } catch (error: any) {
      return {
        success: false,
        message:
          error.message ||
          'Impossible de vous authentifier, veuillez réessayer plus tard',
      };
    }
  };

  const logOut = () => {
    console.log('logout');
    setExpiresAt('');
    setToken('');
    setIsAdmin(false);
    localStorage.removeItem('token');
    localStorage.removeItem('expires_at');
    localStorage.removeItem('is_admin');
    navigate('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        expiresAt,
        loginAction,
        logOut,
        isAdmin,
        isLoading: false,
        isAuthenticated: Boolean(token),
        roles: [],
        // Le chemin historique ne connaît pas les rôles du contrat R005 : il
        // n'a que le drapeau `isAdmin`, et le serveur a déjà vérifié le rôle
        // de l'application à la connexion.
        hasRole: (...roles: ForestarRole[]) =>
          roles.length === 0 ? Boolean(token) : isAdmin,
        ssoEnabled: false,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Traduit la session SSO dans le contrat historique consommé par les écrans.
 * Aucun composant lisant `auth.token` n'a été réécrit : en mode SSO la valeur
 * est vide, donc `apiRequest` n'émet pas d'en-tête `Authorization` et
 * s'authentifie par le cookie.
 */
const SsoAuthBridge = ({ children }: any) => {
  const session = useSsoSession();

  return (
    <AuthContext.Provider
      value={{
        token: '',
        expiresAt: session.expiresAt ?? '',
        loginAction: async () => {
          session.login();
          return {
            success: true,
            message: "Redirection vers l'authentification Forestar",
          };
        },
        logOut: () => {
          void session.logout();
        },
        isAdmin: session.hasRole('forestar.admin'),
        isLoading: session.isLoading,
        isAuthenticated: session.isAuthenticated,
        roles: session.roles,
        hasRole: session.hasRole,
        ssoEnabled: true,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Le chemin est choisi au chargement du module, jamais au rendu : un `if` dans
 * le corps d'un composant ferait varier les hooks appelés d'un rendu à l'autre.
 */
const AuthProvider = ({ children }: any) => {
  if (!SSO_ENABLED) return <LegacyAuthProvider>{children}</LegacyAuthProvider>;
  return (
    <SsoSessionProvider client={getSessionClient()} baseUrl={SSO_API_URL}>
      <SsoAuthBridge>{children}</SsoAuthBridge>
    </SsoSessionProvider>
  );
};

export default AuthProvider;

export const useAuth = () => {
  return useContext(AuthContext);
};
