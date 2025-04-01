import React, { useCallback, useEffect, useState } from 'react';
import {
  Backdrop,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/AuthProvider';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import {
  createPurchaseOrder,
  fetchPurchaseOrderById,
  updatePurchaseOrder,
} from '../utils/api';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { styled } from '@mui/material/styles';
import { PurchaseOrderPdfDocument } from '../components/PurchaseOrderPdf';
import { pdf } from '@react-pdf/renderer';
import { notifyError } from '../utils/notifications';
import PDFMerger from 'pdf-merger-js/browser';
import {
  PurchaseOrderFormData,
  PurchaseOrder,
  RobotInventory,
  InventoryCategory,
} from '../utils/types';
import { formatPriceNumberToFrenchFormatStr } from '../utils/common.utils';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useAppDispatch } from '../store/hooks';
import { fetchInventorySummaryAsync } from '../store/robotInventorySlice';

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

interface FormSectionProps {
  title: string;
  children: React.ReactNode;
  marginBottom?: number;
}

const FormSection: React.FC<FormSectionProps> = ({
  title,
  children,
  marginBottom = 4,
}) => (
  <>
    <Typography variant="h6" gutterBottom>
      {title}
    </Typography>
    <Grid container spacing={2} sx={{ mb: marginBottom }}>
      {children}
    </Grid>
  </>
);

interface FormTextFieldProps {
  name: keyof PurchaseOrderFormData;
  label: string;
  value: any;
  onChange: (field: keyof PurchaseOrderFormData, value: any) => void;
  required?: boolean;
  type?: string;
  fullWidth?: boolean;
  startAdornment?: React.ReactNode;
  xs?: number;
  sm?: number;
}

const FormTextField: React.FC<FormTextFieldProps> = ({
  name,
  label,
  value,
  onChange,
  required = false,
  type = 'text',
  fullWidth = true,
  startAdornment,
  xs = 12,
  sm = 6,
}) => (
  <Grid item xs={xs} sm={sm}>
    <TextField
      required={required}
      fullWidth={fullWidth}
      label={label}
      type={type}
      value={value}
      onChange={(e) =>
        onChange(
          name,
          type === 'number' ? Number(e.target.value) : e.target.value,
        )
      }
      InputProps={
        startAdornment
          ? {
              startAdornment: (
                <InputAdornment position="start">
                  {startAdornment}
                </InputAdornment>
              ),
            }
          : undefined
      }
    />
  </Grid>
);

// Reusable select field component
interface FormSelectFieldProps {
  name: keyof PurchaseOrderFormData;
  label: string;
  value: any;
  onChange: (field: keyof PurchaseOrderFormData, value: any) => void;
  options: Array<{ value: any; label: string }>;
  required?: boolean;
  xs?: number;
  sm?: number;
  disabled?: boolean;
}

