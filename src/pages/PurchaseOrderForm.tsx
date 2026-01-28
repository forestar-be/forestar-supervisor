import React, { useCallback, useEffect, useState } from 'react';
import {
  Backdrop,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
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
  Card,
  CardActionArea,
  CardContent,
  IconButton,
  ImageList,
  ImageListItem,
  SxProps,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/AuthProvider';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import {
  createPurchaseOrder,
  fetchPurchaseOrderById,
  updatePurchaseOrder,
  getPurchaseOrderInvoice,
  getPurchaseOrderPhoto,
} from '../utils/api';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { styled } from '@mui/material/styles';
import { pdf } from '@react-pdf/renderer';
import { notifyLoading } from '../utils/notifications';
import PDFMerger from 'pdf-merger-js/browser';
import ErrorDialog from '../components/dialogs/ErrorDialog';
import {
  PurchaseOrderFormData,
  PurchaseOrder,
  RobotInventory,
  InventoryCategory,
} from '../utils/types';
import {
  convertWebpToJpeg,
  formatPriceNumberToFrenchFormatStr,
} from '../utils/common.utils';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useAppDispatch } from '../store/hooks';
import { fetchInventorySummaryAsync } from '../store/robotInventorySlice';
import ReceiptIcon from '@mui/icons-material/Receipt';
import DescriptionIcon from '@mui/icons-material/Description';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import ConfirmDialog from '../components/dialogs/ConfirmDialog';

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
  sx?: SxProps;
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
  sx = undefined,
}) => (
  <Grid item xs={xs} sm={sm} sx={sx}>
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
  const [searchParams] = useSearchParams();
  const typeParam = searchParams.get('type');
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
    clientEmail: '',
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
    devis: typeParam === 'devis', // Set initial value based on URL parameter
    validUntil: '',
    bankAccountNumber: '',
    bankAccountHolderName: '',
    bankBic: '',
  });
  const [selectedInvoice, setSelectedInvoice] = useState<File | null>(null);
  const [existingInvoiceBlob, setExistingInvoiceBlob] = useState<Blob | null>(
    null,
  );
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [deleteInvoice, setDeleteInvoice] = useState<boolean>(false);
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(
    null,
  );
  const [typeDialogOpen, setTypeDialogOpen] = useState(
    !isEditing && !typeParam,
  );
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photosToDelete, setPhotosToDelete] = useState<string[]>([]);
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState<boolean>(false);
  const [previewPhoto, setPreviewPhoto] = useState<string>('');
  const [photoBlobs, setPhotoBlobs] = useState<{ [path: string]: Blob }>({});
  const [loadingPhotos, setLoadingPhotos] = useState<boolean>(false);
  const [selectedPhotoUrls, setSelectedPhotoUrls] = useState<string[]>([]);
  const [convertDialogOpen, setConvertDialogOpen] = useState<boolean>(false);

  // Error dialog state
  const [errorDialogOpen, setErrorDialogOpen] = useState<boolean>(false);
  const [errorDialogData, setErrorDialogData] = useState<{
    title?: string;
    message: string;
    details?: string;
    severity?: 'error' | 'warning';
  }>({
    message: '',
  });

  const { texts } = useSelector((state: RootState) => state.installationTexts);
  const { items: inventoryItems, loading: inventoryLoading } = useSelector(
    (state: RootState) => state.robotInventory,
  );
  const { config: configData } = useSelector(
    (state: RootState) => state.config,
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

  // Fetch purchase order and its invoice if editing
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
          devis: data.devis || false,
          validUntil: data.validUntil || null,
          bankAccountNumber: data.bankAccountNumber || null,
          bankAccountHolderName: data.bankAccountHolderName || null,
          bankBic: data.bankBic || null,
          invoicePath: data.invoicePath || null,
        });
        setFormData({
          clientFirstName: data.clientFirstName,
          clientLastName: data.clientLastName,
          clientAddress: data.clientAddress,
          clientCity: data.clientCity,
          clientPhone: data.clientPhone,
          clientEmail: data.clientEmail || '',
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
          isInvoiced: data.isInvoiced || false,
          devis: data.devis || false,
          validUntil: data.validUntil || '',
          bankAccountNumber: data.bankAccountNumber || '',
          bankAccountHolderName: data.bankAccountHolderName || '',
          bankBic: data.bankBic || '',
        });

        // Download invoice if it exists
        if (data.invoicePath) {
          try {
            const invoiceBlob = await getPurchaseOrderInvoice(
              token,
              parseInt(id),
            );
            setExistingInvoiceBlob(invoiceBlob);
          } catch (error) {
            console.error('Error downloading existing invoice:', error);
            toast.error('Erreur lors du chargement de la facture existante');
          }
        }
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

  // Fetch photos when purchase order data is loaded
  useEffect(() => {
    const fetchPhotos = async () => {
      if (!token || !id || !purchaseOrder?.photosPaths?.length) return;

      setLoadingPhotos(true);
      try {
        const fetchedBlobs: { [path: string]: Blob } = {};

        // Fetch each photo and store as blob
        for (let i = 0; i < purchaseOrder.photosPaths.length; i++) {
          const photoPath = purchaseOrder.photosPaths[i];
          if (!photosToDelete.includes(photoPath)) {
            const blob = await getPurchaseOrderPhoto(token, parseInt(id), i);
            fetchedBlobs[photoPath] = blob;
          }
        }

        setPhotoBlobs(fetchedBlobs);
      } catch (error) {
        console.error('Error fetching photos:', error);
        toast.error('Erreur lors du chargement des photos');
      } finally {
        setLoadingPhotos(false);
      }
    };

    fetchPhotos();

    // Cleanup object URLs when component unmounts
    return () => {
      // If photoUrlCache has values, revoke each object URL
      Object.values(photoUrlCache).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [token, id, purchaseOrder]);

  // Cache for object URLs to prevent recreating them unnecessarily
  const photoUrlCache: { [path: string]: string } = React.useMemo(
    () => ({}),
    [],
  );

  // Generate photo preview URL from blob
  const getPhotoUrl = (photoPath: string): string => {
    if (photoBlobs[photoPath]) {
      if (!photoUrlCache[photoPath]) {
        photoUrlCache[photoPath] = URL.createObjectURL(photoBlobs[photoPath]);
      }
      return photoUrlCache[photoPath];
    }
    return '';
  };

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

  // Handle document type selection
  const handleTypeSelection = (type: 'devis' | 'bon_de_commande') => {
    setFormData((prev) => ({
      ...prev,
      devis: type === 'devis',
      ...(configData && configData['Numéro de compte bancaire']
        ? { bankAccountNumber: configData['Numéro de compte bancaire'] }
        : {}),
      ...(configData && configData['Titulaire du compte bancaire']
        ? { bankAccountHolderName: configData['Titulaire du compte bancaire'] }
        : {}),
      ...(configData && configData['Code BIC']
        ? { bankBic: configData['Code BIC'] }
        : {}),
    }));
    setTypeDialogOpen(false);
  };

  // Toggle between quote and purchase order
  const toggleDocumentType = () => {
    // Only allow conversion from quote to purchase order
    if (!formData.devis) {
      return;
    }

    // Show confirmation dialog instead of immediate conversion
    setConvertDialogOpen(true);
  };

  // Handle the actual conversion after confirmation
  const handleConfirmConversion = async () => {
    try {
      // Dismiss any existing toast notifications
      toast.dismiss();

      setFormData((prev) => ({
        ...prev,
        devis: false,
      }));

      setConvertDialogOpen(false);
      toast.info('Converti en bon de commande');
    } catch (error) {
      console.error('Error during conversion:', error);
      toast.error('Erreur lors de la conversion');
    }
  };

  // Close the conversion dialog
  const handleCloseConvertDialog = () => {
    setConvertDialogOpen(false);
  };

  // Helper function to show error dialog
  const showErrorDialog = useCallback(
    (
      message: string,
      details?: string,
      title?: string,
      severity: 'error' | 'warning' = 'error',
    ) => {
      setErrorDialogData({
        title,
        message,
        details,
        severity,
      });
      setErrorDialogOpen(true);
    },
    [],
  );

  // View the invoice
  const viewInvoice = useCallback(async () => {
    if (!token || !id || !purchaseOrder?.invoicePath) return;

    try {
      // Show loading indicator
      const loadingNotification = notifyLoading('Chargement de la facture...');

      try {
        let invoiceBlob;

        // Use the already downloaded invoice blob if available
        if (existingInvoiceBlob) {
          invoiceBlob = existingInvoiceBlob;
        } else {
          // Otherwise fetch the invoice file with authentication
          invoiceBlob = await getPurchaseOrderInvoice(token, parseInt(id));
          // Store the blob for future use
          setExistingInvoiceBlob(invoiceBlob);
        }

        loadingNotification.end();

        // Create a URL for the blob
        const blobUrl = URL.createObjectURL(invoiceBlob);

        // Open the blob URL in a new tab
        window.open(blobUrl, '_blank');

        // Revoke the URL after a timeout to free memory
        setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
      } catch (error) {
        console.error('Error downloading invoice:', error);

        // Update loading notification to error
        loadingNotification.error('Erreur lors du chargement de la facture');
      }
    } catch (error) {
      console.error('Error with invoice notification:', error);
      showErrorDialog(
        'Erreur lors du chargement de la facture',
        error instanceof Error ? error.message : 'Erreur inconnue',
        'Erreur de chargement',
      );
    }
  }, [
    token,
    id,
    purchaseOrder?.invoicePath,
    existingInvoiceBlob,
    showErrorDialog,
  ]);

  // Delete the invoice
  const handleDeleteInvoice = useCallback(() => {
    if (!purchaseOrder?.invoicePath) return;

    setDeleteInvoice(true);
    setSelectedInvoice(null);
    setExistingInvoiceBlob(null);
    toast.info("La facture sera supprimée lors de l'enregistrement");
  }, [purchaseOrder]);

  // Handle invoice file selection
  const handleInvoiceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInvoiceError(null);
    setDeleteInvoice(false);

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

  // Handle photo selection
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newPhotos = Array.from(e.target.files);

      // Create object URLs for the new photos for preview
      const newUrls = newPhotos.map((photo) => URL.createObjectURL(photo));
      setSelectedPhotoUrls((prev) => [...prev, ...newUrls]);

      // Add new photos to the selected photos array
      setSelectedPhotos((prev) => [...prev, ...newPhotos]);
    }
  };

  // Handle photo deletion (for newly selected photos)
  const handleRemoveSelectedPhoto = (index: number) => {
    // Revoke the URL for this photo
    if (selectedPhotoUrls[index]) {
      URL.revokeObjectURL(selectedPhotoUrls[index]);
    }

    // Remove the photo from state
    setSelectedPhotoUrls((prev) => prev.filter((_, i) => i !== index));
    setSelectedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle photo deletion (for existing photos)
  const handleRemoveExistingPhoto = (photoPath: string) => {
    setPhotosToDelete((prev) => [...prev, photoPath]);
  };

  // Handle photo preview
  const handleOpenPhotoPreview = (photoUrl: string) => {
    setPreviewPhoto(photoUrl);
    setPhotoPreviewOpen(true);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return; // Form validation
    if (
      !formData.clientFirstName ||
      !formData.clientLastName ||
      !formData.clientEmail ||
      !formData.robotInventoryId
    ) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Email validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(formData.clientEmail)) {
      toast.error('Veuillez fournir une adresse email valide');
      return;
    }

    try {
      setSaving(true);

      // Prepare form data for API request
      const formDataForApi = new FormData();

      // Add the order data as a JSON string
      const orderDataWithFileOptions = {
        ...formData,
        deleteInvoice,
        photosToDelete,
        // Ensure validUntil is null if empty string
        validUntil:
          formData.validUntil && formData.validUntil.trim() !== ''
            ? formData.validUntil
            : null,
      };
      formDataForApi.append(
        'orderData',
        JSON.stringify(orderDataWithFileOptions),
      );

      // Add the separate invoice if one is selected
      if (selectedInvoice) {
        formDataForApi.append('invoice', selectedInvoice, selectedInvoice.name);
      }

      // Add photos if any are selected
      selectedPhotos.forEach((photo, index) => {
        formDataForApi.append(`photos`, photo, photo.name);
      });

      if (isEditing && id) {
        // Update existing purchase order
        await updatePurchaseOrder(token, parseInt(id), formDataForApi);
        toast.success(
          formData.devis
            ? 'Devis mis à jour avec succès'
            : 'Bon de commande mis à jour avec succès',
        );
      } else {
        // Create new purchase order
        await createPurchaseOrder(token, formDataForApi);
        toast.success(
          formData.devis
            ? 'Devis créé avec succès'
            : 'Bon de commande créé avec succès',
        );
      }

      // Update inventory data in the Redux store
      dispatch(fetchInventorySummaryAsync(token));

      if (formData.devis) {
        navigate('/devis');
      } else {
        navigate('/bons-commande');
      }
    } catch (error) {
      console.error('Error saving purchase order:', error);

      // Display specific error message if available
      if (error instanceof Error) {
        if (error.message.includes('Aucun robot disponible')) {
          showErrorDialog(
            "Aucun robot disponible pour ce mois-ci. Veuillez vérifier le plan d'inventaire.",
            error.message,
            "Erreur d'inventaire",
            'warning',
          );
        } else {
          // Show full error message with details
          showErrorDialog(
            "Une erreur est survenue lors de la sauvegarde du bon de commande, si le problème persiste, veuillez contacter le support avec le détail de l'erreur.",
            error.message,
            'Erreur de sauvegarde',
          );
        }
      } else {
        showErrorDialog(
          "Une erreur est survenue lors de la sauvegarde du bon de commande, si le problème persiste, veuillez contacter le support avec le détail de l'erreur.",
          'Erreur inconnue',
          'Erreur de sauvegarde',
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // Cleanup created URL objects when component unmounts
  useEffect(() => {
    return () => {
      // Clean up photo object URLs
      Object.values(photoUrlCache).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });

      // Clean up selected photo URLs
      selectedPhotoUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [photoUrlCache, selectedPhotoUrls]);

  // Effect to set the bank account number from config when creating a new purchase order
  useEffect(() => {
    if (!isEditing && configData && configData['Numéro de compte bancaire']) {
      setFormData((prev) => ({
        ...prev,
        bankAccountNumber: configData['Numéro de compte bancaire'] || '',
        bankAccountHolderName: configData['Titulaire du compte bancaire'] || '',
        bankBic: configData['Code BIC'] || '',
      }));
    }
  }, [isEditing, typeParam, configData]);

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
      {/* Document Type Selection Dialog */}
      <Dialog
        open={typeDialogOpen}
        disableEscapeKeyDown
        maxWidth="md"
        disablePortal
        onClose={(event, reason) => {
          // Don't allow closing by clicking outside or pressing escape
          if (reason && reason === 'backdropClick') {
            return;
          }
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold', pt: 3 }}>
          Choisissez le type de document
        </DialogTitle>
        <DialogContent
          sx={{
            display: 'flex',
            justifyContent: 'center',
            gap: 4,
            pt: '24px !important',
            pb: 4,
          }}
        >
          <Card
            sx={{
              width: 220,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'scale(1.05)',
                boxShadow: 6,
                borderColor: 'primary.main',
              },
              border: '2px solid transparent',
            }}
          >
            <CardActionArea
              onClick={() => handleTypeSelection('devis')}
              sx={{ height: '100%', p: 1 }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  py: 3,
                }}
              >
                <DescriptionIcon
                  sx={{ fontSize: 60, mb: 2, color: 'info.main' }}
                />
                <CardContent>
                  <Typography
                    variant="h5"
                    component="div"
                    sx={{ textAlign: 'center' }}
                  >
                    Devis
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 2, textAlign: 'center' }}
                  >
                    Créer un devis pour le client (sans engagement)
                  </Typography>
                </CardContent>
              </Box>
            </CardActionArea>
          </Card>

          <Card
            sx={{
              width: 220,
              transition: 'all 0.3s ease',
              border: '2px solid transparent',
              '&:hover': {
                transform: 'scale(1.05)',
                borderColor: 'primary.main',
                boxShadow: 6,
              },
            }}
          >
            <CardActionArea
              onClick={() => handleTypeSelection('bon_de_commande')}
              sx={{ height: '100%', p: 1 }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  py: 3,
                }}
              >
                <ReceiptIcon
                  sx={{ fontSize: 60, mb: 2, color: 'success.main' }}
                />
                <CardContent>
                  <Typography
                    variant="h5"
                    component="div"
                    sx={{ textAlign: 'center' }}
                  >
                    Bon de commande
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 2, textAlign: 'center' }}
                  >
                    Créer un bon de commande finalisé
                  </Typography>
                </CardContent>
              </Box>
            </CardActionArea>
          </Card>
        </DialogContent>
      </Dialog>

      {/* Photo Preview Dialog */}
      <Dialog
        open={photoPreviewOpen}
        onClose={() => setPhotoPreviewOpen(false)}
        maxWidth="md"
      >
        <DialogContent sx={{ p: 0 }}>
          <img
            src={previewPhoto}
            alt="Photo preview"
            style={{ width: '100%', display: 'block' }}
          />
        </DialogContent>
      </Dialog>

      {/* Conversion Confirmation Dialog */}
      <ConfirmDialog
        open={convertDialogOpen}
        title="Convertir en bon de commande"
        message="Êtes-vous sûr de vouloir convertir ce devis en bon de commande SANS SIGNATURE CLIENT ? Cette action est irréversible."
        onConfirm={handleConfirmConversion}
        onClose={handleCloseConvertDialog}
        isLoading={false}
        type="bon"
      />

      <Paper sx={{ p: 3 }}>
        <Backdrop
          sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
          open={saving}
        >
          <CircularProgress color="inherit" />
        </Backdrop>

        <Box
          sx={{
            mb: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() =>
                navigate(formData.devis ? '/devis' : '/bons-commande')
              }
              sx={{ mr: 2 }}
            >
              Retour
            </Button>
            <Typography variant="h5" component="h1">
              {isEditing
                ? `Modifier le ${formData.devis ? 'devis' : 'bon de commande'}`
                : `Créer un ${formData.devis ? 'devis' : 'bon de commande'}`}
            </Typography>
          </Box>

          {/* Document Type Toggle Button - only show when it's a quote */}
          {formData.devis && (
            <Button
              variant="outlined"
              color="success"
              onClick={toggleDocumentType}
              startIcon={<CompareArrowsIcon />}
              sx={{ ml: 2 }}
            >
              Convertir en bon de commande
            </Button>
          )}
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
            />{' '}
            <FormTextField
              name="clientPhone"
              label="Téléphone"
              value={formData.clientPhone}
              onChange={handleChange}
            />
            <FormTextField
              name="clientEmail"
              label="Email"
              value={formData.clientEmail}
              onChange={handleChange}
              required
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
            />
            {!formData.devis && (
              <FormTextField
                name="serialNumber"
                label="Numéro de série"
                value={formData.serialNumber}
                onChange={handleChange}
              />
            )}
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
          {!formData.devis ? (
            <FormSection title="Facturation">
              <Grid item xs={12} sm={6}>
                <FormTextField
                  name="bankAccountNumber"
                  label="Numéro de compte bancaire (IBAN)"
                  value={formData.bankAccountNumber}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormTextField
                  name="bankAccountHolderName"
                  label="Titulaire du compte"
                  value={formData.bankAccountHolderName}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormTextField
                  name="bankBic"
                  label="Code BIC"
                  value={formData.bankBic}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                {!formData.devis ? (
                  <>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Button
                        component="label"
                        variant="outlined"
                        startIcon={<CloudUploadIcon />}
                        color={invoiceError ? 'error' : 'primary'}
                        sx={{ mr: 2 }}
                        disabled={deleteInvoice}
                      >
                        {selectedInvoice
                          ? selectedInvoice.name
                          : isEditing &&
                              purchaseOrder?.invoicePath &&
                              !deleteInvoice
                            ? 'Remplacer la facture'
                            : 'Ajouter une facture (optionnel)'}
                        <VisuallyHiddenInput
                          type="file"
                          onChange={handleInvoiceChange}
                          accept="application/pdf"
                        />
                      </Button>

                      {isEditing &&
                        purchaseOrder?.invoicePath &&
                        !deleteInvoice &&
                        !selectedInvoice && (
                          <>
                            <Button
                              variant="outlined"
                              startIcon={<VisibilityIcon />}
                              onClick={viewInvoice}
                              sx={{ mr: 2 }}
                            >
                              Voir la facture
                            </Button>
                            <Button
                              variant="outlined"
                              startIcon={<DeleteIcon />}
                              onClick={handleDeleteInvoice}
                              color="error"
                            >
                              Supprimer
                            </Button>
                          </>
                        )}
                    </Box>

                    {(selectedInvoice ||
                      (isEditing &&
                        purchaseOrder?.invoicePath &&
                        !deleteInvoice)) && (
                      <Typography
                        variant="body2"
                        sx={{ mt: 1, color: 'text.secondary' }}
                      >
                        La facture sera fusionnée avec le bon de commande
                      </Typography>
                    )}

                    {deleteInvoice && (
                      <Typography
                        variant="body2"
                        sx={{ mt: 1, color: 'warning.main' }}
                      >
                        La facture existante sera supprimée lors de
                        l'enregistrement
                      </Typography>
                    )}

                    {invoiceError && (
                      <Typography
                        variant="body2"
                        sx={{ mt: 1, color: 'error.main' }}
                      >
                        {invoiceError}
                      </Typography>
                    )}
                  </>
                ) : (
                  <Typography
                    variant="body2"
                    sx={{ color: 'text.secondary', fontStyle: 'italic' }}
                  >
                    L'ajout de facture n'est pas disponible pour un devis
                  </Typography>
                )}
              </Grid>
            </FormSection>
          ) : (
            <FormSection title="Détails du devis">
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Date de validité"
                  value={
                    formData.validUntil ? dayjs(formData.validUntil) : null
                  }
                  onChange={(newValue) =>
                    handleChange(
                      'validUntil',
                      newValue ? newValue.toISOString() : '',
                    )
                  }
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                />
              </Grid>
              <FormTextField
                name="bankAccountNumber"
                label="Numéro de compte bancaire (IBAN)"
                value={formData.bankAccountNumber}
                onChange={handleChange}
                required
              />
              <FormTextField
                name="bankAccountHolderName"
                label="Titulaire du compte"
                value={formData.bankAccountHolderName}
                onChange={handleChange}
              />
              <FormTextField
                name="bankBic"
                label="Code BIC"
                value={formData.bankBic}
                onChange={handleChange}
              />
            </FormSection>
          )}

          <FormSection title="Photos">
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<AddPhotoAlternateIcon />}
                  sx={{ width: 'fit-content' }}
                >
                  Ajouter des photos
                  <VisuallyHiddenInput
                    type="file"
                    onChange={handlePhotoChange}
                    accept="image/*"
                    multiple
                  />
                </Button>

                {/* Show existing photos */}
                {isEditing &&
                  purchaseOrder?.photosPaths &&
                  purchaseOrder.photosPaths.length > 0 && (
                    <Box>
                      <Typography variant="subtitle1" gutterBottom>
                        Photos existantes:
                      </Typography>
                      {loadingPhotos ? (
                        <CircularProgress size={24} />
                      ) : (
                        <ImageList
                          sx={{ width: '100%', maxHeight: 300 }}
                          cols={4}
                          rowHeight={150}
                        >
                          {purchaseOrder.photosPaths
                            .filter((path) => !photosToDelete.includes(path))
                            .map((photoPath, index) => (
                              <ImageListItem
                                key={index}
                                sx={{ position: 'relative' }}
                              >
                                {photoBlobs[photoPath] && (
                                  <>
                                    <img
                                      src={getPhotoUrl(photoPath)}
                                      alt={`Photo ${index + 1}`}
                                      loading="lazy"
                                      style={{
                                        cursor: 'pointer',
                                        height: '100%',
                                        objectFit: 'cover',
                                      }}
                                      onClick={() =>
                                        handleOpenPhotoPreview(
                                          getPhotoUrl(photoPath),
                                        )
                                      }
                                    />
                                    <IconButton
                                      sx={{
                                        position: 'absolute',
                                        top: 5,
                                        right: 5,
                                        backgroundColor:
                                          'rgba(255, 255, 255, 0.7)',
                                        '&:hover': {
                                          backgroundColor:
                                            'rgba(255, 255, 255, 0.9)',
                                        },
                                      }}
                                      onClick={() =>
                                        handleRemoveExistingPhoto(photoPath)
                                      }
                                      size="small"
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </>
                                )}
                              </ImageListItem>
                            ))}
                        </ImageList>
                      )}
                    </Box>
                  )}

                {/* Show newly selected photos */}
                {selectedPhotos.length > 0 && (
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      Nouvelles photos à ajouter:
                    </Typography>
                    <ImageList
                      sx={{ width: '100%', maxHeight: 300 }}
                      cols={4}
                      rowHeight={150}
                    >
                      {selectedPhotos.map((photo, index) => (
                        <ImageListItem
                          key={index}
                          sx={{ position: 'relative' }}
                        >
                          <img
                            src={selectedPhotoUrls[index] || ''}
                            alt={`Nouvelle photo ${index + 1}`}
                            loading="lazy"
                            style={{
                              cursor: 'pointer',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                            onClick={() =>
                              handleOpenPhotoPreview(selectedPhotoUrls[index])
                            }
                          />
                          <IconButton
                            sx={{
                              position: 'absolute',
                              top: 5,
                              right: 5,
                              backgroundColor: 'rgba(255, 255, 255, 0.7)',
                              '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                              },
                            }}
                            onClick={() => handleRemoveSelectedPhoto(index)}
                            size="small"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </ImageListItem>
                      ))}
                    </ImageList>
                  </Box>
                )}

                <Typography
                  variant="body2"
                  sx={{ color: 'text.secondary', mt: 1 }}
                >
                  Les photos seront incluses dans le PDF généré.
                </Typography>
              </Box>
            </Grid>
          </FormSection>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/bons-commande')}
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

      {/* Error Dialog */}
      <ErrorDialog
        open={errorDialogOpen}
        onClose={() => setErrorDialogOpen(false)}
        title={errorDialogData.title}
        message={errorDialogData.message}
        details={errorDialogData.details}
        severity={errorDialogData.severity}
      />
    </Box>
  );
};

export default PurchaseOrderForm;
