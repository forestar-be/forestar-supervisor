import { useContext, createContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../utils/api';

const AuthContext = createContext({
  token: '',
  expiresAt: '',
  loginAction: async (
    data: any,
  ): Promise<{ success: boolean; message: string }> => {
    return { success: false, message: 'Impossible de vous authentifier' };
  },
  logOut: () => {},
  isAdmin: false,
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

const AuthProvider = ({ children }: any) => {
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
      value={{ token, expiresAt, loginAction, logOut, isAdmin }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;

export const useAuth = () => {
  return useContext(AuthContext);
};