const FormSelectField: React.FC<FormSelectFieldProps> = ({
  name,
  label,
  value,
  onChange,
  options,
  required = false,
  xs = 12,
  sm = 6,
  disabled = false,
}) => (
  <Grid item xs={xs} sm={sm}>
    <FormControl fullWidth required={required}>
      <InputLabel id={`${name}-select-label`}>{label}</InputLabel>
      <Select
        labelId={`${name}-select-label`}
        value={value !== null ? value : ''}
        label={label}
        onChange={(e) =>
          onChange(name, e.target.value === '' ? null : e.target.value)
        }
        disabled={disabled}
      >
        {options.map((option) => (
          <MenuItem
            key={String(option.value || 'empty')}
            value={option.value !== null ? option.value : ''}
          >
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  </Grid>
);

const PurchaseOrderForm: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const dispatch = useAppDispatch();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<PurchaseOrderFormData>({
    clientFirstName: '',
    clientLastName: '',
    clientAddress: '',
    clientCity: '',
    clientPhone: '',
    deposit: 0,
    robotInventoryId: 0,
    serialNumber: '',
    pluginInventoryId: null,
    antennaInventoryId: null,
    shelterInventoryId: null,
    hasWire: false,
    wireLength: 0,
    hasAntennaSupport: false,
    hasPlacement: false,
    installationDate: '',
    needsInstaller: false,
    installationNotes: '',
    hasAppointment: false,
    isInstalled: false,
    isInvoiced: false,
  });
  const [selectedInvoice, setSelectedInvoice] = useState<File | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(
    null,
  );
  const { texts } = useSelector((state: RootState) => state.installationTexts);
  const { items: inventoryItems, loading: inventoryLoading } = useSelector(
    (state: RootState) => state.robotInventory,
  );

  // Filter items by category
  const robots = inventoryItems.filter(
    (item) => item.category === InventoryCategory.ROBOT,
  );
  const antennas = inventoryItems.filter(
    (item) => item.category === InventoryCategory.ANTENNA,
  );
  const plugins = inventoryItems.filter(
    (item) => item.category === InventoryCategory.PLUGIN,
  );
  const shelters = inventoryItems.filter(
    (item) => item.category === InventoryCategory.SHELTER,
  );

  // Fetch inventory data if needed
  useEffect(() => {
    if (token && inventoryItems.length === 0 && !inventoryLoading) {
      dispatch(fetchInventorySummaryAsync(token));
    }
  }, [token, inventoryItems.length, inventoryLoading, dispatch]);

  // Fetch purchase order if editing
  useEffect(() => {
    const fetchPurchaseOrder = async () => {
      if (!token || !id) return;
      try {
        setLoading(true);
        const data = await fetchPurchaseOrderById(token, parseInt(id));
        // Ensure all properties are set with defaults for missing values
        setPurchaseOrder({
          ...data,
          pluginInventoryId: data.pluginInventoryId || null,
          antennaInventoryId: data.antennaInventoryId || null,
          shelterInventoryId: data.shelterInventoryId || null,
        });

        setFormData({
          clientFirstName: data.clientFirstName,
          clientLastName: data.clientLastName,
          clientAddress: data.clientAddress,
          clientCity: data.clientCity,
          clientPhone: data.clientPhone,
          deposit: data.deposit,
          robotInventoryId: data.robotInventoryId,
          serialNumber: data.serialNumber || '',
          pluginInventoryId: data.pluginInventoryId || null,
          antennaInventoryId: data.antennaInventoryId || null,
          shelterInventoryId: data.shelterInventoryId || null,
          hasWire: data.hasWire,
          wireLength: data.wireLength || 0,
          hasAntennaSupport: data.hasAntennaSupport || false,
          hasPlacement: data.hasPlacement || false,
          installationDate: data.installationDate || '',
          needsInstaller: data.needsInstaller,
          installationNotes: data.installationNotes || '',
          hasAppointment: data.hasAppointment || false,
          isInstalled: data.isInstalled || false,
        });
      } catch (error) {
        console.error('Error fetching purchase order:', error);
        toast.error('Erreur lors du chargement du bon de commande');
      } finally {
        setLoading(false);
      }
    };

    if (isEditing) {
      fetchPurchaseOrder();
    }
  }, [token, id, isEditing]);

  // Handle form field changes
  const handleChange = useCallback(
    (field: keyof PurchaseOrderFormData, value: any) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    [],
  );

  // Handle checkbox changes
  const handleCheckboxChange = useCallback(
    (field: keyof PurchaseOrderFormData) => {
      setFormData((prev) => ({
        ...prev,
        [field]: !prev[field as keyof typeof prev],
      }));
    },
    [],
  );

  // Generate the PDF and return the blob
  const generatePDF = async (order: PurchaseOrder) => {
    try {
      console.log('order', order);
      console.log('texts', texts);
      // Create the PDF document
      const pdfBlob = await pdf(
        <PurchaseOrderPdfDocument
          purchaseOrder={order}
          installationTexts={texts}
        />,
      ).toBlob();

      return pdfBlob;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  };

  // Merge PDFs if invoice is available
  const mergePDFs = async (orderPdfBlob: Blob): Promise<Blob> => {
    if (!selectedInvoice) {
      return orderPdfBlob;
    }

    try {
      const merger = new PDFMerger();

      // Add the order PDF
      await merger.add(orderPdfBlob);

      // Add the invoice PDF if it exists
      await merger.add(selectedInvoice);

      // Set metadata if needed
      await merger.setMetadata({
        producer: 'FORESTAR Purchase Order System',
      });

      // Get the merged PDF as a blob
      const mergedPdf = await merger.saveAsBlob();
      return mergedPdf;
    } catch (error) {
      console.error('Error merging PDFs:', error);
      // If merging fails, return the original order PDF
      return orderPdfBlob;
    }
  };

  // Handle invoice file selection
  const handleInvoiceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInvoiceError(null);
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      // Verify it's a PDF
      if (file.type !== 'application/pdf') {
        setInvoiceError('Le fichier doit être au format PDF');
        setSelectedInvoice(null);
        return;
      }

      setSelectedInvoice(file);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    // Form validation
    if (
      !formData.clientFirstName ||
      !formData.clientLastName ||
      !formData.robotInventoryId
    ) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      setSaving(true);

      // Create updated order data (used for both new and edit cases)
      const updatedOrder: PurchaseOrder = {
        id: isEditing && id ? parseInt(id) : 0,
        createdAt: purchaseOrder?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        clientFirstName: formData.clientFirstName,
        clientLastName: formData.clientLastName,
        clientAddress: formData.clientAddress,
        clientCity: formData.clientCity,
        clientPhone: formData.clientPhone,
        deposit: formData.deposit,
        robotInventoryId: formData.robotInventoryId,
        pluginInventoryId: formData.pluginInventoryId,
        antennaInventoryId: formData.antennaInventoryId,
        shelterInventoryId: formData.shelterInventoryId,
        hasWire: formData.hasWire,
        wireLength: formData.wireLength || null,
        hasAntennaSupport: formData.hasAntennaSupport,
        hasPlacement: formData.hasPlacement,
        installationDate: formData.installationDate || null,
        needsInstaller: formData.needsInstaller,
        installationNotes: formData.installationNotes || null,
        hasAppointment:
          formData.hasAppointment || purchaseOrder?.hasAppointment || false,
        isInstalled:
          formData.isInstalled || purchaseOrder?.isInstalled || false,
        isInvoiced: formData.isInvoiced || purchaseOrder?.isInvoiced || false,
        serialNumber:
          formData.serialNumber || purchaseOrder?.serialNumber || '',
        orderPdfId: purchaseOrder?.orderPdfId || null,
        robotInventory: robots.find((r) => r.id === formData.robotInventoryId),
        plugin: formData.pluginInventoryId
          ? plugins.find((p) => p.id === formData.pluginInventoryId)
          : undefined,
        antenna: formData.antennaInventoryId
          ? antennas.find((a) => a.id === formData.antennaInventoryId)
          : undefined,
        shelter: formData.shelterInventoryId
          ? shelters.find((s) => s.id === formData.shelterInventoryId)
          : undefined,
      };

      // Generate PDF with updated data
      const pdfBlob = await generatePDF(updatedOrder);

      // Only merge with invoice if one is selected
      const finalPdfBlob = selectedInvoice ? await mergePDFs(pdfBlob) : pdfBlob;

      if (isEditing && id) {
        // Update existing purchase order
        await updatePurchaseOrder(token, parseInt(id), formData, finalPdfBlob);
        toast.success('Bon de commande mis à jour avec succès');
      } else {
        // Create new purchase order
        await createPurchaseOrder(token, formData, finalPdfBlob);
        toast.success('Bon de commande créé avec succès');
      }

      navigate('/purchase-orders');
    } catch (error) {
      console.error('Error saving purchase order:', error);

      // Display specific error message if available
      if (error instanceof Error) {
        if (error.message.includes('Aucun robot disponible')) {
          notifyError(
            "Aucun robot disponible pour ce mois-ci. Veuillez vérifier le plan d'inventaire.",
          );
        } else {
          notifyError(
            `Erreur lors de la sauvegarde du bon de commande: ${error.message}`,
          );
        }
      } else {
        notifyError('Erreur lors de la sauvegarde du bon de commande');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading || inventoryLoading) {
    return <Typography>Chargement...</Typography>;
  }

  // Prepare options for select fields
  const robotOptions = robots.map((robot) => ({
    value: robot.id,
    label: `${robot.name} ${robot.reference ? `(réf. ${robot.reference})` : ''} - ${robot.sellingPrice ? formatPriceNumberToFrenchFormatStr(robot.sellingPrice) : 'Aucun prix'}`,
  }));

  const antennaOptions = [
    { value: null, label: 'Aucune' },
    ...antennas.map((antenna) => ({
      value: antenna.id,
      label: `${antenna.name} ${antenna.reference ? `(réf. ${antenna.reference})` : ''} - ${antenna.sellingPrice ? formatPriceNumberToFrenchFormatStr(antenna.sellingPrice) : 'Aucun prix'}`,
    })),
  ];

  const pluginOptions = [
    { value: null, label: 'Aucun' },
    ...plugins.map((plugin) => ({
      value: plugin.id,
      label: `${plugin.name} ${plugin.reference ? `(réf. ${plugin.reference})` : ''} - ${plugin.sellingPrice ? formatPriceNumberToFrenchFormatStr(plugin.sellingPrice) : 'Aucun prix'}`,
    })),
  ];

  const shelterOptions = [
    { value: null, label: 'Aucun' },
    ...shelters.map((shelter) => ({
      value: shelter.id,
      label: `${shelter.name} ${shelter.reference ? `(réf. ${shelter.reference})` : ''} - ${shelter.sellingPrice ? formatPriceNumberToFrenchFormatStr(shelter.sellingPrice) : 'Aucun prix'}`,
    })),
  ];

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', py: 2 }}>
      <Paper sx={{ p: 3 }}>
        <Backdrop
          sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
          open={saving}
        >
          <CircularProgress color="inherit" />
        </Backdrop>

        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/purchase-orders')}
            sx={{ mr: 2 }}
          >
            Retour
          </Button>
          <Typography variant="h5" component="h1">
            {isEditing
              ? 'Modifier le bon de commande'
              : 'Créer un bon de commande'}
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmit}>
          <FormSection title="Informations du client">
            <FormTextField
              name="clientFirstName"
              label="Prénom"
              value={formData.clientFirstName}
              onChange={handleChange}
              required
            />
            <FormTextField
              name="clientLastName"
              label="Nom"
              value={formData.clientLastName}
              onChange={handleChange}
              required
            />
            <FormTextField
              name="clientAddress"
              label="Adresse"
              value={formData.clientAddress}
              onChange={handleChange}
              xs={12}
              sm={12}
            />
            <FormTextField
              name="clientCity"
              label="Ville"
              value={formData.clientCity}
              onChange={handleChange}
            />
            <FormTextField
              name="clientPhone"
              label="Téléphone"
              value={formData.clientPhone}
              onChange={handleChange}
            />
            <FormTextField
              name="deposit"
              label="Acompte"
              type="number"
              value={formData.deposit}
              onChange={handleChange}
              startAdornment="€"
            />
          </FormSection>

          <FormSection title="Détails du robot et accessoires">
            <FormSelectField
              name="robotInventoryId"
              label="Type de robot"
              value={formData.robotInventoryId}
              onChange={handleChange}
              options={robotOptions}
              required
              disabled={isEditing}
            />
            <FormTextField
              name="serialNumber"
              label="Numéro de série"
              value={formData.serialNumber}
              onChange={handleChange}
            />
            <FormSelectField
              name="pluginInventoryId"
              label={
                isEditing && !formData.pluginInventoryId
                  ? 'Aucun plugin'
                  : 'Plugin'
              }
              value={formData.pluginInventoryId}
              onChange={handleChange}
              options={pluginOptions}
              disabled={isEditing}
            />
            <FormSelectField
              name="antennaInventoryId"
              label={
                isEditing && !formData.antennaInventoryId
                  ? 'Aucune antenne'
                  : 'Antenne'
              }
              value={formData.antennaInventoryId}
              onChange={handleChange}
              options={antennaOptions}
              disabled={isEditing}
            />
            <FormSelectField
              name="shelterInventoryId"
              label={
                isEditing && !formData.shelterInventoryId
                  ? 'Aucun abri'
                  : 'Abri'
              }
              value={formData.shelterInventoryId}
              onChange={handleChange}
              options={shelterOptions}
              disabled={isEditing}
            />
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.hasAntennaSupport}
                    onChange={() => handleCheckboxChange('hasAntennaSupport')}
                  />
                }
                label="Support antenne (+50€)"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.hasPlacement}
                    onChange={() => handleCheckboxChange('hasPlacement')}
                  />
                }
                label="Placement (+200€)"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.hasWire}
                    onChange={() => handleCheckboxChange('hasWire')}
                  />
                }
                label="Filaire"
              />
              {formData.hasWire && (
                <TextField
                  label="Longueur (mètres)"
                  type="number"
                  value={formData.wireLength || ''}
                  onChange={(e) =>
                    handleChange('wireLength', Number(e.target.value))
                  }
                  size="small"
                  sx={{ ml: 2, width: '200px' }}
                />
              )}
            </Grid>
          </FormSection>

          <FormSection title="Installation">
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Date d'installation"
                value={
                  formData.installationDate
                    ? dayjs(formData.installationDate)
                    : null
                }
                onChange={(newValue) =>
                  handleChange(
                    'installationDate',
                    newValue ? newValue.toISOString() : '',
                  )
                }
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.needsInstaller}
                    onChange={() => handleCheckboxChange('needsInstaller')}
                  />
                }
                label="Installateur requis"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Notes d'installation (pré-requis, choses à prévoir, etc.)"
                multiline
                rows={4}
                fullWidth
                value={formData.installationNotes || ''}
                onChange={(e) =>
                  handleChange('installationNotes', e.target.value)
                }
                placeholder="Décrivez les pré-requis et les choses à prévoir pour l'installation..."
              />
            </Grid>
          </FormSection>

          <FormSection title="Facturation">
            <Grid item xs={12}>
              <Button
                component="label"
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                color={invoiceError ? 'error' : 'primary'}
              >
                {selectedInvoice
                  ? selectedInvoice.name
                  : 'Ajouter une facture (optionnel)'}
                <VisuallyHiddenInput
                  type="file"
                  onChange={handleInvoiceChange}
                  accept="application/pdf"
                />
              </Button>
              {selectedInvoice && (
                <Typography
                  variant="body2"
                  sx={{ mt: 1, color: 'text.secondary' }}
                >
                  La facture sera fusionnée avec le bon de commande
                </Typography>
              )}
              {invoiceError && (
                <Typography variant="body2" sx={{ mt: 1, color: 'error.main' }}>
                  {invoiceError}
                </Typography>
              )}
            </Grid>
          </FormSection>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/purchase-orders')}
            >
              Annuler
            </Button>
            <Box>
              <Button
                type="submit"
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={saving}
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default PurchaseOrderForm;
