import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Link,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import UndoIcon from '@mui/icons-material/Undo';
import RefreshIcon from '@mui/icons-material/Refresh';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import { useAuth } from '../hooks/AuthProvider';
import {
  getServiceInvoice,
  getServiceInvoicePdf,
  markServiceInvoicePaid,
  markServiceInvoiceSent,
  resyncServiceInvoice,
  isHttpError,
} from '../utils/api';
import { ServiceInvoice, ServiceInvoiceStatus } from '../utils/types';
import {
  formatCurrency,
  getInvoiceStatusLabel,
  getInvoiceStatusColor,
  getPaymentMethodLabel,
} from '../utils/invoiceUtils';
import SendInvoiceModal from '../components/invoices/SendInvoiceModal';
import DeleteInvoiceModal from '../components/invoices/DeleteInvoiceModal';

const ServiceInvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const auth = useAuth();
  const [invoice, setInvoice] = useState<ServiceInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [dolibarrWarning, setDolibarrWarning] = useState<string | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchInvoice = useCallback(async () => {
    if (!auth.token || !id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getServiceInvoice(auth.token, parseInt(id));
      setInvoice(data);
    } catch (err: any) {
      setError(err?.message || 'Erreur lors du chargement de la facture');
    } finally {
      setLoading(false);
    }
  }, [auth.token, id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const handleAction = async (
    action: string,
    fn: () => Promise<any>,
  ) => {
    try {
      setActionLoading(action);
      setActionError(null);
      setDolibarrWarning(null);
      const result = await fn();
      if (result?.dolibarrWarning) {
        setDolibarrWarning(result.dolibarrWarning);
      }
      await fetchInvoice();
    } catch (err: any) {
      setActionError(
        isHttpError(err) ? err.message : "Une erreur s'est produite",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkPaid = () =>
    handleAction('paid', () => markServiceInvoicePaid(auth.token, parseInt(id!)));

  const handleRevertToSent = () =>
    handleAction('revert', () => markServiceInvoiceSent(auth.token, parseInt(id!)));

  const handleResync = () =>
    handleAction('resync', () => resyncServiceInvoice(auth.token, parseInt(id!)));

  const handleDownloadPdf = async () => {
    if (!auth.token || !id) return;
    try {
      setActionLoading('pdf');
      const blob = await getServiceInvoicePdf(auth.token, parseInt(id));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Facture_${invoice?.invoiceNumber || id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setActionError(
        isHttpError(err) ? err.message : 'Erreur téléchargement PDF',
      );
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '60vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error || !invoice) {
    return (
      <Box sx={{ p: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/factures')}
          sx={{ mb: 2 }}
        >
          Retour aux factures
        </Button>
        <Alert severity="error">{error || 'Facture introuvable'}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1300, mx: 'auto' }}>
      {/* Back button */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/factures')}
        sx={{ mb: 2 }}
      >
        Retour aux factures
      </Button>

      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 2,
          mb: 1,
        }}
      >
        <Typography variant="h5" fontWeight="bold">
          {invoice.invoiceNumber}
        </Typography>
        <Chip
          label={getInvoiceStatusLabel(invoice.status)}
          size="small"
          sx={{
            backgroundColor: getInvoiceStatusColor(invoice.status),
            color: '#fff',
            fontWeight: 600,
          }}
        />
        {invoice.type === 'INSTALLATION' && (
          <Chip label="Installation" size="small" color="info" />
        )}
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Créée le {new Date(invoice.createdAt).toLocaleDateString('fr-FR')}{' '}
        {invoice.dolibarrSyncStatus === 'synced' && (
          <span style={{ color: '#4caf50' }}>• Synced Dolibarr</span>
        )}
      </Typography>

      {/* Dolibarr sync error banner */}
      {invoice.dolibarrSyncStatus === 'error' && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button
              size="small"
              color="inherit"
              startIcon={
                <RefreshIcon
                  sx={{
                    animation:
                      actionLoading === 'resync'
                        ? 'spin 1s linear infinite'
                        : 'none',
                    '@keyframes spin': {
                      from: { transform: 'rotate(0deg)' },
                      to: { transform: 'rotate(360deg)' },
                    },
                  }}
                />
              }
              disabled={actionLoading === 'resync'}
              onClick={handleResync}
            >
              Resync Dolibarr
            </Button>
          }
        >
          Erreur de synchronisation Dolibarr
        </Alert>
      )}

      {/* Action/Dolibarr errors */}
      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {actionError}
        </Alert>
      )}
      {dolibarrWarning && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>Avertissement Dolibarr :</strong> {dolibarrWarning}
        </Alert>
      )}

      {/* Action buttons */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
        {invoice.status === ServiceInvoiceStatus.DRAFT && (
          <>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/factures/${invoice.id}/edit`)}
            >
              Modifier
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SendIcon />}
              disabled={
                !invoice.clientEmail || invoice.lines.length === 0
              }
              onClick={() => setShowSendModal(true)}
            >
              Valider et envoyer
            </Button>
          </>
        )}
        {invoice.status !== ServiceInvoiceStatus.PAID && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setShowDeleteModal(true)}
          >
            Supprimer
          </Button>
        )}
        {invoice.status === ServiceInvoiceStatus.SENT && (
          <Button
            variant="contained"
            color="success"
            startIcon={
              actionLoading === 'paid' ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <CheckCircleIcon />
              )
            }
            disabled={actionLoading === 'paid'}
            onClick={handleMarkPaid}
          >
            Marquer payée
          </Button>
        )}
        {invoice.status === ServiceInvoiceStatus.PAID && (
          <Button
            variant="outlined"
            color="warning"
            startIcon={
              actionLoading === 'revert' ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <UndoIcon />
              )
            }
            disabled={actionLoading === 'revert'}
            onClick={handleRevertToSent}
          >
            Remettre en non payée
          </Button>
        )}
        {invoice.status !== ServiceInvoiceStatus.DRAFT && (
          <Button
            variant="outlined"
            startIcon={
              actionLoading === 'pdf' ? (
                <CircularProgress size={18} />
              ) : (
                <DownloadIcon />
              )
            }
            disabled={actionLoading === 'pdf'}
            onClick={handleDownloadPdf}
          >
            PDF
          </Button>
        )}
      </Box>

      {/* Client info */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Client
          </Typography>
          <Typography variant="body1" fontWeight="bold">
            {invoice.clientFirstName} {invoice.clientLastName}
          </Typography>
          {invoice.clientPhone && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <PhoneIcon fontSize="small" color="action" />
              <Link href={`tel:${invoice.clientPhone}`} underline="hover">
                {invoice.clientPhone}
              </Link>
            </Box>
          )}
          {invoice.clientEmail && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <EmailIcon fontSize="small" color="action" />
              <Link href={`mailto:${invoice.clientEmail}`} underline="hover">
                {invoice.clientEmail}
              </Link>
            </Box>
          )}
          {(invoice.clientAddress || invoice.clientCity) && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {[
                invoice.clientAddress,
                invoice.clientPostalCode,
                invoice.clientCity,
              ]
                .filter(Boolean)
                .join(', ')}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Linked repair */}
      {invoice.machineRepairId && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Liée à la réparation{' '}
          <Link
            component="button"
            onClick={() => navigate(`/reparation/${invoice.machineRepairId}`)}
            sx={{ fontWeight: 'bold' }}
          >
            #{invoice.machineRepairId}
          </Link>
        </Alert>
      )}

      {/* Invoice lines */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Prestations
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Description</TableCell>
                <TableCell align="center">Qté</TableCell>
                <TableCell align="right">P.U. HT</TableCell>
                <TableCell align="right">Total HT</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoice.lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>{line.description}</TableCell>
                  <TableCell align="center">
                    {line.quantity} {line.unit}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(line.unitPrice)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {formatCurrency(line.totalPrice)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Divider sx={{ my: 2 }} />
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 0.5,
            }}
          >
            <Box sx={{ display: 'flex', gap: 4, width: 250 }}>
              <Typography variant="body2" color="text.secondary">
                Sous-total HT
              </Typography>
              <Typography variant="body2" fontWeight={600} sx={{ ml: 'auto' }}>
                {formatCurrency(invoice.subtotalHT)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 4, width: 250 }}>
              <Typography variant="body2" color="text.secondary">
                TVA ({invoice.vatRate}%)
              </Typography>
              <Typography variant="body2" fontWeight={600} sx={{ ml: 'auto' }}>
                {formatCurrency(invoice.vatAmount)}
              </Typography>
            </Box>
            <Divider sx={{ width: 250, my: 1 }} />
            <Box sx={{ display: 'flex', gap: 4, width: 250 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Total TTC
              </Typography>
              <Typography
                variant="subtitle1"
                fontWeight="bold"
                color="primary"
                sx={{ ml: 'auto' }}
              >
                {formatCurrency(invoice.totalTTC)}
              </Typography>
            </Box>
            {invoice.deposit > 0 && (
              <>
                <Box sx={{ display: 'flex', gap: 4, width: 250 }}>
                  <Typography variant="body2" color="text.secondary">
                    Acompte versé
                  </Typography>
                  <Typography
                    variant="body2"
                    color="success.main"
                    sx={{ ml: 'auto' }}
                  >
                    - {formatCurrency(invoice.deposit)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 4, width: 250 }}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Net à payer
                  </Typography>
                  <Typography
                    variant="subtitle2"
                    fontWeight="bold"
                    color="primary"
                    sx={{ ml: 'auto' }}
                  >
                    {formatCurrency(invoice.totalTTC - invoice.deposit)}
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Payment method */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Paiement
          </Typography>
          <Typography variant="body1" fontWeight={600}>
            {getPaymentMethodLabel(invoice.paymentMethod)}
          </Typography>
        </CardContent>
      </Card>

      {/* Remarks */}
      {invoice.remarks && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              gutterBottom
            >
              Remarques
            </Typography>
            <Typography
              variant="body2"
              sx={{ whiteSpace: 'pre-wrap' }}
            >
              {invoice.remarks}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      {showSendModal && (
        <SendInvoiceModal
          invoiceId={invoice.id}
          clientEmail={invoice.clientEmail}
          onClose={() => setShowSendModal(false)}
          onSent={() => {
            setShowSendModal(false);
            fetchInvoice();
          }}
        />
      )}

      {showDeleteModal && (
        <DeleteInvoiceModal
          invoiceId={invoice.id}
          invoiceNumber={invoice.invoiceNumber}
          onClose={() => setShowDeleteModal(false)}
          onDeleted={() => navigate('/factures')}
        />
      )}
    </Box>
  );
};

export default ServiceInvoiceDetail;
