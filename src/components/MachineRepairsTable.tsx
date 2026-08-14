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
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import { useAuth } from '../hooks/AuthProvider';
import { useTheme } from '@mui/material/styles';
import type {
  ColDef,
  CellStyle,
  GetRowIdParams,
  GridReadyEvent,
  PaginationChangedEvent,
} from 'ag-grid-community';
import { AG_GRID_LOCALE_FR } from '@ag-grid-community/locale';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import '../styles/MachineRepairsTable.css';
import { getAllMachineRepairs, updateRepair } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import {
  MachineRepairListItem,
  MachineRepairListItemFromApi,
} from '../utils/types';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SearchIcon from '@mui/icons-material/Search';
import { IRowNode } from 'ag-grid-community';
import { useAppSelector } from '../store/hooks';
import { RootState } from '../store/index';
import { notifyError } from '../utils/notifications';
import { toast } from 'react-toastify';
import {
  onFirstDataRendered,
  setupGridStateEvents,
  clearGridState,
  saveGridPageSize,
  loadGridPageSize,
} from '../utils/agGridSettingsHelper';
import { StyledAgGridWrapper } from './styles/AgGridStyles';
import MultiSelectDropdown from './MultiSelectDropdown';

const rowHeight = 40;

// Grid state key for machine repairs
const MACHINE_REPAIRS_GRID_STATE_KEY = 'machineRepairsAgGridState';

// Available page size options
const PAGE_SIZE_OPTIONS = [5, 10, 15, 20, 25, 50, 100];

// Module-level constants and column callbacks: everything that does not close
// over component state lives here so its identity is stable across renders.
// AG Grid rebuilds every cell whose colDef changed, so a new inline function
// on each render means recreating the whole grid body on every keystroke.
const AUTO_SIZE_STRATEGY = { type: 'fitGridWidth' } as const;

const getRowId = (params: GetRowIdParams<MachineRepairListItem>) =>
  String(params.data.id);

const formatState = (params: any) =>
  !params.value ? 'Non commencé' : params.value;

const renderClientCallCell = (params: any) => {
  if (params.value && params.value.length) {
    const lastCall =
      params.value[params.value.length - 1].toLocaleString('FR-fr');
    return (
      <Box display="flex" alignItems="center" gap={1}>
        {lastCall}
        <CheckCircleIcon color={'success'} />
      </Box>
    );
  }
  return (
    <Box display="flex" alignItems="center" justifyContent="center">
      -
    </Box>
  );
};

const getMachineTypeValue = (params: any) => {
  const machineType = params.data.machine_type_name || '';
  const robotType = params.data.robot_type_name;

  if (robotType) {
    return `${robotType} (${machineType})`;
  }
  return machineType || '-';
};

const getClientValue = (params: any) => {
  const firstName = params.data.first_name || '';
  const lastName = params.data.last_name || '';
  return `${firstName} ${lastName}`.trim();
};

const formatDash = (params: any) => params.value || '-';

const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  SENT: 'Envoyée',
  PAID: 'Payée',
};

const INVOICE_STATUS_STYLES: Record<string, CellStyle> = {
  DRAFT: { color: '#2196f3', fontWeight: 600 },
  SENT: { color: '#ff9800', fontWeight: 600 },
  PAID: { color: '#4caf50', fontWeight: 600 },
};

const getInvoiceValue = (params: any) => {
  const inv = params.data?.serviceInvoice;
  if (!inv) return 'Aucune';
  return INVOICE_STATUS_LABELS[inv.status] ?? inv.status;
};

const getInvoiceCellStyle = (params: any) => {
  const inv = params.data?.serviceInvoice;
  if (!inv) return { color: '#9e9e9e' } as CellStyle;
  return (INVOICE_STATUS_STYLES[inv.status] ?? {}) as CellStyle;
};

const formatCreatedAt = (params: any) =>
  new Date(params.value).toLocaleString('fr-FR');

const compareDates = (valueA: string, valueB: string) =>
  new Date(valueA).getTime() - new Date(valueB).getTime();

