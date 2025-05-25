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
  useMediaQuery,
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
import { StyledAgGridWrapper } from './styles/AgGridStyles';
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
import { PurchaseOrderPdfDocument } from './PurchaseOrderPdf';
import ConfirmDialog, { ConfirmDialogType } from './dialogs/ConfirmDialog';

// PDF action types
type PdfActionType = 'view' | 'download' | 'print';

// Dialog state type
interface ConfirmDialogState {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => Promise<void>;
  isLoading: boolean;
  type?: ConfirmDialogType;
}

interface OrdersGridProps {
  title: string;
  isDevis?: boolean;
  gridStateKey: string;
  addButtonText: string;
  addButtonPath: string;
  driveConfigKey?: string;
  includeSignedColumn?: boolean;
  customDevisCell?: React.ComponentType<ICellRendererParams>;
}

const CHECKBOX_CELL_WIDTH = 80;
// Available page size options
const pageSizeOptions = [5, 10, 15, 20, 25, 50, 100];

const OrdersGrid: React.FC<OrdersGridProps> = ({
  title,
  isDevis = false,
  gridStateKey,
  addButtonText,
  addButtonPath,
  driveConfigKey = 'URL drive bons de commande',
  includeSignedColumn = false,
  customDevisCell,
}) => {
  const { token } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();
  const config = useSelector((state: RootState) => state.config.config);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerFilterText, setCustomerFilterText] = useState('');
  const [paginationPageSize, setPaginationPageSize] = useState(() =>
    loadGridPageSize(gridStateKey, 20),
  );
  const [pdfCache, setPdfCache] = useState<Record<number, Blob>>({});
  const [loadingPdfIds, setLoadingPdfIds] = useState<Record<number, boolean>>(
    {},
  );

  // Media queries for responsive design
  const isMediumScreen = useMediaQuery('(max-width:1400px)');
  const isSmallScreen = useMediaQuery('(max-width:1200px)');
  const isMobile = useMediaQuery('(max-width:480px)');
  const isHeaderCompact = useMediaQuery('(max-width:1175px)');

  // Calculate showTextInButton based on screen size (false when xs)
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const showTextInButton = !isXs;

  // Button style based on showTextInButton
  const buttonSx = {
    whiteSpace: 'nowrap',
    ...(showTextInButton
      ? {}
      : {
          minWidth: 'unset',
          '& .MuiButton-startIcon': { m: 0 },
          '& .MuiButton-endIcon': { m: 0 },
        }),
  };

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    title: '',
    message: '',
    onConfirm: async () => {},
    isLoading: false,
    type: 'info',
  });

  const gridRef = React.createRef<AgGridReact>();
  const { texts } = useSelector((state: RootState) => state.installationTexts);

  // Add resize handler to fit columns on window size change
  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout;

    const handleResize = () => {
      // Debounce resize event
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (gridRef.current && gridRef.current.api) {
          gridRef.current.api.sizeColumnsToFit();
        }
      }, 250);
    };

    window.addEventListener('resize', handleResize);

    // Initial sizing
    if (gridRef.current && gridRef.current.api) {
      gridRef.current.api.sizeColumnsToFit();
    }

    // Cleanup
    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
    };
  }, [gridRef]);

  // Save page size to localStorage when it changes
  useEffect(() => {
    saveGridPageSize(gridStateKey, paginationPageSize);
  }, [paginationPageSize, gridStateKey]);

  // Fetch purchase orders
  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const response = await fetchPurchaseOrders(token);

        // Filter orders based on isDevis prop
        const filteredOrders =
          response.data?.filter((order) => order.devis === isDevis) || [];
        setPurchaseOrders(filteredOrders);
      } catch (error) {
        console.error('Error fetching purchase orders:', error);
        toast.error('Erreur lors du chargement des bons de commande');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, isDevis]);

  // Handle add new purchase order
  const handleAddPurchaseOrder = () => {
    navigate(addButtonPath);
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
      type: ConfirmDialogType = 'info',
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
        `Êtes-vous sûr de vouloir supprimer ce ${isDevis ? 'devis' : 'bon de commande'}?`,
        async () => {
          await deletePurchaseOrder(token, order.id);
          setPurchaseOrders((prev) => prev.filter((o) => o.id !== order.id));
          toast.success(
            `${isDevis ? 'Devis' : 'Bon de commande'} supprimé avec succès`,
          );
        },
        'delete',
      );
    },
    [token, showConfirmDialog, isDevis],
  );

  // Get PDF from API or cache
  const getPdf = useCallback(
    async (order: PurchaseOrder): Promise<Blob | null> => {
      if (!token || !order.orderPdfId) {
        toast.error(
          `Aucun PDF disponible pour ce ${isDevis ? 'devis' : 'bon de commande'}`,
        );
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
    [token, pdfCache, isDevis],
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
          a.download = `${isDevis ? 'devis' : 'bon_commande'}_${order.id}.pdf`;
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
    [getPdf, isDevis],
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

  // Column definitions with responsive visibility
  const getColumnDefs = useMemo<ColDef[]>(() => {
    const columns: ColDef[] = [
      {
        headerName: 'Création',
        field: 'createdAt',
        sortable: true,
        filter: false,
        minWidth: 105,
        maxWidth: 105,
        valueFormatter: formatDate,
        hide: isMobile, // Hide on mobile
      },
      {
        headerName: 'Client',
        field: 'clientName',
        sortable: true,
        filter: true,
        minWidth: 130,
        valueGetter: (params) => {
          if (!params.data) return '';
          return `${params.data.clientFirstName} ${params.data.clientLastName}`;
        },
      },
      {
        headerName: 'Robot',
        field: 'robotName',
        sortable: true,
        minWidth: 130,
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
        hide: isMediumScreen,
      },
      {
        headerName: 'Acompte',
        field: 'deposit',
        sortable: true,
        filter: 'agNumberColumnFilter',
        valueFormatter: formatPrice,
        hide: isSmallScreen, // Hide on small screens and below
      },
      {
        headerName: "Date d'installation",
        field: 'installationDate',
        sortable: true,
        filter: true,
        valueFormatter: formatDate,
        hide: isSmallScreen,
      },
      {
        headerName: 'RDV',
        field: 'hasAppointment',
        sortable: false,
        filter: false,
        minWidth: CHECKBOX_CELL_WIDTH,
        maxWidth: CHECKBOX_CELL_WIDTH,
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
        sortable: false,
        filter: false,
        minWidth: CHECKBOX_CELL_WIDTH,
        maxWidth: CHECKBOX_CELL_WIDTH,
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
        sortable: false,
        filter: false,
        minWidth: CHECKBOX_CELL_WIDTH,
        maxWidth: CHECKBOX_CELL_WIDTH,
        cellRenderer: invoiceStatusCellRenderer,
        cellClass: 'no-focus-outline',
        cellStyle: (params: any) => ({
          backgroundColor:
            params.data && params.data.isInvoiced
              ? 'rgba(46, 125, 50, 0.1)'
              : 'rgba(211, 47, 47, 0.1)',
        }),
      },
    ];

    // Only add the "Signé" column for Devis if includeSignedColumn is true
    if (includeSignedColumn) {
      columns.push({
        headerName: 'Signature',
        field: 'devis',
        sortable: false,
        filter: false,
        minWidth: 120,
        maxWidth: 120,
        cellRenderer: customDevisCell,
        cellClass: 'no-focus-outline',
      });
    }

    // Add status columns
    columns.push({
      headerName: 'Actions',
      field: 'actions',
      sortable: false,
      filter: false,
      minWidth: 200,
      maxWidth: 200,
      cellRenderer: actionCellRenderer,
    });

    return columns;
  }, [
    formatDate,
    formatPrice,
    actionCellRenderer,
    appointmentStatusCellRenderer,
    installationStatusCellRenderer,
    invoiceStatusCellRenderer,
    customDevisCell,
    isSmallScreen,
    isMobile,
    isMediumScreen,
    includeSignedColumn,
  ]);

  const onGridReady = useCallback(
    (params: GridReadyEvent<PurchaseOrder>) => {
      if (loading) {
        params.api.showLoadingOverlay();
      } else {
        params.api.hideOverlay();
      }

      const gridApi = params.api;
      // Setup event listeners to save grid state on changes
      setupGridStateEvents(gridApi, gridStateKey);

      // Size columns to fit the grid width
      gridApi.sizeColumnsToFit();
    },
    [loading, gridStateKey],
  );

  // Handle first data rendered - load saved column state
  const handleFirstDataRendered = useCallback(
    (params: any) => {
      onFirstDataRendered(params, gridStateKey);
      // Make sure columns fit the grid width after state is restored
      params.api.sizeColumnsToFit();
    },
    [gridStateKey],
  );

  // Handle opening Google Drive folder
  const handleOpenGoogleDrive = useCallback(() => {
    if (config && config[driveConfigKey]) {
      window.open(config[driveConfigKey], '_blank');
    } else {
      toast.error('Lien vers Google Drive non configuré');
    }
  }, [config, driveConfigKey]);

  // Handle reset grid state
  const handleResetGrid = useCallback(() => {
    showConfirmDialog(
      'Réinitialiser le tableau',
      'Réinitialiser tous les paramètres du tableau (colonnes, filtres) ?',
      async () => {
        // Clear the saved state
        clearGridState(gridStateKey);
        // Reload the page to apply the reset
        window.location.reload();
      },
      'warning',
    );
  }, [showConfirmDialog, gridStateKey]);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          p: 4,
        }}
      >
        <CircularProgress size={100} />
      </Box>
    );
  }

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Confirmation Dialog Component */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={handleConfirmDialog}
        onClose={handleCloseDialog}
        isLoading={confirmDialog.isLoading}
        type={confirmDialog.type}
      />

      <Box
        sx={{
          pt: 1.5,
          pb: 1,
          pl: 2,
          pr: 2,
          display: 'flex',
          flexDirection: isHeaderCompact ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isHeaderCompact ? 'stretch' : 'center',
          gap: 1,
        }}
      >
        {/* First row/section: Title and action buttons */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: isHeaderCompact ? '100%' : 'auto',
          }}
        >
          <Typography variant="h5" component="h1">
            {title}
          </Typography>
          {isHeaderCompact && (
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
                  sx={buttonSx}
                >
                  {showTextInButton && <Box>Réinitialiser</Box>}
                </Button>
              </Tooltip>
              <Tooltip title="Ouvrir le dossier Google Drive" arrow>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<FolderOpenIcon />}
                  onClick={handleOpenGoogleDrive}
                  sx={buttonSx}
                >
                  {showTextInButton && <Box>Google Drive</Box>}
                </Button>
              </Tooltip>
            </Box>
          )}
        </Box>

        {/* Second row/section: Search, buttons (when not compact), and add button */}
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            width: isHeaderCompact ? '100%' : 'auto',
            flex: isHeaderCompact ? 'none' : 1,
            justifyContent: isHeaderCompact ? 'space-between' : 'flex-end',
          }}
        >
          {!isHeaderCompact && (
            <>
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
                  sx={buttonSx}
                >
                  {showTextInButton && <Box>Réinitialiser</Box>}
                </Button>
              </Tooltip>
              <Tooltip title="Ouvrir le dossier Google Drive" arrow>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<FolderOpenIcon />}
                  onClick={handleOpenGoogleDrive}
                  sx={buttonSx}
                >
                  {showTextInButton && <Box>Google Drive</Box>}
                </Button>
              </Tooltip>
            </>
          )}
          <TextField
            id="search-client"
            label="Rechercher un client"
            variant="outlined"
            size="small"
            sx={{
              flex: 1,
              maxWidth: 900,
              minWidth: { xs: 100, sm: 200 },
            }}
            value={customerFilterText}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setCustomerFilterText(e.target.value)
            }
            slotProps={{ input: { endAdornment: <SearchIcon /> } }}
          />
          <Tooltip
            title={`Créer un ${isDevis ? 'devis' : 'bon de commande'}`}
            arrow
          >
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAddPurchaseOrder}
              sx={buttonSx}
            >
              {showTextInButton && <Box>{addButtonText}</Box>}
            </Button>
          </Tooltip>
        </Box>
      </Box>
      <StyledAgGridWrapper
        id={isDevis ? 'devis-table' : 'purchase-orders-table'}
        className={`${isDevis ? 'devis-table' : 'purchase-orders-table'} ag-theme-quartz${
          theme.palette.mode === 'dark' ? '-dark' : ''
        }`}
      >
        <AgGridReact
          suppressCellFocus={true}
          suppressMovableColumns={true}
          ref={gridRef}
          rowData={purchaseOrders}
          columnDefs={getColumnDefs}
          pagination={true}
          paginationPageSize={paginationPageSize}
          paginationPageSizeSelector={pageSizeOptions}
          localeText={AG_GRID_LOCALE_FR}
          autoSizeStrategy={{ type: 'fitGridWidth' }}
          onGridReady={onGridReady}
          onFirstDataRendered={handleFirstDataRendered}
          overlayLoadingTemplate='<span class="ag-overlay-loading-center">Chargement...</span>'
          loadingOverlayComponentParams={{ loading }}
          overlayNoRowsTemplate={`<span class="ag-overlay-no-rows-center">Aucun ${isDevis ? 'devis' : 'bon de commande'} trouvé</span>`}
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

export default OrdersGrid;
