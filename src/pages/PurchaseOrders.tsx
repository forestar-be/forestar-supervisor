import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  TextField,
  Tooltip,
  Typography,
  useTheme,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Card,
  Fade,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ReceiptIcon from '@mui/icons-material/Receipt';
import DescriptionIcon from '@mui/icons-material/Description';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import HandymanIcon from '@mui/icons-material/Handyman';
import { useNavigate } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import {
  ColDef,
  GridReadyEvent,
  ValueFormatterParams,
  ICellRendererParams,
  IRowNode,
} from 'ag-grid-community';
import { AG_GRID_LOCALE_FR } from '@ag-grid-community/locale';
import { StyledAgGridWrapper } from '../components/styles/AgGridStyles';
import { useAuth } from '../hooks/AuthProvider';
import { toast } from 'react-toastify';
import {
  deletePurchaseOrder,
  fetchPurchaseOrders,
  getPurchaseOrderPdf,
  updatePurchaseOrderStatus,
  fetchPurchaseOrderById,
} from '../utils/api';
import {
  onFirstDataRendered,
  setupGridStateEvents,
  clearGridState,
  saveGridPageSize,
  loadGridPageSize,
} from '../utils/agGridSettingsHelper';
import { PurchaseOrder } from '../utils/types';
import { RootState } from '../store';
import { useSelector } from 'react-redux';
import { pdf } from '@react-pdf/renderer';
import { PurchaseOrderPdfDocument } from '../components/PurchaseOrderPdf';

// PDF action types
type PdfActionType = 'view' | 'download' | 'print';

// Dialog state type with additional icon info
interface ConfirmDialogState {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => Promise<void>;
  isLoading: boolean;
  type?:
    | 'delete'
    | 'warning'
    | 'info'
    | 'success'
    | 'devis'
    | 'bon'
    | 'appointment'
    | 'installation'
    | 'invoice';
}

// Grid state key for purchase orders
const PURCHASE_ORDERS_GRID_STATE_KEY = 'purchaseOrdersAgGridState';

