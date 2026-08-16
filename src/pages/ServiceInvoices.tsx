import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import {
  Box,
  Button,
  Paper,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  Chip,
} from '@mui/material';
import { useAuth } from '../hooks/AuthProvider';
import { useTheme } from '@mui/material/styles';
import type {
  ColDef,
  GetRowIdParams,
  GridReadyEvent,
  PaginationChangedEvent,
} from 'ag-grid-community';
import { AG_GRID_LOCALE_FR } from '@ag-grid-community/locale';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DownloadIcon from '@mui/icons-material/Download';
import AddIcon from '@mui/icons-material/Add';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SearchIcon from '@mui/icons-material/Search';
import { getServiceInvoices, getServiceInvoicePdf } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { ServiceInvoice, ServiceInvoiceStatus } from '../utils/types';
import {
  formatCurrency,
  getInvoiceStatusLabel,
  getInvoiceStatusColor,
  getPaymentMethodLabel,
} from '../utils/invoiceUtils';
import { notifyError } from '../utils/notifications';
import { toast } from 'react-toastify';
import {
  onFirstDataRendered,
  setupGridStateEvents,
  clearGridState,
  saveGridPageSize,
  loadGridPageSize,
} from '../utils/agGridSettingsHelper';
import { StyledAgGridWrapper } from '../components/styles/AgGridStyles';
import MultiSelectDropdown from '../components/MultiSelectDropdown';

const rowHeight = 40;
const GRID_STATE_KEY = 'serviceInvoicesAgGridState';

// Module-level constants: stable identity across renders, so AG Grid does not
// rebuild the whole grid body every time the component re-renders.
const PAGE_SIZE_OPTIONS = [5, 10, 15, 20, 25, 50, 100];

const DEFAULT_COL_DEF: ColDef = {
  resizable: true,
  sortable: true,
};

const getRowId = (params: GetRowIdParams<ServiceInvoice>) =>
  String(params.data.id);

const getClientValue = (params: any) => {
  const first = params.data?.clientFirstName || '';
  const last = params.data?.clientLastName || '';
  return `${first} ${last}`.trim();
};

const formatDash = (params: any) => params.value || '-';

const formatAmount = (params: any) =>
  params.value != null ? formatCurrency(params.value) : '-';

const AMOUNT_CELL_STYLE = { textAlign: 'right' } as const;

const formatPaymentMethod = (params: any) =>
  params.value ? getPaymentMethodLabel(params.value) : '-';

const renderStatusCell = (params: any) => {
  if (!params.value) return '-';
  return (
    <Chip
      label={getInvoiceStatusLabel(params.value)}
      size="small"
      sx={{
        backgroundColor: getInvoiceStatusColor(params.value),
        color: '#fff',
        fontWeight: 600,
        fontSize: '0.75rem',
      }}
    />
  );
};

const renderDolibarrCell = (params: any) => {
  const status = params.value;
  if (status === 'synced') return <span style={{ color: '#4caf50' }}>✓</span>;
  if (status === 'error') return <span style={{ color: '#ff9800' }}>⚠</span>;
  return <span style={{ color: '#9e9e9e' }}>—</span>;
};

const formatDate = (params: any) =>
  params.value ? new Date(params.value).toLocaleDateString('fr-FR') : '-';

const compareDates = (valueA: string, valueB: string) =>
  new Date(valueA).getTime() - new Date(valueB).getTime();

const statusLabelToValue: Record<string, string> = {
  Brouillon: 'DRAFT',
  Envoyée: 'SENT',
  Payée: 'PAID',
};
const statusLabels = Object.keys(statusLabelToValue);

