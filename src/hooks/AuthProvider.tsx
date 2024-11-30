import { useContext, createContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
const API_URL = process.env.REACT_APP_API_URL;

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
    const response = await fetch(`${API_URL}/supervisor/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      try {
        const res = await response.json();
        if (res.message) {
          return { success: false, message: res.message };
        }
      } catch (error) {
        console.log(error);
      }

      return {
        success: false,
        message:
          'Impossible de vous authentifier, veuillez réessayer plus tard',
      };
    }

    const res = await response.json();
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
