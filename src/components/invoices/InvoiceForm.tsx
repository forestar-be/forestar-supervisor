import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Divider,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import { ServiceInvoiceItemConfig } from '../../utils/types';
import { formatCurrency, calculateLineTotals } from '../../utils/invoiceUtils';
import { getInvoiceItemConfigs } from '../../utils/api';
import { useAuth } from '../../hooks/AuthProvider';

export interface InvoiceFormLine {
  description: string;
  type: string;
  unit: string;
  quantity: number;
  unitPrice: number;
}

export interface InvoiceFormData {
  clientFirstName: string;
  clientLastName: string;
  clientPhone: string;
  clientEmail: string;
  clientAddress: string;
  clientCity: string;
  clientPostalCode: string;
  paymentMethod: string;
  remarks: string;
  lines: InvoiceFormLine[];
  machineRepairId?: number;
}

const EMPTY_LINE: InvoiceFormLine = {
  description: '',
  type: 'custom',
  unit: 'pièce',
  quantity: 1,
  unitPrice: 0,
};

const UNIT_OPTIONS = [
  { value: 'pièce', label: 'Pièce' },
  { value: 'heure', label: 'Heure' },
  { value: 'km', label: 'Km' },
  { value: 'm', label: 'Mètre' },
  { value: 'forfait', label: 'Forfait' },
];

const PAYMENT_OPTIONS = [
  { value: 'CASH', label: 'Espèces' },
  { value: 'CARD', label: 'Carte' },
  { value: 'TRANSFER', label: 'Virement' },
];

