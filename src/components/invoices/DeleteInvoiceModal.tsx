import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
  Box,
  CircularProgress,
  Collapse,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useAuth } from '../../hooks/AuthProvider';
import {
  getServiceInvoiceDeletionInfo,
  deleteServiceInvoice,
  isHttpError,
} from '../../utils/api';

interface DeletionInfo {
  isDraft: boolean;
  hasDolibarrInvoice: boolean;
  dolibarrStatus: number | null;
}

interface DeleteInvoiceModalProps {
  invoiceId: number;
  invoiceNumber: string;
  onClose: () => void;
  onDeleted: () => void;
}

const DeleteInvoiceModal: React.FC<DeleteInvoiceModalProps> = ({
  invoiceId,
  invoiceNumber,
  onClose,
  onDeleted,
}) => {
  const auth = useAuth();
  const [info, setInfo] = useState<DeletionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [warningDetail, setWarningDetail] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    if (!auth.token) return;
    getServiceInvoiceDeletionInfo(auth.token, invoiceId)
      .then(setInfo)
      .catch(() => setInfo(null))
      .finally(() => setLoading(false));
  }, [auth.token, invoiceId]);

  const isDolibarrPaid =
    info?.hasDolibarrInvoice && info.dolibarrStatus === 2;

  const handleDelete = async () => {
    if (!auth.token) return;
    try {
      setDeleting(true);
      setError(null);
      const result = await deleteServiceInvoice(auth.token, invoiceId);
      setDeleted(true);
      if (result.dolibarrWarning) {
        setWarning(result.dolibarrWarning);
        if (result.dolibarrWarningDetail) {
          setWarningDetail(result.dolibarrWarningDetail);
        }
      } else {
        onDeleted();
      }
    } catch (err: any) {
      if (isHttpError(err)) setError(err.message);
      else setError('Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open onClose={deleted ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}
      >
        {deleted ? (
          <CheckCircleIcon color="success" />
        ) : (
          <WarningAmberIcon color="error" />
        )}
        {deleted ? 'Facture supprimée' : 'Supprimer la facture'}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ ml: 'auto' }}
        >
          {invoiceNumber}
        </Typography>
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : deleted ? (
          <Box>
            {warning ? (
              <>
                <Alert severity="warning" sx={{ mb: 1 }}>
                  <Typography variant="body2" fontWeight={600}>
                    Facture supprimée uniquement localement
                  </Typography>
                  <Typography variant="body2">{warning}</Typography>
                </Alert>
                {warningDetail && (
                  <>
                    <Button
                      size="small"
                      onClick={() => setShowDetail(!showDetail)}
                      sx={{ textTransform: 'none' }}
                    >
                      {showDetail ? '▾ Masquer' : '▸ Détail technique'}
                    </Button>
                    <Collapse in={showDetail}>
                      <Box
                        component="pre"
                        sx={{
                          mt: 1,
                          p: 1.5,
                          fontSize: '0.75rem',
                          bgcolor: 'grey.100',
                          borderRadius: 1,
                          overflow: 'auto',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {warningDetail}
                      </Box>
                    </Collapse>
                  </>
                )}
              </>
            ) : (
              <Typography variant="body2">
                La facture a été supprimée avec succès.
              </Typography>
            )}
          </Box>
        ) : (
          <Box>
            {info?.isDraft ? (
              <Typography variant="body2">
                Ce brouillon n'a pas de numéro de facture définitif. Sa
                suppression n'a aucun impact sur la numérotation.
              </Typography>
            ) : (
              <>
                {isDolibarrPaid && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight={600}>
                      ⚠️ Facture payée dans Dolibarr
                    </Typography>
                    <Typography variant="body2">
                      Cette facture est payée dans Dolibarr et ne peut pas y
                      être supprimée automatiquement. Vous devrez créer un
                      avoir ou l'annuler manuellement dans l'interface
                      Dolibarr.
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      La suppression ici n'affectera que l'application locale,
                      pas la comptabilité Dolibarr.
                    </Typography>
                  </Alert>
                )}
                {info?.hasDolibarrInvoice && !isDolibarrPaid && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight={600}>
                      Facture Dolibarr
                    </Typography>
                    <Typography variant="body2">
                      Cette facture est liée à Dolibarr. Elle sera également
                      supprimée dans Dolibarr lors de la suppression.
                    </Typography>
                  </Alert>
                )}
                <Alert severity="error">
                  <Typography variant="body2" fontWeight={600}>
                    Attention — Cadre légal
                  </Typography>
                  <Typography variant="body2">
                    En Belgique, l'article 5 de l'Arrêté royal n° 1 (TVA) et
                    l'article 226 de la Directive européenne 2006/112/CE
                    imposent une numérotation séquentielle et ininterrompue des
                    factures. Privilégiez l'émission d'une note de crédit
                    plutôt que la suppression.
                  </Typography>
                </Alert>
              </>
            )}
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {deleted ? (
          <Button variant="contained" onClick={onDeleted}>
            OK
          </Button>
        ) : (
          <>
            <Button onClick={onClose}>Annuler</Button>
            <Button
              variant="contained"
              color="error"
              disabled={loading || deleting}
              startIcon={
                deleting ? (
                  <CircularProgress size={18} color="inherit" />
                ) : undefined
              }
              onClick={handleDelete}
            >
              Supprimer{isDolibarrPaid ? ' localement' : ' définitivement'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default DeleteInvoiceModal;
