import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth } from '../hooks/AuthProvider';
import {
  getServiceInvoice,
  updateServiceInvoice,
  isHttpError,
} from '../utils/api';
import { ServiceInvoice, ServiceInvoiceStatus } from '../utils/types';
import InvoiceForm, {
  InvoiceFormData,
} from '../components/invoices/InvoiceForm';

const ServiceInvoiceEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const auth = useAuth();
  const [invoice, setInvoice] = useState<ServiceInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchInvoice = useCallback(async () => {
    if (!auth.token || !id) return;
    try {
      setLoading(true);
      const data = await getServiceInvoice(auth.token, parseInt(id));
      if (data.status !== ServiceInvoiceStatus.DRAFT) {
        navigate(`/factures/${id}`, { replace: true });
        return;
      }
      setInvoice(data);
    } catch (err: any) {
      setLoadError(err?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [auth.token, id, navigate]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const handleSubmit = async (data: InvoiceFormData) => {
    if (!id) return;
    setError(null);
    setSaving(true);
    try {
      await updateServiceInvoice(auth.token, parseInt(id), data);
      navigate(`/factures/${id}`);
    } catch (err: any) {
      setError(
        isHttpError(err) ? err.message : 'Erreur lors de la mise à jour',
      );
    } finally {
      setSaving(false);
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

  if (loadError || !invoice) {
    return (
      <Box sx={{ p: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/factures')}
          sx={{ mb: 2 }}
        >
          Retour aux factures
        </Button>
        <Alert severity="error">
          {loadError || 'Facture introuvable'}
        </Alert>
      </Box>
    );
  }

  const initialData: Partial<InvoiceFormData> = {
    clientFirstName: invoice.clientFirstName,
    clientLastName: invoice.clientLastName,
    clientPhone: invoice.clientPhone,
    clientEmail: invoice.clientEmail,
    clientAddress: invoice.clientAddress,
    clientCity: invoice.clientCity,
    clientPostalCode: invoice.clientPostalCode,
    paymentMethod: invoice.paymentMethod,
    remarks: invoice.remarks || '',
    lines: invoice.lines.map((l) => ({
      description: l.description,
      type: l.type,
      unit: l.unit,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
    })),
    machineRepairId: invoice.machineRepairId ?? undefined,
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1300, mx: 'auto' }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(`/factures/${id}`)}
        sx={{ mb: 2 }}
      >
        Retour à la facture
      </Button>

      <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>
        Modifier {invoice.invoiceNumber}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <InvoiceForm
        initialData={initialData}
        onSubmit={handleSubmit}
        submitLabel="Mettre à jour"
        saving={saving}
      />
    </Box>
  );
};

export default ServiceInvoiceEdit;