const ServiceInvoices: React.FC = () => {
  const auth = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();
  const gridRef = useRef<AgGridReact>(null);
  const [invoices, setInvoices] = useState<ServiceInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedStatusLabels, setSelectedStatusLabels] = useState<string[]>(
    [],
  );

  const [paginationPageSize, setPaginationPageSize] = useState(() =>
    loadGridPageSize(GRID_STATE_KEY, 20),
  );

  const isMediumScreen = useMediaQuery('(max-width:1400px)');
  const isSmallScreen = useMediaQuery('(max-width:1200px)');
  const isTablet = useMediaQuery('(max-width:768px)');
  const isMobile = useMediaQuery('(max-width:480px)');
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const showTextInButton = !isXs;

  const buttonSx = useMemo(
    () => ({
      whiteSpace: 'nowrap',
      ...(showTextInButton
        ? {}
        : {
            minWidth: 'unset',
            '& .MuiButton-startIcon': { m: 0 },
            '& .MuiButton-endIcon': { m: 0 },
          }),
    }),
    [showTextInButton],
  );

  useEffect(() => {
    saveGridPageSize(GRID_STATE_KEY, paginationPageSize);
  }, [paginationPageSize]);

  const fetchInvoices = useCallback(async () => {
    if (!auth.token) return;
    setLoading(true);
    try {
      const data = await getServiceInvoices(auth.token, { type: 'REPAIR' });
      setInvoices(data);
    } catch (error) {
      notifyError('Erreur lors du chargement des factures');
    } finally {
      setLoading(false);
    }
  }, [auth.token]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleResetGrid = useCallback(() => {
    clearGridState(GRID_STATE_KEY);
    window.location.reload();
  }, []);

  const handleGridReady = useCallback((e: GridReadyEvent) => {
    setupGridStateEvents(e.api, GRID_STATE_KEY);
  }, []);

  const handleFirstDataRendered = useCallback((e: any) => {
    onFirstDataRendered(e, GRID_STATE_KEY);
  }, []);

  const handlePaginationChanged = useCallback((e: PaginationChangedEvent) => {
    if (!e.api) return;
    const newSize = e.api.paginationGetPageSize();
    setPaginationPageSize((current) =>
      newSize !== current ? newSize : current,
    );
  }, []);

  const handleDownloadPdf = useCallback(
    async (invoice: ServiceInvoice) => {
      if (invoice.status === ServiceInvoiceStatus.DRAFT) return;
      try {
        const blob = await getServiceInvoicePdf(auth.token, invoice.id);
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } catch (error) {
        toast.error('Erreur lors du téléchargement du PDF');
      }
    },
    [auth.token],
  );

  const filteredInvoices = useMemo(() => {
    let filtered = invoices;

    if (selectedStatusLabels.length > 0) {
      const statusValues = selectedStatusLabels.map(
        (l) => statusLabelToValue[l],
      );
      filtered = filtered.filter((inv) => statusValues.includes(inv.status));
    }

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      filtered = filtered.filter(
        (inv) =>
          inv.clientFirstName?.toLowerCase().includes(q) ||
          inv.clientLastName?.toLowerCase().includes(q) ||
          inv.clientPhone?.toLowerCase().includes(q) ||
          inv.invoiceNumber?.toLowerCase().includes(q),
      );
    }

    return filtered;
  }, [invoices, selectedStatusLabels, searchText]);

  const renderInvoiceNumberCell = useCallback(
    (params: any) => (
      <span
        style={{ cursor: 'pointer', color: 'inherit', fontWeight: 500 }}
        onClick={() => navigate(`/factures/${params.data.id}`)}
      >
        {params.value}
      </span>
    ),
    [navigate],
  );

  const renderActionsCell = useCallback(
    (params: any) => {
      const inv = params.data as ServiceInvoice;
      return (
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          <Tooltip title="Voir">
            <Button
              size="small"
              sx={{ minWidth: 'unset', p: 0.5 }}
              onClick={() => navigate(`/factures/${inv.id}`)}
            >
              <VisibilityIcon fontSize="small" />
            </Button>
          </Tooltip>
          {inv.status === ServiceInvoiceStatus.DRAFT && (
            <Tooltip title="Modifier">
              <Button
                size="small"
                sx={{ minWidth: 'unset', p: 0.5 }}
                onClick={() => navigate(`/factures/${inv.id}/edit`)}
              >
                <EditIcon fontSize="small" />
              </Button>
            </Tooltip>
          )}
          {inv.status !== ServiceInvoiceStatus.DRAFT && (
            <Tooltip title="Télécharger PDF">
              <Button
                size="small"
                sx={{ minWidth: 'unset', p: 0.5 }}
                onClick={() => handleDownloadPdf(inv)}
              >
                <DownloadIcon fontSize="small" />
              </Button>
            </Tooltip>
          )}
        </Box>
      );
    },
    [navigate, handleDownloadPdf],
  );

  const columns: ColDef<ServiceInvoice>[] = useMemo(
    () => [
      {
        headerName: 'N°',
        field: 'invoiceNumber',
        sortable: true,
        filter: false,
        minWidth: 140,
        maxWidth: 180,
        cellRenderer: renderInvoiceNumberCell,
      },
      {
        headerName: 'Client',
        sortable: true,
        filter: true,
        valueGetter: getClientValue,
      },
      {
        headerName: 'Téléphone',
        field: 'clientPhone',
        sortable: true,
        filter: true,
        minWidth: 120,
        hide: isTablet,
        valueFormatter: formatDash,
      },

      {
        headerName: 'Montant TTC',
        field: 'totalTTC',
        sortable: true,
        filter: false,
        width: 130,
        hide: isTablet,
        valueFormatter: formatAmount,
        cellStyle: AMOUNT_CELL_STYLE,
      },
      {
        headerName: 'Paiement',
        field: 'paymentMethod',
        sortable: true,
        filter: true,
        width: 110,
        hide: isMediumScreen,
        valueFormatter: formatPaymentMethod,
      },
      {
        headerName: 'Statut',
        field: 'status',
        sortable: true,
        filter: true,
        width: 110,
        cellRenderer: renderStatusCell,
      },
      {
        headerName: 'Dolibarr',
        field: 'dolibarrSyncStatus',
        sortable: false,
        filter: false,
        width: 90,
        hide: isSmallScreen,
        cellRenderer: renderDolibarrCell,
      },
      {
        headerName: 'Date',
        field: 'createdAt',
        sortable: true,
        unSortIcon: true,
        filter: 'agDateColumnFilter',
        initialSort: 'desc',
        width: 160,
        hide: isMobile,
        valueFormatter: formatDate,
        comparator: compareDates,
      },
      {
        headerName: 'Actions',
        field: 'id',
        sortable: false,
        filter: false,
        width: 120,
        minWidth: 120,
        cellRenderer: renderActionsCell,
      },
    ],
    [
      isTablet,
      isMediumScreen,
      isSmallScreen,
      isMobile,
      renderInvoiceNumberCell,
      renderActionsCell,
    ],
  );

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {isMobile || isTablet ? (
        <Box
          sx={{
            pt: 1.5,
            pb: 1,
            pl: 2,
            pr: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Typography variant="h5" component="h1" sx={{ flexShrink: 0 }}>
              Factures de service
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
              <Tooltip title="Réinitialiser le tableau" arrow>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={handleResetGrid}
                  size="small"
                  sx={{ minWidth: 'unset', px: 1 }}
                >
                  <RestartAltIcon />
                </Button>
              </Tooltip>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => navigate('/factures/nouveau')}
                sx={buttonSx}
              >
                {showTextInButton && 'Nouvelle facture'}
              </Button>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <MultiSelectDropdown
                label="Statut"
                options={statusLabels}
                selectedValues={selectedStatusLabels}
                onChange={setSelectedStatusLabels}
              />
            </Box>
          </Box>

          <TextField
            size="small"
            placeholder="Rechercher..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'grey.500' }} />,
            }}
            fullWidth
          />
        </Box>
      ) : (
        <Box
          sx={{
            pt: 1.5,
            pb: 1,
            pl: 2,
            pr: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Typography variant="h5" component="h1" sx={{ flexShrink: 0, mr: 2 }}>
            Factures de service
          </Typography>
          <Box sx={{ minWidth: 150 }}>
            <MultiSelectDropdown
              label="Statut"
              options={statusLabels}
              selectedValues={selectedStatusLabels}
              onChange={setSelectedStatusLabels}
            />
          </Box>
          <TextField
            size="small"
            placeholder="Rechercher client, N° facture..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'grey.500' }} />,
            }}
            sx={{ width: 280 }}
          />
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title="Réinitialiser le tableau" arrow>
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleResetGrid}
              size="small"
              sx={{ minWidth: 'unset', px: 1 }}
            >
              <RestartAltIcon />
            </Button>
          </Tooltip>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => navigate('/factures/nouveau')}
          >
            Nouvelle facture
          </Button>
        </Box>
      )}

      <StyledAgGridWrapper>
        <AgGridReact
          ref={gridRef}
          className={`ag-theme-quartz${theme.palette.mode === 'dark' ? '-dark' : ''}`}
          rowData={filteredInvoices}
          columnDefs={columns}
          defaultColDef={DEFAULT_COL_DEF}
          getRowId={getRowId}
          rowHeight={rowHeight}
          pagination
          paginationPageSize={paginationPageSize}
          paginationPageSizeSelector={PAGE_SIZE_OPTIONS}
          onPaginationChanged={handlePaginationChanged}
          localeText={AG_GRID_LOCALE_FR}
          onFirstDataRendered={handleFirstDataRendered}
          onGridReady={handleGridReady}
          loading={loading}
        />
      </StyledAgGridWrapper>
    </Paper>
  );
};

export default ServiceInvoices;
