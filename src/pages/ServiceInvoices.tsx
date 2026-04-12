import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import type { ColDef } from 'ag-grid-community';
import { AG_GRID_LOCALE_FR } from '@ag-grid-community/locale';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DownloadIcon from '@mui/icons-material/Download';
import AddIcon from '@mui/icons-material/Add';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SearchIcon from '@mui/icons-material/Search';
import { getServiceInvoices, getServiceInvoicePdf } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import {
  ServiceInvoice,
  ServiceInvoiceStatus,
} from '../utils/types';
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

const statusLabelToValue: Record<string, string> = {
  'Brouillon': 'DRAFT',
  'Envoyée': 'SENT',
  'Payée': 'PAID',
};
const statusLabels = Object.keys(statusLabelToValue);



const ServiceInvoices: React.FC = () => {
  const auth = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();
  const gridRef = React.createRef<AgGridReact>();
  const [invoices, setInvoices] = useState<ServiceInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedStatusLabels, setSelectedStatusLabels] = useState<string[]>([]);

  const [paginationPageSize, setPaginationPageSize] = useState(() =>
    loadGridPageSize(GRID_STATE_KEY, 20),
  );

  const isMediumScreen = useMediaQuery('(max-width:1400px)');
  const isSmallScreen = useMediaQuery('(max-width:1200px)');
  const isTablet = useMediaQuery('(max-width:768px)');
  const isMobile = useMediaQuery('(max-width:480px)');
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const showTextInButton = !isXs;

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

  const pageSizeOptions = [5, 10, 15, 20, 25, 50, 100];

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

  const handleResetGrid = () => {
    clearGridState(GRID_STATE_KEY);
    window.location.reload();
  };

  const handleDownloadPdf = async (invoice: ServiceInvoice) => {
    if (invoice.status === ServiceInvoiceStatus.DRAFT) return;
    try {
      const blob = await getServiceInvoicePdf(auth.token, invoice.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      toast.error('Erreur lors du téléchargement du PDF');
    }
  };

  const filteredInvoices = useMemo(() => {
    let filtered = invoices;

    if (selectedStatusLabels.length > 0) {
      const statusValues = selectedStatusLabels.map((l) => statusLabelToValue[l]);
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

  const columns: ColDef<ServiceInvoice>[] = [
    {
      headerName: 'N°',
      field: 'invoiceNumber',
      sortable: true,
      filter: false,
      minWidth: 140,
      maxWidth: 180,
      cellRenderer: (params: any) => (
        <span
          style={{ cursor: 'pointer', color: 'inherit', fontWeight: 500 }}
          onClick={() => navigate(`/factures/${params.data.id}`)}
        >
          {params.value}
        </span>
      ),
    },
    {
      headerName: 'Client',
      sortable: true,
      filter: true,
      valueGetter: (params: any) => {
        const first = params.data?.clientFirstName || '';
        const last = params.data?.clientLastName || '';
        return `${first} ${last}`.trim();
      },
    },
    {
      headerName: 'Téléphone',
      field: 'clientPhone',
      sortable: true,
      filter: true,
      minWidth: 120,
      hide: isTablet,
      valueFormatter: (params: any) => params.value || '-',
    },

    {
      headerName: 'Montant TTC',
      field: 'totalTTC',
      sortable: true,
      filter: false,
      width: 130,
      hide: isTablet,
      valueFormatter: (params: any) =>
        params.value != null ? formatCurrency(params.value) : '-',
      cellStyle: { textAlign: 'right' },
    },
    {
      headerName: 'Paiement',
      field: 'paymentMethod',
      sortable: true,
      filter: true,
      width: 110,
      hide: isMediumScreen,
      valueFormatter: (params: any) =>
        params.value ? getPaymentMethodLabel(params.value) : '-',
    },
    {
      headerName: 'Statut',
      field: 'status',
      sortable: true,
      filter: true,
      width: 110,
      cellRenderer: (params: any) => {
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
      },
    },
    {
      headerName: 'Dolibarr',
      field: 'dolibarrSyncStatus',
      sortable: false,
      filter: false,
      width: 90,
      hide: isSmallScreen,
      cellRenderer: (params: any) => {
        const status = params.value;
        if (status === 'synced') return <span style={{ color: '#4caf50' }}>✓</span>;
        if (status === 'error') return <span style={{ color: '#ff9800' }}>⚠</span>;
        return <span style={{ color: '#9e9e9e' }}>—</span>;
      },
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
      valueFormatter: (params: any) =>
        params.value
          ? new Date(params.value).toLocaleDateString('fr-FR')
          : '-',
      comparator: (valueA: string, valueB: string) =>
        new Date(valueA).getTime() - new Date(valueB).getTime(),
    },
    {
      headerName: 'Actions',
      field: 'id',
      sortable: false,
      filter: false,
      width: 120,
      minWidth: 120,
      cellRenderer: (params: any) => {
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
    },
  ];

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
          <Typography
            variant="h5"
            component="h1"
            sx={{ flexShrink: 0, mr: 2 }}
          >
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
          defaultColDef={{
            resizable: true,
            sortable: true,
          }}
          rowHeight={rowHeight}
          pagination
          paginationPageSize={paginationPageSize}
          paginationPageSizeSelector={pageSizeOptions}
          onPaginationChanged={(e) => {
            if (e.api) {
              const newSize = e.api.paginationGetPageSize();
              if (newSize !== paginationPageSize) {
                setPaginationPageSize(newSize);
              }
            }
          }}
          localeText={AG_GRID_LOCALE_FR}
          onFirstDataRendered={(e) =>
            onFirstDataRendered(e, GRID_STATE_KEY)
          }
          onGridReady={(e) => setupGridStateEvents(e.api, GRID_STATE_KEY)}
          loading={loading}
        />
      </StyledAgGridWrapper>
    </Paper>
  );
};

export default ServiceInvoices;
