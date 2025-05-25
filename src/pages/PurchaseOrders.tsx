// Ce fichier est maintenant un simple routeur qui redirige vers la page des bons de commande
import React from 'react';
import { Navigate } from 'react-router-dom';

const PurchaseOrders: React.FC = () => {
  // Rediriger directement vers la page des bons de commande
  return <Navigate to="/bons-commande" />;
};

export default PurchaseOrders;
