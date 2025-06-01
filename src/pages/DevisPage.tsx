import React, { useCallback } from 'react';
import { Button } from '@mui/material';
import OrdersGrid from '../components/OrdersGrid';
import { ICellRendererParams } from 'ag-grid-community';
import { Box, Tooltip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CreateIcon from '@mui/icons-material/Create';

// Clé pour stocker l'état de la grille des devis
const DEVIS_GRID_STATE_KEY = 'devisAgGridState';

const DevisPage: React.FC = () => {
  const navigate = useNavigate();

  // Composant personnalisé pour la colonne "Signé" spécifique aux devis
  const DevisSignatureCell = useCallback(
    (params: ICellRendererParams) => {
      if (!params.data) return null;
      const order = params.data;

      return (
        <Box
          sx={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Tooltip title="Signer le devis" arrow>
            <Button
              variant="outlined"
              color="primary"
              size="small"
              startIcon={<CreateIcon />}
              onClick={() => navigate(`/devis/signature/${order.id}`)}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Signer
            </Button>
          </Tooltip>
        </Box>
      );
    },
    [navigate],
  );

  return (
    <OrdersGrid
      title="Devis"
      isDevis={true}
      gridStateKey={DEVIS_GRID_STATE_KEY}
      addButtonText="Créer un devis"
      addButtonPath="/bons-commande/create?type=devis"
      includeSignedColumn={true}
      customDevisCell={DevisSignatureCell}
    />
  );
};

export default DevisPage;
