import React from 'react';
import OrdersGrid from '../components/OrdersGrid';

const PURCHASE_ORDERS_GRID_STATE_KEY = 'purchaseOrdersAgGridState';

const PurchaseOrdersPage: React.FC = () => {
  return (
    <OrdersGrid
      title="Bons de commande"
      isDevis={false}
      gridStateKey={PURCHASE_ORDERS_GRID_STATE_KEY}
      addButtonText="Créer un bon de commande"
      addButtonPath="/purchase-orders/create?type=order"
      includeSignedColumn={false}
    />
  );
};

export default PurchaseOrdersPage;
