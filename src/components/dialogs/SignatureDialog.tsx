import React, { useRef } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fade,
  Stack,
  Typography,
} from '@mui/material';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import ClearIcon from '@mui/icons-material/Clear';
import SaveIcon from '@mui/icons-material/Save';
import SignatureCanvas from 'react-signature-canvas';
import { PurchaseOrder } from '../../utils/types';

// Add CSS for SignatureCanvas
const signatureCanvasStyles = `
  .signature-canvas {
    touch-action: none;
  }
`;

interface SignatureDialogProps {
  open: boolean;
  orderData: PurchaseOrder | null;
  isLoading: boolean;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}

const SignatureDialog: React.FC<SignatureDialogProps> = ({
  open,
  orderData,
  isLoading,
  onClose,
  onSubmit,
}) => {
  // Signature canvas reference
  const signatureCanvasRef = useRef<SignatureCanvas>(null);

  // Clear signature pad
  const clearSignature = () => {
    if (signatureCanvasRef.current) {
      signatureCanvasRef.current.clear();
    }
  };

  // Get signature data
  const getSignatureData = (): string | null => {
    if (!signatureCanvasRef.current) return null;
    if (signatureCanvasRef.current.isEmpty()) return null;
    return signatureCanvasRef.current.toDataURL('image/png');
  };

  return (
    <>
      {/* Add global styles for signature canvas */}
      <style>{signatureCanvasStyles}</style>

      <Dialog
        open={open}
        onClose={onClose}
        disableEscapeKeyDown={isLoading}
        maxWidth="md"
        fullWidth
        TransitionComponent={Fade}
        TransitionProps={{ timeout: 300 }}
        aria-labelledby="signature-dialog-title"
      >
        <DialogTitle
          id="signature-dialog-title"
          sx={{
            textAlign: 'center',
            pt: 2,
            pb: 2,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
          }}
        >
          Validation du Bon de Commande
        </DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, textAlign: 'center' }}>
              {orderData && (
                <>
                  Client: {orderData.clientFirstName} {orderData.clientLastName}
                </>
              )}
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, textAlign: 'center' }}>
              Pour finaliser ce bon de commande, veuillez faire signer le client
              ci-dessous:
            </Typography>
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                p: 1,
                mb: 2,
                bgcolor: 'background.paper',
                height: '300px',
                width: '90%',
                mx: 'auto',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <SignatureCanvas
                ref={signatureCanvasRef}
                penColor="black"
                canvasProps={{
                  className: 'signature-canvas',
                  style: {
                    width: '100%',
                    height: '280px',
                    border: '1px solid #eee',
                    backgroundColor: 'white',
                    cursor: 'crosshair',
                  },
                }}
              />
            </Box>
            <Stack
              direction="row"
              spacing={2}
              justifyContent="center"
              alignItems="center"
            >
              <Button
                variant="outlined"
                color="secondary"
                onClick={clearSignature}
                startIcon={<ClearIcon />}
                disabled={isLoading}
              >
                Effacer la signature
              </Button>
            </Stack>
          </Box>
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <CircularProgress size={32} />
            </Box>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            justifyContent: 'center',
            gap: 2,
            pb: 3,
            pt: 1,
          }}
        >
          <Button
            onClick={onClose}
            variant="outlined"
            color="inherit"
            disabled={isLoading}
            startIcon={<CancelOutlinedIcon />}
            sx={{
              minWidth: 120,
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: 'scale(1.05)',
              },
            }}
          >
            Annuler
          </Button>
          <Button
            onClick={onSubmit}
            variant="contained"
            color="success"
            disabled={isLoading}
            startIcon={
              isLoading ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <SaveIcon />
              )
            }
            sx={{
              minWidth: 200,
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: 'scale(1.05)',
              },
            }}
          >
            {isLoading ? 'Enregistrement...' : 'Valider avec signature'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export { SignatureDialog, signatureCanvasStyles };
export type { SignatureDialogProps };
