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
  Tooltip,
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
  getPurchaseOrderInvoice,
  getPurchaseOrderPhoto,
} from '../utils/api';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { styled } from '@mui/material/styles';
import { PurchaseOrderPdfDocument } from '../components/PurchaseOrderPdf';
import { pdf } from '@react-pdf/renderer';
import { notifyError, notifyLoading } from '../utils/notifications';
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
import ReceiptIcon from '@mui/icons-material/Receipt';
import DescriptionIcon from '@mui/icons-material/Description';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';

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
    devis: false,
    validUntil: '',
    bankAccountNumber: '',
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
  const [typeDialogOpen, setTypeDialogOpen] = useState(!isEditing);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photosToDelete, setPhotosToDelete] = useState<string[]>([]);
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState<boolean>(false);
  const [previewPhoto, setPreviewPhoto] = useState<string>('');
  const [photoBlobs, setPhotoBlobs] = useState<{ [path: string]: Blob }>({});
  const [loadingPhotos, setLoadingPhotos] = useState<boolean>(false);
  const [selectedPhotoUrls, setSelectedPhotoUrls] = useState<string[]>([]);

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
          invoicePath: data.invoicePath || null,
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
          isInvoiced: data.isInvoiced || false,
          devis: data.devis || false,
          validUntil: data.validUntil || '',
          bankAccountNumber: data.bankAccountNumber || '',
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
      // Set bank account number from config if it's a quote
      ...(type === 'devis' &&
      configData &&
      configData['Numéro de compte bancaire']
        ? { bankAccountNumber: configData['Numéro de compte bancaire'] }
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

    // Dismiss any existing toast notifications
    toast.dismiss();

    setFormData((prev) => ({
      ...prev,
      devis: false,
    }));
    toast.info('Converti en bon de commande');
  };

  // Merge PDFs if invoice is available
  const mergePDFs = async (orderPdfBlob: Blob): Promise<Blob> => {
    // Use the selected invoice if available, otherwise use the existing invoice blob if not marked for deletion
    const invoiceToMerge = selectedInvoice
      ? selectedInvoice
      : !deleteInvoice && existingInvoiceBlob
        ? existingInvoiceBlob
        : null;

    if (!invoiceToMerge) {
      return orderPdfBlob;
    }

    try {
      const merger = new PDFMerger();

      // Add the order PDF
      await merger.add(orderPdfBlob);

      // Add the invoice PDF
      await merger.add(invoiceToMerge);

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
      notifyError('Erreur lors du chargement de la facture');
    }
  }, [token, id, purchaseOrder, existingInvoiceBlob]);

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

  // Add this helper function to convert a blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Add helper function to convert webp to jpeg
  const convertWebpToJpeg = (imageBlob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas and draw image
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Draw image to canvas
        ctx.drawImage(img, 0, 0);

        // Convert to jpeg blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to convert to JPEG'));
            }
          },
          'image/jpeg',
          0.9, // Quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(imageBlob);
    });
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

      // Collect all photo data for the PDF generation as base64 strings
      const photoUrls: string[] = [];

      // Convert existing photos to base64 if editing
      if (isEditing && purchaseOrder?.photosPaths) {
        for (const photoPath of purchaseOrder.photosPaths) {
          if (!photosToDelete.includes(photoPath) && photoBlobs[photoPath]) {
            try {
              let processedBlob = photoBlobs[photoPath];

              // Convert webp to jpeg if needed
              const isWebP =
                photoPath.toLowerCase().endsWith('.webp') ||
                processedBlob.type === 'image/webp';

              if (isWebP) {
                processedBlob = await convertWebpToJpeg(processedBlob);
              }

              // Convert blob to base64
              const base64String = await blobToBase64(processedBlob);
              photoUrls.push(base64String);
            } catch (err) {
              console.error('Error converting blob to base64:', err);
            }
          }
        }
      }

      // Convert newly selected photos to base64
      for (const photo of selectedPhotos) {
        try {
          let processedPhoto = photo;

          // Convert webp to jpeg if needed
          const isWebP =
            photo.name.toLowerCase().endsWith('.webp') ||
            photo.type === 'image/webp';

          if (isWebP) {
            processedPhoto = (await convertWebpToJpeg(photo)) as File;
          }

          const base64String = await blobToBase64(processedPhoto);
          photoUrls.push(base64String);
        } catch (err) {
          console.error('Error converting file to base64:', err);
        }
      }

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
          formData.hasAppointment ?? purchaseOrder?.hasAppointment ?? false,
        isInstalled:
          formData.isInstalled ?? purchaseOrder?.isInstalled ?? false,
        isInvoiced: formData.isInvoiced ?? purchaseOrder?.isInvoiced ?? false,
        devis: formData.devis ?? purchaseOrder?.devis ?? false,
        serialNumber: !formData.devis
          ? formData.serialNumber || purchaseOrder?.serialNumber || ''
          : '',
        validUntil: formData.devis ? formData.validUntil || null : null,
        bankAccountNumber: formData.devis
          ? formData.bankAccountNumber || null
          : null,
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
        deleteInvoice: deleteInvoice,
        // Add photos paths for the PDF generation
        photosPaths: isEditing
          ? purchaseOrder?.photosPaths?.filter(
              (path) => !photosToDelete.includes(path),
            ) || []
          : [],
      };

      // Generate PDF with updated data and photos
      const pdfBlob = await pdf(
        <PurchaseOrderPdfDocument
          purchaseOrder={updatedOrder}
          installationTexts={texts}
          photoDataUrls={photoUrls}
        />,
      ).toBlob();

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

      // Add the merged PDF
      const finalPdfBlob = await mergePDFs(pdfBlob);
      formDataForApi.append('pdf', finalPdfBlob, 'order.pdf');

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
        toast.success('Bon de commande mis à jour avec succès');
      } else {
        // Create new purchase order
        await createPurchaseOrder(token, formDataForApi);
        toast.success('Bon de commande créé avec succès');
      }

      // Update inventory data in the Redux store
      dispatch(fetchInventorySummaryAsync(token));

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
        bankAccountNumber: configData['Numéro de compte bancaire'],
      }));
    }
  }, [isEditing, configData]);

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
              onClick={() => navigate('/purchase-orders')}
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
                label="Numéro de compte bancaire"
                value={formData.bankAccountNumber}
                onChange={handleChange}
                required
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