interface InvoiceFormProps {
  initialData?: Partial<InvoiceFormData>;
  onSubmit: (data: InvoiceFormData) => Promise<void>;
  submitLabel?: string;
  saving?: boolean;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({
  initialData,
  onSubmit,
  submitLabel = 'Enregistrer',
  saving = false,
}) => {
  const auth = useAuth();
  const [form, setForm] = useState<InvoiceFormData>({
    clientFirstName: '',
    clientLastName: '',
    clientPhone: '',
    clientEmail: '',
    clientAddress: '',
    clientCity: '',
    clientPostalCode: '',
    paymentMethod: 'CASH',
    remarks: '',
    lines: [{ ...EMPTY_LINE }],
    ...initialData,
  });
  const [itemConfigs, setItemConfigs] = useState<ServiceInvoiceItemConfig[]>(
    [],
  );

  useEffect(() => {
    if (auth.token) {
      getInvoiceItemConfigs(auth.token, { category: 'REPAIR' })
        .then(setItemConfigs)
        .catch(() => {});
    }
  }, [auth.token]);

  useEffect(() => {
    if (initialData) {
      setForm((prev) => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  const updateField = (field: keyof InvoiceFormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateLine = (
    index: number,
    field: keyof InvoiceFormLine,
    value: any,
  ) => {
    setForm((prev) => {
      const newLines = [...prev.lines];
      newLines[index] = { ...newLines[index], [field]: value };
      return { ...prev, lines: newLines };
    });
  };

  const addLine = () => {
    setForm((prev) => ({
      ...prev,
      lines: [...prev.lines, { ...EMPTY_LINE }],
    }));
  };

  const addFromConfig = (config: ServiceInvoiceItemConfig) => {
    setForm((prev) => ({
      ...prev,
      lines: [
        ...prev.lines,
        {
          description: config.name,
          type: config.type,
          unit: config.unit,
          quantity: 1,
          unitPrice: config.defaultPrice,
        },
      ],
    }));
  };

  const removeLine = (index: number) => {
    if (form.lines.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index),
    }));
  };

  const totals = calculateLineTotals(form.lines);

  const canSubmit =
    form.clientLastName.trim() !== '' && form.lines.length > 0 && !saving;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(form);
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {/* Client info */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Informations client
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Nom *"
                value={form.clientLastName}
                onChange={(e) => updateField('clientLastName', e.target.value)}
                fullWidth
                size="small"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Prénom"
                value={form.clientFirstName}
                onChange={(e) =>
                  updateField('clientFirstName', e.target.value)
                }
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Téléphone"
                value={form.clientPhone}
                onChange={(e) => updateField('clientPhone', e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Email"
                type="email"
                value={form.clientEmail}
                onChange={(e) => updateField('clientEmail', e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Adresse"
                value={form.clientAddress}
                onChange={(e) =>
                  updateField('clientAddress', e.target.value)
                }
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Code postal"
                value={form.clientPostalCode}
                onChange={(e) =>
                  updateField('clientPostalCode', e.target.value)
                }
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={8}>
              <TextField
                label="Ville"
                value={form.clientCity}
                onChange={(e) => updateField('clientCity', e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Invoice lines */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography variant="subtitle2" color="text.secondary">
              Lignes de facture
            </Typography>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={addLine}
            >
              Ajouter une ligne
            </Button>
          </Box>

          {/* Quick add from configs */}
          {itemConfigs.length > 0 && (
            <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ width: '100%', mb: 0.5 }}
              >
                Ajout rapide :
              </Typography>
              {itemConfigs
                .filter((c) => c.isActive)
                .map((config) => (
                  <Button
                    key={config.id}
                    size="small"
                    variant="outlined"
                    onClick={() => addFromConfig(config)}
                    sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                  >
                    {config.name}
                    {config.defaultPrice > 0 &&
                      ` (${formatCurrency(config.defaultPrice)})`}
                  </Button>
                ))}
            </Box>
          )}

          {form.lines.map((line, index) => (
            <Box key={index} sx={{ mb: 2 }}>
              <Grid container spacing={1} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Description"
                    value={line.description}
                    onChange={(e) =>
                      updateLine(index, 'description', e.target.value)
                    }
                    fullWidth
                    size="small"
                    required
                  />
                </Grid>
                <Grid item xs={4} sm={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Unité</InputLabel>
                    <Select
                      value={line.unit}
                      label="Unité"
                      onChange={(e) =>
                        updateLine(index, 'unit', e.target.value)
                      }
                    >
                      {UNIT_OPTIONS.map((o) => (
                        <MenuItem key={o.value} value={o.value}>
                          {o.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={4} sm={2}>
                  <TextField
                    label="Quantité"
                    type="number"
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(
                        index,
                        'quantity',
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    fullWidth
                    size="small"
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>
                <Grid item xs={4} sm={2}>
                  <TextField
                    label="Prix unit. HT"
                    type="number"
                    value={line.unitPrice}
                    onChange={(e) =>
                      updateLine(
                        index,
                        'unitPrice',
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    fullWidth
                    size="small"
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>
                <Grid item xs={6} sm={1.5}>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    textAlign="right"
                  >
                    {formatCurrency(
                      Math.round(line.quantity * line.unitPrice * 100) / 100,
                    )}
                  </Typography>
                </Grid>
                <Grid item xs={2} sm={0.5}>
                  <Tooltip title="Supprimer la ligne">
                    <span>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => removeLine(index)}
                        disabled={form.lines.length <= 1}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Grid>
              </Grid>
            </Box>
          ))}

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
                {formatCurrency(totals.subtotalHT)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 4, width: 250 }}>
              <Typography variant="body2" color="text.secondary">
                TVA (21%)
              </Typography>
              <Typography variant="body2" fontWeight={600} sx={{ ml: 'auto' }}>
                {formatCurrency(totals.vatAmount)}
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
                {formatCurrency(totals.totalTTC)}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Payment & Remarks */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Mode de paiement</InputLabel>
                <Select
                  value={form.paymentMethod}
                  label="Mode de paiement"
                  onChange={(e) =>
                    updateField('paymentMethod', e.target.value)
                  }
                >
                  {PAYMENT_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={8}>
              <TextField
                label="Remarques"
                value={form.remarks}
                onChange={(e) => updateField('remarks', e.target.value)}
                fullWidth
                size="small"
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Submit */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 4 }}>
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={!canSubmit}
          startIcon={
            saving ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <SaveIcon />
            )
          }
        >
          {submitLabel}
        </Button>
      </Box>
    </Box>
  );
};

export default InvoiceForm;
