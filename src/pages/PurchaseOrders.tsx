import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Tooltip,
  Typography,
  useTheme,
  Select,
  MenuItem,
  FormControl,
  SelectChangeEvent,
  Checkbox,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
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
} from '../utils/api';
import {
  onFirstDataRendered,
  setupGridStateEvents,
  clearGridState,
} from '../utils/agGridSettingsHelper';
import { PurchaseOrder } from '../utils/types';
import { RootState } from '../store';
import { useSelector } from 'react-redux';

// PDF action types
type PdfActionType = 'view' | 'download' | 'print';

const PurchaseOrders: React.FC = () => {
  const { token } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();
  const config = useSelector((state: RootState) => state.config.config);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [paginationPageSize, setPaginationPageSize] = useState(10);
  const [pdfCache, setPdfCache] = useState<Record<number, Blob>>({});
  const [loadingPdfIds, setLoadingPdfIds] = useState<Record<number, boolean>>(
    {},
  );
  const gridRef = React.createRef<AgGridReact>();

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

  // Calculate page size
  const calculatePageSize = useCallback(() => {
    const element = document.getElementById('purchase-orders-table');
    const footer = document.querySelector('.ag-paging-panel');
    const header = document.querySelector('.ag-header-viewport');
    if (element) {
      const elementHeight = element.clientHeight;
      const footerHeight = footer?.clientHeight ?? 48;
      const headerHeight = header?.clientHeight ?? 48;
      const rowHeight = 48; // Default row height
      const newPageSize = Math.floor(
        (elementHeight - headerHeight - footerHeight) / rowHeight,
      );
      setPaginationPageSize(Math.max(5, newPageSize)); // Ensure minimum of 5 rows
    }
  }, []);

  useEffect(() => {
    window.addEventListener('resize', calculatePageSize);
    calculatePageSize();

    return () => {
      window.removeEventListener('resize', calculatePageSize);
    };
  }, [calculatePageSize]);

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

  // Handle delete purchase order
  const handleDeletePurchaseOrder = useCallback(
    async (order: PurchaseOrder) => {
      if (
        !token ||
        !window.confirm(
          'Êtes-vous sûr de vouloir supprimer ce bon de commande?',
        )
      ) {
        return;
      }

      try {
        await deletePurchaseOrder(token, order.id);
        setPurchaseOrders((prev) => prev.filter((o) => o.id !== order.id));
        toast.success('Bon de commande supprimé avec succès');
      } catch (error) {
        console.error('Error deleting purchase order:', error);
        toast.error('Erreur lors de la suppression');
      }
    },
    [token],
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

  // Handle status change
  const handleStatusChange = useCallback(
    async (
      orderId: number,
      field: 'hasAppointment' | 'isInstalled' | 'isInvoiced',
      value: boolean,
    ) => {
      if (!token) return;

      try {
        const statusData = { [field]: value };
        const updatedOrder = await updatePurchaseOrderStatus(
          token,
          orderId,
          statusData,
        );

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
    [token],
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
              handleStatusChange(order.id, 'hasAppointment', e.target.checked);
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
    [handleStatusChange],
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
              handleStatusChange(order.id, 'isInstalled', e.target.checked);
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
    [handleStatusChange],
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
              handleStatusChange(order.id, 'isInvoiced', e.target.checked);
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
    [handleStatusChange],
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
    ],
  );

  const onGridReady = useCallback(
    (params: GridReadyEvent<PurchaseOrder>) => {
      if (loading) {
        params.api.showLoadingOverlay();
      } else {
        params.api.hideOverlay();
      }
      calculatePageSize();

      const gridApi = params.api;
      // Setup event listeners to save grid state on changes
      setupGridStateEvents(gridApi, 'purchaseOrdersAgGridState');
    },
    [loading, calculatePageSize],
  );

  // Handle first data rendered - load saved column state
  const handleFirstDataRendered = useCallback((params: any) => {
    onFirstDataRendered(params, 'purchaseOrdersAgGridState');
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
    if (
      window.confirm(
        'Réinitialiser tous les paramètres du tableau (colonnes, filtres) ?',
      )
    ) {
      // Clear the saved state
      clearGridState('purchaseOrdersAgGridState');
      // Reload the page to apply the reset
      window.location.reload();
    }
  }, []);

  if (loading) {
    return <Typography>Chargement...</Typography>;
  }

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
          <Tooltip title="Créer un bon de commande" arrow>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAddPurchaseOrder}
            >
              Créer un bon de commande
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
          localeText={AG_GRID_LOCALE_FR}
          autoSizeStrategy={{ type: 'fitGridWidth' }}
          onGridReady={onGridReady}
          onFirstDataRendered={handleFirstDataRendered}
          overlayLoadingTemplate='<span class="ag-overlay-loading-center">Chargement...</span>'
          paginationPageSizeSelector={false}
          loadingOverlayComponentParams={{ loading }}
          overlayNoRowsTemplate='<span class="ag-overlay-no-rows-center">Aucun bon de commande trouvé</span>'
        />
      </StyledAgGridWrapper>
    </Paper>
  );
};

export default PurchaseOrders;