const PurchaseOrders: React.FC = () => {
  const { token } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();
  const config = useSelector((state: RootState) => state.config.config);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerFilterText, setCustomerFilterText] = useState('');
  const [paginationPageSize, setPaginationPageSize] = useState(() =>
    loadGridPageSize(PURCHASE_ORDERS_GRID_STATE_KEY, 20),
  );
  const [pdfCache, setPdfCache] = useState<Record<number, Blob>>({});
  const [loadingPdfIds, setLoadingPdfIds] = useState<Record<number, boolean>>(
    {},
  );
  // Confirmation dialog state with type
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    title: '',
    message: '',
    onConfirm: async () => {},
    isLoading: false,
    type: 'info',
  });

  const gridRef = React.createRef<AgGridReact>();
  const { items: inventoryItems } = useSelector(
    (state: RootState) => state.robotInventory,
  );
  const { texts } = useSelector((state: RootState) => state.installationTexts);

  // Save page size to localStorage when it changes
  useEffect(() => {
    saveGridPageSize(PURCHASE_ORDERS_GRID_STATE_KEY, paginationPageSize);
  }, [paginationPageSize]);

  // Fetch purchase orders
  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const response = await fetchPurchaseOrders(token);
        setPurchaseOrders(response.data || []);
      } catch (error) {
        console.error('Error fetching purchase orders:', error);
        toast.error('Erreur lors du chargement des bons de commande');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  // Handle add new purchase order
  const handleAddPurchaseOrder = () => {
    navigate('/purchase-orders/create');
  };

  // Handle edit purchase order
  const handleEditPurchaseOrder = useCallback(
    (id: number) => {
      navigate(`/purchase-orders/edit/${id}`);
    },
    [navigate],
  );

  // Helper function to show confirmation dialog with type
  const showConfirmDialog = useCallback(
    (
      title: string,
      message: string,
      onConfirm: () => Promise<void>,
      type: ConfirmDialogState['type'] = 'info',
    ) => {
      setConfirmDialog({
        open: true,
        title,
        message,
        onConfirm,
        isLoading: false,
        type,
      });
    },
    [],
  );

  // Handle dialog close
  const handleCloseDialog = useCallback(() => {
    if (confirmDialog.isLoading) return; // Prevent closing during loading
    setConfirmDialog({ ...confirmDialog, open: false });
  }, [confirmDialog]);

  // Handle dialog confirmation
  const handleConfirmDialog = useCallback(async () => {
    try {
      setConfirmDialog((prev) => ({ ...prev, isLoading: true }));
      await confirmDialog.onConfirm();
    } catch (error) {
      console.error('Error in dialog confirmation action:', error);
      toast.error('Une erreur est survenue');
    } finally {
      setConfirmDialog((prev) => ({ ...prev, open: false, isLoading: false }));
    }
  }, [confirmDialog]);

  // Handle delete purchase order
  const handleDeletePurchaseOrder = useCallback(
    async (order: PurchaseOrder) => {
      if (!token) return;

      showConfirmDialog(
        'Confirmer la suppression',
        'Êtes-vous sûr de vouloir supprimer ce bon de commande?',
        async () => {
          await deletePurchaseOrder(token, order.id);
          setPurchaseOrders((prev) => prev.filter((o) => o.id !== order.id));
          toast.success('Bon de commande supprimé avec succès');
        },
        'delete',
      );
    },
    [token, showConfirmDialog],
  );

  // Get PDF from API or cache
  const getPdf = useCallback(
    async (order: PurchaseOrder): Promise<Blob | null> => {
      if (!token || !order.orderPdfId) {
        toast.error('Aucun PDF disponible pour ce bon de commande');
        return null;
      }

      try {
        setLoadingPdfIds((prev) => ({ ...prev, [order.id]: true }));

        // Check if PDF is already in cache
        if (pdfCache[order.id]) {
          return pdfCache[order.id];
        }

        // Otherwise fetch from API
        const pdfBlob = await getPurchaseOrderPdf(token, order.id);

        // Cache the result
        setPdfCache((prev) => ({
          ...prev,
          [order.id]: pdfBlob,
        }));

        return pdfBlob;
      } catch (error) {
        console.error('Error getting PDF:', error);
        toast.error('Erreur lors du chargement du PDF');
        return null;
      } finally {
        setLoadingPdfIds((prev) => ({ ...prev, [order.id]: false }));
      }
    },
    [token, pdfCache],
  );

  // Unified PDF handler for view, download, print
  const handlePdfAction = useCallback(
    async (order: PurchaseOrder, action: PdfActionType) => {
      const pdfBlob = await getPdf(order);
      if (!pdfBlob) return;

      const pdfUrl = URL.createObjectURL(pdfBlob);

      switch (action) {
        case 'view':
          window.open(pdfUrl, '_blank');
          break;
        case 'download':
          const a = document.createElement('a');
          a.href = pdfUrl;
          a.download = `bon_commande_${order.id}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(pdfUrl);
          break;
        case 'print':
          const printFrame = document.createElement('iframe');
          printFrame.style.position = 'fixed';
          printFrame.style.right = '0';
          printFrame.style.bottom = '0';
          printFrame.style.width = '0';
          printFrame.style.height = '0';
          printFrame.style.border = 'none';
          printFrame.src = pdfUrl;

          printFrame.onload = () => {
            try {
              printFrame.contentWindow?.print();
            } catch (error) {
              console.error('Error printing PDF:', error);
              toast.error("Erreur lors de l'impression");
            }
          };

          document.body.appendChild(printFrame);
          break;
      }
    },
    [getPdf],
  );

  // Format for date cells
  const formatDate = useCallback((params: ValueFormatterParams) => {
    if (!params.value) return '-';
    return new Date(params.value).toLocaleDateString('fr-FR');
  }, []);

  // Format for price cells
  const formatPrice = useCallback((params: ValueFormatterParams) => {
    if (params.value === null || params.value === undefined) return '-';
    return `${Number(params.value).toLocaleString('fr-FR')} €`;
  }, []);

  // PDF action button component
  const PdfActionButton = useCallback(
    ({
      order,
      action,
      icon,
      tooltip,
    }: {
      order: PurchaseOrder;
      action: PdfActionType;
      icon: React.ReactNode;
      tooltip: string;
    }) => {
      const isPdfLoading = loadingPdfIds[order.id];

      return (
        <Tooltip title={tooltip} arrow>
          <IconButton
            color="primary"
            onClick={() => handlePdfAction(order, action)}
            size="small"
            disabled={isPdfLoading}
          >
            {isPdfLoading ? <CircularProgress size={20} /> : icon}
          </IconButton>
        </Tooltip>
      );
    },
    [handlePdfAction, loadingPdfIds],
  );

  // Action cell renderer with buttons
  const actionCellRenderer = useCallback(
    (params: any) => {
      if (!params.data) return null;
      const order = params.data as PurchaseOrder;

      return (
        <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
          {order.orderPdfId && (
            <>
              <PdfActionButton
                order={order}
                action="view"
                icon={<VisibilityIcon />}
                tooltip="Voir PDF"
              />
              <PdfActionButton
                order={order}
                action="download"
                icon={<DownloadIcon />}
                tooltip="Télécharger PDF"
              />
              <PdfActionButton
                order={order}
                action="print"
                icon={<PrintIcon />}
                tooltip="Imprimer PDF"
              />
            </>
          )}
          <Tooltip title="Modifier" arrow>
            <IconButton
              color="primary"
              onClick={() => handleEditPurchaseOrder(order.id)}
              size="small"
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Supprimer" arrow>
            <IconButton
              color="error"
              onClick={() => handleDeletePurchaseOrder(order)}
              size="small"
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      );
    },
    [handleEditPurchaseOrder, handleDeletePurchaseOrder, PdfActionButton],
  );

  // Generate the PDF for a purchase order
  const generatePDF = useCallback(
    async (order: PurchaseOrder) => {
      try {
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
    },
    [texts],
  );

  // Handle status change
  const handleStatusChange = useCallback(
    async (
      orderId: number,
      field: 'hasAppointment' | 'isInstalled' | 'isInvoiced' | 'devis',
      value: boolean,
    ) => {
      if (!token) return;

      try {
        const statusData = { [field]: value };

        // If devis status is changing, we need to regenerate the PDF
        if (field === 'devis') {
          // First get the full purchase order data
          const orderData = await fetchPurchaseOrderById(token, orderId);

          // Update the devis status locally
          const updatedOrder = {
            ...orderData,
            devis: value,
          };

          // Generate new PDF with updated devis status
          const pdfBlob = await generatePDF(updatedOrder);

          // Update status and PDF in DB
          await updatePurchaseOrderStatus(token, orderId, statusData, pdfBlob);
        } else {
          // For other status changes, just update the status
          await updatePurchaseOrderStatus(token, orderId, statusData);
        }

        // Update local state
        setPurchaseOrders((prevOrders) =>
          prevOrders.map((order) =>
            order.id === orderId ? { ...order, ...statusData } : order,
          ),
        );

        toast.success(`Statut mis à jour avec succès`);
      } catch (error) {
        console.error('Error updating status:', error);
        toast.error('Erreur lors de la mise à jour du statut');
      }
    },
    [token, generatePDF],
  );

  // Appointment status cell renderer
  const appointmentStatusCellRenderer = useCallback(
    (params: ICellRendererParams) => {
      if (!params.data) return null;
      const order = params.data as PurchaseOrder;

      return (
        <Box
          sx={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Checkbox
            checked={order.hasAppointment}
            onChange={(e) => {
              const newValue = e.target.checked;
              const message = newValue
                ? 'Confirmer que le rendez-vous a été pris avec le client ?'
                : "Indiquer que le rendez-vous n'est pas encore pris ?";

              showConfirmDialog(
                newValue ? 'Confirmer rendez-vous' : 'Annuler rendez-vous',
                message,
                async () => {
                  await handleStatusChange(
                    order.id,
                    'hasAppointment',
                    newValue,
                  );
                },
                'appointment',
              );
            }}
            sx={{
              color: order.hasAppointment
                ? 'rgba(46, 125, 50, 0.8)'
                : 'rgba(211, 47, 47, 0.8)',
              '&.Mui-checked': {
                color: 'rgba(46, 125, 50, 0.8)',
              },
            }}
          />
        </Box>
      );
    },
    [handleStatusChange, showConfirmDialog],
  );

  // Installation status cell renderer
  const installationStatusCellRenderer = useCallback(
    (params: ICellRendererParams) => {
      if (!params.data) return null;
      const order = params.data as PurchaseOrder;

      return (
        <Box
          sx={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Checkbox
            checked={order.isInstalled}
            onChange={(e) => {
              const newValue = e.target.checked;
              const message = newValue
                ? "Confirmer que l'installation a été effectuée ?"
                : "Indiquer que l'installation n'a pas encore été effectuée ?";

              showConfirmDialog(
                newValue ? 'Confirmer installation' : 'Annuler installation',
                message,
                async () => {
                  await handleStatusChange(order.id, 'isInstalled', newValue);
                },
                'installation',
              );
            }}
            sx={{
              color: order.isInstalled
                ? 'rgba(46, 125, 50, 0.8)'
                : 'rgba(211, 47, 47, 0.8)',
              '&.Mui-checked': {
                color: 'rgba(46, 125, 50, 0.8)',
              },
            }}
          />
        </Box>
      );
    },
    [handleStatusChange, showConfirmDialog],
  );

  // Invoice status cell renderer
  const invoiceStatusCellRenderer = useCallback(
    (params: ICellRendererParams) => {
      if (!params.data) return null;
      const order = params.data as PurchaseOrder;

      return (
        <Box
          sx={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Checkbox
            checked={order.isInvoiced}
            onChange={(e) => {
              const newValue = e.target.checked;
              const message = newValue
                ? 'Confirmer que la facture a été émise ?'
                : "Indiquer que la facture n'a pas encore été émise ?";

              showConfirmDialog(
                newValue ? 'Confirmer facturation' : 'Annuler facturation',
                message,
                async () => {
                  await handleStatusChange(order.id, 'isInvoiced', newValue);
                },
                'invoice',
              );
            }}
            sx={{
              color: order.isInvoiced
                ? 'rgba(46, 125, 50, 0.8)'
                : 'rgba(211, 47, 47, 0.8)',
              '&.Mui-checked': {
                color: 'rgba(46, 125, 50, 0.8)',
              },
            }}
          />
        </Box>
      );
    },
    [handleStatusChange, showConfirmDialog],
  );

  // Devis status cell renderer
  const devisStatusCellRenderer = useCallback(
    (params: ICellRendererParams) => {
      if (!params.data) return null;
      const order = params.data as PurchaseOrder;

      return (
        <Box
          sx={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Tooltip
            title={order.devis ? 'Devis en cours' : 'Bon de commande finalisé'}
            arrow
          >
            <Checkbox
              checked={!order.devis}
              onChange={(e) => {
                const newValue = !e.target.checked;
                const message = newValue
                  ? 'Êtes-vous sûr de vouloir transformer ce bon de commande en devis ? Un nouveau PDF sera généré.'
                  : 'Êtes-vous sûr de vouloir finaliser ce devis en bon de commande ? Un nouveau PDF sera généré.';

                showConfirmDialog(
                  newValue
                    ? 'Transformer en devis'
                    : 'Finaliser en bon de commande',
                  message,
                  async () => {
                    await handleStatusChange(order.id, 'devis', newValue);
                  },
                  newValue ? 'devis' : 'bon',
                );
              }}
              sx={{
                color: !order.devis
                  ? 'rgba(46, 125, 50, 0.8)'
                  : 'rgba(211, 47, 47, 0.8)',
                '&.Mui-checked': {
                  color: 'rgba(46, 125, 50, 0.8)',
                },
              }}
            />
          </Tooltip>
        </Box>
      );
    },
    [handleStatusChange, showConfirmDialog],
  );

  // External filter functions for client search
  const isExternalFilterPresent = useCallback((): boolean => {
    return Boolean(customerFilterText);
  }, [customerFilterText]);

  const doesExternalFilterPass = useCallback(
    (node: IRowNode<PurchaseOrder>): boolean => {
      if (node.data) {
        const { clientFirstName, clientLastName } = node.data;
        const customerSearchWords = customerFilterText
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .split(' ');
        const normalizeString = (str: string) =>
          str
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
        return customerSearchWords.every(
          (word) =>
            normalizeString(clientFirstName || '').includes(word) ||
            normalizeString(clientLastName || '').includes(word),
        );
      }
      return true;
    },
    [customerFilterText],
  );

  // Column definitions
  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        headerName: 'Création',
        field: 'createdAt',
        sortable: true,
        filter: true,
        minWidth: 130,
        maxWidth: 130,
        valueFormatter: formatDate,
      },
      {
        headerName: 'Client',
        field: 'clientName',
        sortable: true,
        filter: true,
        valueGetter: (params) => {
          if (!params.data) return '';
          return `${params.data.clientFirstName} ${params.data.clientLastName}`;
        },
      },
      {
        headerName: 'Robot',
        field: 'robotName',
        sortable: true,
        filter: true,
        valueGetter: (params) => {
          if (!params.data || !params.data.robotInventory) return '';
          return params.data.robotInventory.name;
        },
      },
      {
        headerName: 'N° de série',
        field: 'serialNumber',
        sortable: true,
        filter: true,
      },
      {
        headerName: 'Acompte',
        field: 'deposit',
        sortable: true,
        filter: 'agNumberColumnFilter',
        valueFormatter: formatPrice,
      },
      {
        headerName: "Date d'installation",
        field: 'installationDate',
        sortable: true,
        filter: true,
        valueFormatter: formatDate,
      },
      {
        headerName: 'Devis accepté',
        field: 'devis',
        sortable: true,
        filter: false,
        minWidth: 120,
        maxWidth: 120,
        cellRenderer: devisStatusCellRenderer,
        cellClass: 'no-focus-outline',
        headerTooltip:
          'Cochez si le devis est transformé en bon de commande finalisé',
        cellStyle: (params: any) => ({
          backgroundColor:
            params.data && !params.data.devis
              ? 'rgba(46, 125, 50, 0.1)'
              : 'rgba(211, 47, 47, 0.1)',
        }),
      },
      {
        headerName: 'RDV pris',
        field: 'hasAppointment',
        sortable: true,
        filter: true,
        minWidth: 120,
        maxWidth: 120,
        cellRenderer: appointmentStatusCellRenderer,
        cellClass: 'no-focus-outline',
        cellStyle: (params: any) => ({
          backgroundColor:
            params.data && params.data.hasAppointment
              ? 'rgba(46, 125, 50, 0.1)'
              : 'rgba(211, 47, 47, 0.1)',
        }),
      },
      {
        headerName: 'Installé',
        field: 'isInstalled',
        sortable: true,
        filter: true,
        minWidth: 120,
        maxWidth: 120,
        cellRenderer: installationStatusCellRenderer,
        cellClass: 'no-focus-outline',
        cellStyle: (params: any) => ({
          backgroundColor:
            params.data && params.data.isInstalled
              ? 'rgba(46, 125, 50, 0.1)'
              : 'rgba(211, 47, 47, 0.1)',
        }),
      },
      {
        headerName: 'Facturé',
        field: 'isInvoiced',
        sortable: true,
        filter: true,
        minWidth: 120,
        maxWidth: 120,
        cellRenderer: invoiceStatusCellRenderer,
        cellClass: 'no-focus-outline',
        cellStyle: (params: any) => ({
          backgroundColor:
            params.data && params.data.isInvoiced
              ? 'rgba(46, 125, 50, 0.1)'
              : 'rgba(211, 47, 47, 0.1)',
        }),
      },
      {
        headerName: 'Actions',
        field: 'actions',
        sortable: false,
        filter: false,
        minWidth: 200,
        maxWidth: 200,
        cellRenderer: actionCellRenderer,
      },
    ],
    [
      formatDate,
      formatPrice,
      actionCellRenderer,
      appointmentStatusCellRenderer,
      installationStatusCellRenderer,
      invoiceStatusCellRenderer,
      devisStatusCellRenderer,
    ],
  );

  const onGridReady = useCallback(
    (params: GridReadyEvent<PurchaseOrder>) => {
      if (loading) {
        params.api.showLoadingOverlay();
      } else {
        params.api.hideOverlay();
      }

      const gridApi = params.api;
      // Setup event listeners to save grid state on changes
      setupGridStateEvents(gridApi, PURCHASE_ORDERS_GRID_STATE_KEY);
    },
    [loading],
  );

  // Handle first data rendered - load saved column state
  const handleFirstDataRendered = useCallback((params: any) => {
    onFirstDataRendered(params, PURCHASE_ORDERS_GRID_STATE_KEY);
  }, []);

  // Handle opening Google Drive folder
  const handleOpenGoogleDrive = useCallback(() => {
    if (config && config['URL drive bons de commande']) {
      window.open(config['URL drive bons de commande'], '_blank');
    } else {
      toast.error('Lien vers Google Drive non configuré');
    }
  }, [config]);

  // Handle reset grid state
  const handleResetGrid = useCallback(() => {
    showConfirmDialog(
      'Réinitialiser le tableau',
      'Réinitialiser tous les paramètres du tableau (colonnes, filtres) ?',
      async () => {
        // Clear the saved state
        clearGridState(PURCHASE_ORDERS_GRID_STATE_KEY);
        // Reload the page to apply the reset
        window.location.reload();
      },
      'warning',
    );
  }, [showConfirmDialog]);

  // Available page size options
  const pageSizeOptions = [5, 10, 15, 20, 25, 50, 100];

  // Get dialog icon based on type
  const getDialogIcon = (type: ConfirmDialogState['type']) => {
    switch (type) {
      case 'delete':
        return <DeleteIcon sx={{ fontSize: 60, color: 'error.main' }} />;
      case 'warning':
        return (
          <WarningAmberIcon sx={{ fontSize: 60, color: 'warning.main' }} />
        );
      case 'success':
        return (
          <CheckCircleOutlineIcon
            sx={{ fontSize: 60, color: 'success.main' }}
          />
        );
      case 'devis':
        return <DescriptionIcon sx={{ fontSize: 60, color: 'info.main' }} />;
      case 'bon':
        return <ReceiptIcon sx={{ fontSize: 60, color: 'success.main' }} />;
      case 'appointment':
        return (
          <EventAvailableIcon sx={{ fontSize: 60, color: 'primary.main' }} />
        );
      case 'installation':
        return <HandymanIcon sx={{ fontSize: 60, color: 'secondary.main' }} />;
      case 'invoice':
        return <ReceiptIcon sx={{ fontSize: 60, color: 'info.dark' }} />;
      case 'info':
      default:
        return <HelpOutlineIcon sx={{ fontSize: 60, color: 'info.main' }} />;
    }
  };

  // Get button color based on dialog type
  const getDialogActionColor = (type: ConfirmDialogState['type']) => {
    switch (type) {
      case 'delete':
        return 'error';
      case 'warning':
        return 'warning';
      case 'devis':
        return 'info';
      case 'bon':
        return 'success';
      case 'appointment':
      case 'installation':
      case 'invoice':
        return 'primary';
      case 'success':
      case 'info':
      default:
        return 'primary';
    }
  };

  if (loading) {
    return <Typography>Chargement...</Typography>;
  }

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Enhanced Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={handleCloseDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        disableEscapeKeyDown={confirmDialog.isLoading}
        maxWidth="sm"
        TransitionComponent={Fade}
        TransitionProps={{ timeout: 300 }}
      >
        <DialogTitle
          id="alert-dialog-title"
          sx={{
            textAlign: 'center',
            fontWeight: 'bold',
            pt: 3,
            pb: 1,
          }}
        >
          {confirmDialog.title}
        </DialogTitle>
        <DialogContent sx={{ px: 4, py: 2 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Fade in={true} timeout={500}>
              <Box sx={{ mb: 3, mt: 1 }}>
                {getDialogIcon(confirmDialog.type)}
              </Box>
            </Fade>

            <Card
              elevation={0}
              sx={{
                width: '100%',
                backgroundColor: 'background.paper',
                p: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              <Typography
                variant="body1"
                align="center"
                sx={{
                  px: 2,
                  fontWeight: 'medium',
                }}
              >
                {confirmDialog.message}
              </Typography>
            </Card>
          </Box>

          {confirmDialog.isLoading && (
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
            onClick={handleCloseDialog}
            variant="outlined"
            color="inherit"
            disabled={confirmDialog.isLoading}
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
            onClick={handleConfirmDialog}
            variant="contained"
            color={getDialogActionColor(confirmDialog.type)}
            disabled={confirmDialog.isLoading}
            startIcon={
              confirmDialog.isLoading ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <CheckCircleOutlineIcon />
              )
            }
            sx={{
              minWidth: 120,
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: 'scale(1.05)',
              },
            }}
          >
            {confirmDialog.isLoading ? 'Traitement...' : 'Confirmer'}
          </Button>
        </DialogActions>
      </Dialog>

      <Box
        sx={{
          pt: 1.5,
          pb: 1,
          pl: 2,
          pr: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="h5" component="h1">
          Bons de commande
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip
            title="Réinitialiser le tableau (filtre, tri, déplacement et taille des colonnes)"
            arrow
          >
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<RestartAltIcon />}
              onClick={handleResetGrid}
              size="small"
            >
              Réinitialiser
            </Button>
          </Tooltip>
          <Tooltip title="Ouvrir le dossier Google Drive" arrow>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<FolderOpenIcon />}
              onClick={handleOpenGoogleDrive}
            >
              Google Drive
            </Button>
          </Tooltip>
          <TextField
            id="search-client"
            label="Rechercher un client"
            variant="outlined"
            size="small"
            sx={{ minWidth: 300 }}
            value={customerFilterText}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setCustomerFilterText(e.target.value)
            }
            slotProps={{
              input: {
                endAdornment: <SearchIcon />,
              },
            }}
          />
          <Tooltip title="Créer un devis ou bon de commande" arrow>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAddPurchaseOrder}
            >
              Créer un devis ou bon de commande
            </Button>
          </Tooltip>
        </Box>
      </Box>
      <StyledAgGridWrapper
        id="purchase-orders-table"
        className={`purchase-orders-table ag-theme-quartz${
          theme.palette.mode === 'dark' ? '-dark' : ''
        }`}
      >
        <AgGridReact
          suppressCellFocus={true}
          suppressMovableColumns={true}
          ref={gridRef}
          rowData={purchaseOrders}
          columnDefs={columnDefs}
          pagination={true}
          paginationPageSize={paginationPageSize}
          paginationPageSizeSelector={pageSizeOptions}
          localeText={AG_GRID_LOCALE_FR}
          autoSizeStrategy={{ type: 'fitGridWidth' }}
          onGridReady={onGridReady}
          onFirstDataRendered={handleFirstDataRendered}
          overlayLoadingTemplate='<span class="ag-overlay-loading-center">Chargement...</span>'
          loadingOverlayComponentParams={{ loading }}
          overlayNoRowsTemplate='<span class="ag-overlay-no-rows-center">Aucun bon de commande trouvé</span>'
          onPaginationChanged={(event) => {
            const api = event.api;
            const newPageSize = api.paginationGetPageSize();
            if (newPageSize !== paginationPageSize) {
              setPaginationPageSize(newPageSize);
            }
          }}
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
        />
      </StyledAgGridWrapper>
    </Paper>
  );
};

export default PurchaseOrders;
