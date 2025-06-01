import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/AuthProvider';

const AuthRoute = () => {
  const auth = useAuth();
  const location = useLocation();

  if (!auth.token) {
    return <Navigate to="/login" state={{ from: location }} />;
  }

  return <Outlet />;
};

export default AuthRoute;