// Delay before the customer search is applied to the grid. The input itself
// stays fully responsive; only the (expensive) re-filter is deferred.
const SEARCH_DEBOUNCE_MS = 250;

const normalizeString = (str: string) =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const MachineRepairsTable: React.FC = () => {
  const auth = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();
  const gridRef = useRef<AgGridReact>(null);
  const [machineRepairs, setMachineRepairs] = useState<MachineRepairListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerFilterText, setCustomerFilterText] = useState('');
  // Value actually applied to the grid, debounced behind customerFilterText.
  const [appliedCustomerFilter, setAppliedCustomerFilter] = useState('');
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedRepairers, setSelectedRepairers] = useState<string[]>([]);
  const [paginationPageSize, setPaginationPageSize] = useState(() =>
    loadGridPageSize(MACHINE_REPAIRS_GRID_STATE_KEY, 20),
  );

  // Media queries for responsive design
  const isMediumScreen = useMediaQuery('(max-width:1400px)');
  const isSmallScreen = useMediaQuery('(max-width:1200px)');
  const isTablet = useMediaQuery('(max-width:768px)');
  const isMobile = useMediaQuery('(max-width:480px)');

  // Calculate showTextInButton based on screen size
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const showTextInButton = !isXs;

  // Button style based on showTextInButton
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

  // Save page size to localStorage when it changes
  useEffect(() => {
    saveGridPageSize(MACHINE_REPAIRS_GRID_STATE_KEY, paginationPageSize);
  }, [paginationPageSize]);

  // Get colorByState from Redux store
  const { config, repairerNames } = useAppSelector(
    (state: RootState) => state.config,
  );
  const colorByState = React.useMemo(() => {
    try {
      return JSON.parse(config['États'] || '{}');
    } catch {
      return {};
    }
  }, [config]);

  // Extraire les états disponibles depuis colorByState
  const availableStates = useMemo(() => {
    return Object.keys(colorByState);
  }, [colorByState]);

  // Liste des réparateurs avec option "Non affecté"
  const availableRepairers = useMemo(() => {
    return ['Non affecté', ...repairerNames];
  }, [repairerNames]);

  // Handle opening Google Drive folder
  const handleOpenGoogleDrive = useCallback(() => {
    if (config && config['URL drive réparations/entretiens']) {
      window.open(config['URL drive réparations/entretiens'], '_blank');
    } else {
      toast.error('Lien vers Google Drive non configuré');
    }
  }, [config]);

  // Debounce the customer search: typing stays responsive, the grid only
  // re-filters once the user pauses.
  useEffect(() => {
    const timeout = setTimeout(
      () => setAppliedCustomerFilter(customerFilterText),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timeout);
  }, [customerFilterText]);

  // Normalise the query once instead of once per row.
  const customerSearchWords = useMemo(() => {
    const query = appliedCustomerFilter.trim();
    if (!query) return [];
    return normalizeString(query).split(' ').filter(Boolean);
  }, [appliedCustomerFilter]);

  const isExternalFilterPresent = useCallback((): boolean => {
    return (
      customerSearchWords.length > 0 ||
      selectedStates.length > 0 ||
      selectedRepairers.length > 0
    );
  }, [customerSearchWords, selectedStates, selectedRepairers]);

  const doesExternalFilterPass = useCallback(
    (node: IRowNode<MachineRepairListItem>): boolean => {
      if (node.data) {
        const { first_name, last_name, phone, state, repairer_name } =
          node.data;

        // Filtre par état
        if (selectedStates.length > 0) {
          const currentState = state || 'Non commencé';
          if (!selectedStates.includes(currentState)) {
            return false;
          }
        }

        // Filtre par réparateur
        if (selectedRepairers.length > 0) {
          const currentRepairer = repairer_name || 'Non affecté';
          if (!selectedRepairers.includes(currentRepairer)) {
            return false;
          }
        }

        // Filtre par client/téléphone
        if (customerSearchWords.length > 0) {
          const fullName = normalizeString(
            `${first_name || ''} ${last_name || ''}`.trim(),
          );
          const normalizedPhone = phone ? normalizeString(phone) : '';

          // Check if any of the search words match either the full name or the phone number
          return customerSearchWords.every(
            (word) =>
              fullName.includes(word) || normalizedPhone.includes(word),
          );
        }
      }
      return true;
    },
    [customerSearchWords, selectedStates, selectedRepairers],
  );

  // AG Grid does not re-run the external filter when the predicate changes;
  // it has to be told explicitly. This used to happen by accident, because a
  // new columnDefs array forced a full grid rebuild on every render.
  useEffect(() => {
    gridRef.current?.api?.onFilterChanged();
  }, [customerSearchWords, selectedStates, selectedRepairers]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data: MachineRepairListItemFromApi[] = await getAllMachineRepairs(
          auth.token,
        );
        const repairsDataWithDate: MachineRepairListItem[] = data.map(
          (repair: MachineRepairListItemFromApi) => ({
            ...repair,
            start_timer: repair.start_timer
              ? new Date(repair.start_timer)
              : null,
            client_call_times: repair.client_call_times.map(
              (date) => new Date(date),
            ),
          }),
        );
        setMachineRepairs(repairsDataWithDate);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        notifyError(
          "Une erreur s'est produite lors de la récupération des données",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle first data rendered - load saved column state
  const handleFirstDataRendered = useCallback((params: any) => {
    onFirstDataRendered(params, MACHINE_REPAIRS_GRID_STATE_KEY);
  }, []);

  const handleGridReady = useCallback((params: GridReadyEvent) => {
    // Setup event listeners to save grid state on changes
    setupGridStateEvents(params.api, MACHINE_REPAIRS_GRID_STATE_KEY);
    // Size columns to fit the grid width
    params.api.sizeColumnsToFit();
  }, []);

  const handlePaginationChanged = useCallback(
    (event: PaginationChangedEvent) => {
      const newPageSize = event.api.paginationGetPageSize();
      setPaginationPageSize((current) =>
        newPageSize !== current ? newPageSize : current,
      );
    },
    [],
  );

  // Handle reset grid state
  const handleResetGrid = useCallback(() => {
    if (
      window.confirm(
        'Réinitialiser tous les paramètres du tableau (colonnes, filtres) ?',
      )
    ) {
      // Clear the saved state
      clearGridState(MACHINE_REPAIRS_GRID_STATE_KEY);
      // Reload the page to apply the reset
      window.location.reload();
    }
  }, []);

  // Add resize handler to fit columns on window size change.
  // Must run once: gridRef is a stable useRef, so no dependency is needed.
  // Depending on the ref object here would re-run sizeColumnsToFit on every
  // render, which reflows the whole grid and discards saved column widths.
  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout;

    const handleResize = () => {
      // Debounce resize event
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        gridRef.current?.api?.sizeColumnsToFit();
      }, 250);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const renderIdCell = useCallback(
    (params: { value: number }) => (
      <Button
        component="a"
        href={`/reparation/${params.value}`}
        rel="noopener noreferrer"
        startIcon={<VisibilityIcon />}
        onClick={(e: React.MouseEvent) => {
          e.preventDefault();
          navigate(`/reparation/${params.value}`);
        }}
      >
        {params.value}
      </Button>
    ),
    [navigate],
  );

  const getStateCellStyle = useCallback(
    (params: any) =>
      ({
        backgroundColor: colorByState[params.value || 'Non commencé'],
        color: 'black',
      }) as CellStyle,
    [colorByState],
  );

  const renderRepairerCell = useCallback(
    (params: any) => {
      const handleRepairerChange = async (
        event: SelectChangeEvent<string>,
      ) => {
        const newValue =
          event.target.value === 'Non affecté' ? null : event.target.value;
        const oldValue = params.value ?? null;

        // Only proceed if the value actually changed
        if (newValue === oldValue) {
          return;
        }

        // Optimistic update
        params.node.setDataValue('repairer_name', newValue);

        try {
          await updateRepair(auth.token, params.data.id.toString(), {
            repairer_name: newValue,
          });
          toast.success('Réparateur mis à jour avec succès');
        } catch (error) {
          console.error('Error updating repairer:', error);
          toast.error('Erreur lors de la mise à jour du réparateur');
          // Revert the change in the grid
          params.node.setDataValue('repairer_name', oldValue);
        }
      };

      return (
        <Select
          value={params.value || 'Non affecté'}
          onChange={handleRepairerChange}
          size="small"
          // variant="standard"
          sx={{
            width: '100%',
            fontSize: 'inherit',
            fontFamily: 'inherit',
            '& .MuiSelect-select': {
              py: 0.5,
            },
          }}
        >
          <MenuItem value="Non affecté">Non affecté</MenuItem>
          {repairerNames.map((name) => (
            <MenuItem key={name} value={name}>
              {name}
            </MenuItem>
          ))}
        </Select>
      );
    },
    [auth.token, repairerNames],
  );

  const renderInvoiceCell = useCallback(
    (params: any) => {
      const inv = params.data?.serviceInvoice;
      if (!inv) return <span style={{ color: '#9e9e9e' }}>—</span>;
      return (
        <Button
          size="small"
          sx={{ textTransform: 'none', minWidth: 0, p: 0 }}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            navigate(`/factures/${inv.id}`);
          }}
        >
          {params.value}
        </Button>
      );
    },
    [navigate],
  );

  const columns: ColDef<MachineRepairListItem>[] = useMemo(
    () => [
      {
        headerName: 'N°',
        field: 'id' as keyof MachineRepairListItem,
        sortable: true,
        filter: false,
        minWidth: 75,
        maxWidth: 75,
        cellStyle: {
          paddingLeft: '4px',
          paddingRight: '4px',
        },
        // hide: isMobile,
        cellRenderer: renderIdCell,
      },
      {
        headerName: 'État',
        field: 'state' as keyof MachineRepairListItem,
        sortable: true,
        filter: true,
        valueFormatter: formatState,
        cellStyle: getStateCellStyle,
      },
      {
        headerName: 'Appel client',
        field: 'client_call_times' as keyof MachineRepairListItem,
        sortable: false,
        filter: true,
        hide: isTablet,
        cellRenderer: renderClientCallCell,
      },
      {
        headerName: 'Type',
        field: 'repair_or_maintenance' as keyof MachineRepairListItem,
        sortable: true,
        filter: true,
        width: 120,
        hide: isTablet,
      },
      {
        headerName: 'Type de machine',
        sortable: true,
        filter: true,
        hide: isSmallScreen,
        valueGetter: getMachineTypeValue,
      },
      {
        headerName: 'Réparateur',
        field: 'repairer_name' as keyof MachineRepairListItem,
        sortable: true,
        filter: true,
        hide: isTablet,
        cellClass: 'full-width-cell',
        cellRenderer: renderRepairerCell,
      },
      {
        headerName: 'Client',
        sortable: true,
        filter: true,
        valueGetter: getClientValue,
      },
      {
        headerName: 'Téléphone',
        field: 'phone',
        sortable: true,
        filter: true,
        minWidth: 120,
        valueFormatter: formatDash,
      },
      {
        headerName: 'Facture',
        field: 'serviceInvoice' as any,
        sortable: true,
        filter: false,
        minWidth: 100,
        maxWidth: 130,
        hide: isTablet,
        valueGetter: getInvoiceValue,
        cellStyle: getInvoiceCellStyle,
        cellRenderer: renderInvoiceCell,
      },
      {
        headerName: 'Date de création',
        field: 'createdAt' as keyof MachineRepairListItem,
        sortable: true,
        unSortIcon: true,
        filter: 'agDateColumnFilter',
        initialSort: 'desc',
        valueFormatter: formatCreatedAt,
        comparator: compareDates,
        hide: isMobile,
      },
    ],
    [
      isTablet,
      isSmallScreen,
      isMobile,
      renderIdCell,
      getStateCellStyle,
      renderRepairerCell,
      renderInvoiceCell,
    ],
  );

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {isMobile || isTablet ? (
        // Layout mobile/tablet: 3 lignes
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
          {/* Ligne 1: Titre + boutons */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Typography variant="h5" component="h1" sx={{ flexShrink: 0 }}>
              Réparations/Entretiens
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
          </Box>

          {/* Ligne 2: Selects */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <MultiSelectDropdown
                label="États"
                options={availableStates}
                selectedValues={selectedStates}
                onChange={setSelectedStates}
                placeholder="Tous les états"
                minWidth={0}
                maxWidth="100%"
                colorByOption={colorByState}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <MultiSelectDropdown
                label="Réparateurs"
                options={availableRepairers}
                selectedValues={selectedRepairers}
                onChange={setSelectedRepairers}
                placeholder="Tous les réparateurs"
                minWidth={0}
                maxWidth="100%"
              />
            </Box>
          </Box>

          {/* Ligne 3: Recherche */}
          <Box>
            <TextField
              id="search-client"
              label="Rechercher un client"
              variant="outlined"
              size="small"
              fullWidth
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
          </Box>
        </Box>
      ) : isSmallScreen ? (
        // Layout small screen: 2 lignes
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
          {/* Ligne 1: Titre + boutons */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Typography variant="h5" component="h1" sx={{ flexShrink: 0 }}>
              Réparations/Entretiens
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
          </Box>

          {/* Ligne 2: Selects + Recherche */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <MultiSelectDropdown
              label="États"
              options={availableStates}
              selectedValues={selectedStates}
              onChange={setSelectedStates}
              placeholder="Tous les états"
              minWidth={150}
              maxWidth={200}
              colorByOption={colorByState}
            />
            <MultiSelectDropdown
              label="Réparateurs"
              options={availableRepairers}
              selectedValues={selectedRepairers}
              onChange={setSelectedRepairers}
              placeholder="Tous les réparateurs"
              minWidth={150}
              maxWidth={200}
            />
            <TextField
              id="search-client"
              label="Rechercher un client"
              variant="outlined"
              size="small"
              sx={{ flex: 1, minWidth: 200 }}
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
          </Box>
        </Box>
      ) : (
        // Layout desktop/medium: tout sur une seule ligne
        <Box
          sx={{
            pt: 1.5,
            pb: 1,
            pl: 2,
            pr: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <Typography
            variant="h5"
            component="h1"
            sx={{ flexShrink: 0, alignSelf: 'center' }}
          >
            Réparations/Entretiens
          </Typography>

          <Box
            sx={{
              display: 'flex',
              gap: 1,
              flex: 1,
              justifyContent: 'flex-end',
              flexWrap: 'wrap',
            }}
          >
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

            <MultiSelectDropdown
              label="États"
              options={availableStates}
              selectedValues={selectedStates}
              onChange={setSelectedStates}
              placeholder="Tous les états"
              minWidth={150}
              maxWidth={250}
              colorByOption={colorByState}
            />

            <MultiSelectDropdown
              label="Réparateurs"
              options={availableRepairers}
              selectedValues={selectedRepairers}
              onChange={setSelectedRepairers}
              placeholder="Tous les réparateurs"
              minWidth={150}
              maxWidth={250}
            />

            <TextField
              id="search-client"
              label="Rechercher un client"
              variant="outlined"
              size="small"
              sx={{ minWidth: 200, maxWidth: 300 }}
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
          </Box>
        </Box>
      )}
      <StyledAgGridWrapper
        id="machine-repairs-table"
        className={`machine-repairs-table ag-theme-quartz${
          theme.palette.mode === 'dark' ? '-dark' : ''
        }`}
      >
        <AgGridReact
          // enableCellTextSelection
          suppressCellFocus
          rowHeight={rowHeight}
          ref={gridRef}
          rowData={machineRepairs}
          columnDefs={columns}
          loading={loading}
          pagination={true}
          paginationPageSize={paginationPageSize}
          paginationPageSizeSelector={PAGE_SIZE_OPTIONS}
          localeText={AG_GRID_LOCALE_FR}
          autoSizeStrategy={AUTO_SIZE_STRATEGY}
          getRowId={getRowId}
          onGridReady={handleGridReady}
          onFirstDataRendered={handleFirstDataRendered}
          onPaginationChanged={handlePaginationChanged}
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
        />
      </StyledAgGridWrapper>
    </Paper>
  );
};

export default MachineRepairsTable;
