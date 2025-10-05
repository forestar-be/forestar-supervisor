import React, { useCallback, useEffect, useState } from 'react';
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
} from '@mui/material';
import { useAuth } from '../hooks/AuthProvider';
import { useTheme } from '@mui/material/styles';
import type { ColDef } from 'ag-grid-community';
import { AG_GRID_LOCALE_FR } from '@ag-grid-community/locale';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import '../styles/MachineRepairsTable.css';
import { getAllMachineRepairs } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { MachineRepair, MachineRepairFromApi } from '../utils/types';
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

const rowHeight = 40;

// Grid state key for machine repairs
const MACHINE_REPAIRS_GRID_STATE_KEY = 'machineRepairsAgGridState';

const MachineRepairsTable: React.FC = () => {
  const auth = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();
  const gridRef = React.createRef<AgGridReact>();
  const [machineRepairs, setMachineRepairs] = useState<MachineRepair[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerFilterText, setCustomerFilterText] = useState('');
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

  // Available page size options
  const pageSizeOptions = [5, 10, 15, 20, 25, 50, 100];

  // Save page size to localStorage when it changes
  useEffect(() => {
    saveGridPageSize(MACHINE_REPAIRS_GRID_STATE_KEY, paginationPageSize);
  }, [paginationPageSize]);

  // Get colorByState from Redux store
  const { config } = useAppSelector((state: RootState) => state.config);
  const colorByState = React.useMemo(() => {
    try {
      return JSON.parse(config['États'] || '{}');
    } catch {
      return {};
    }
  }, [config]);

  // Handle opening Google Drive folder
  const handleOpenGoogleDrive = useCallback(() => {
    if (config && config['URL drive réparations/entretiens']) {
      window.open(config['URL drive réparations/entretiens'], '_blank');
    } else {
      toast.error('Lien vers Google Drive non configuré');
    }
  }, [config]);

  const isExternalFilterPresent = useCallback((): boolean => {
    return Boolean(customerFilterText);
  }, [customerFilterText]);

  const doesExternalFilterPass = useCallback(
    (node: IRowNode<MachineRepair>): boolean => {
      if (node.data) {
        const { first_name, last_name, phone } = node.data;
        const fullName = `${first_name || ''} ${last_name || ''}`.trim();
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

        // Check if any of the search words match either the full name or the phone number
        return customerSearchWords.every(
          (word) =>
            normalizeString(fullName).includes(word) ||
            (phone && normalizeString(phone).includes(word)),
        );
      }
      return true;
    },
    [customerFilterText],
  );

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data: MachineRepairFromApi[] = await getAllMachineRepairs(
          auth.token,
        );
        const repairsDataWithDate: MachineRepair[] = data.map(
          (repair: MachineRepairFromApi) => ({
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

  const columns: ColDef<MachineRepair>[] = [
    {
      headerName: 'N°',
      field: 'id' as keyof MachineRepair,
      sortable: true,
      filter: false,
      minWidth: 75,
      maxWidth: 75,
      cellStyle: {
        paddingLeft: '4px',
        paddingRight: '4px',
      },
      // hide: isMobile,
      cellRenderer: (params: { value: number }) => (
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
    },
    {
      headerName: 'État',
      field: 'state' as keyof MachineRepair,
      sortable: true,
      filter: true,
      valueFormatter: (params: any) =>
        !params.value ? 'Non commencé' : params.value,
      cellStyle: (params: any) => ({
        backgroundColor: colorByState[params.value || 'Non commencé'],
        color: 'black',
      }),
    },
    {
      headerName: 'Appel client',
      field: 'client_call_times' as keyof MachineRepair,
      sortable: false,
      filter: true,
      hide: isTablet,
      cellRenderer: (params: any) => {
        if (params.value && params.value.length) {
          const lastCall =
            params.value[params.value.length - 1].toLocaleString('FR-fr');
          return (
            <Box display="flex" alignItems="center" gap={1}>
              {lastCall}
              <CheckCircleIcon color={'success'} />
            </Box>
          );
        } else {
          return (
            <Box display="flex" alignItems="center" justifyContent="center">
              -
            </Box>
          );
        }
      },
    },
    {
      headerName: 'Type',
      field: 'repair_or_maintenance' as keyof MachineRepair,
      sortable: true,
      filter: true,
      width: 120,
    },
    {
      headerName: 'Type de machine',
      sortable: true,
      filter: true,
      hide: isSmallScreen,
      valueGetter: (params: any) => {
        const machineType = params.data.machine_type_name || '';
        const robotType = params.data.robot_type_name;

        if (robotType) {
          return `${robotType} (${machineType})`;
        }
        return machineType || '-';
      },
    },
    {
      headerName: 'Réparateur',
      field: 'repairer_name' as keyof MachineRepair,
      sortable: true,
      filter: true,
      valueFormatter: (params: any) => params.value || 'Non affecté',
      hide: isTablet,
    },
    {
      headerName: 'Client',
      sortable: true,
      filter: true,
      valueGetter: (params: any) => {
        const firstName = params.data.first_name || '';
        const lastName = params.data.last_name || '';
        return `${firstName} ${lastName}`.trim();
      },
    },
    {
      headerName: 'Téléphone',
      field: 'phone',
      sortable: true,
      filter: true,
      minWidth: 120,
      valueFormatter: (params: any) => params.value || '-',
    },
    {
      headerName: 'Date de création',
      field: 'createdAt' as keyof MachineRepair,
      sortable: true,
      unSortIcon: true,
      filter: 'agDateColumnFilter',
      initialSort: 'desc',
      valueFormatter: (params: any) =>
        new Date(params.value).toLocaleString('fr-FR'),
      comparator: (valueA: string, valueB: string) =>
        new Date(valueA).getTime() - new Date(valueB).getTime(),
      hide: isMobile,
    },
  ];

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
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Typography variant="h5" component="h1" sx={{ mb: { xs: 1, md: 0 } }}>
          Réparations/Entretiens
        </Typography>
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            flexWrap: 'wrap',
            width: { xs: '100%', md: 'auto' },
          }}
        >
          <Tooltip title="Réinitialiser le tableau" arrow>
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
          <TextField
            id="search-client"
            label="Rechercher un client ou téléphone"
            variant="outlined"
            size="small"
            sx={{
              flex: { xs: 1, md: 'none' },
              minWidth: { xs: 100, sm: 200, md: 450 },
            }}
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
      <StyledAgGridWrapper
        id="machine-repairs-table"
        className={`machine-repairs-table ag-theme-quartz${
          theme.palette.mode === 'dark' ? '-dark' : ''
        }`}
      >
        <AgGridReact
          rowHeight={rowHeight}
          ref={gridRef}
          rowData={machineRepairs}
          columnDefs={columns}
          pagination={true}
          paginationPageSize={paginationPageSize}
          paginationPageSizeSelector={pageSizeOptions}
          localeText={AG_GRID_LOCALE_FR}
          autoSizeStrategy={{
            type: 'fitGridWidth',
          }}
          onGridReady={(params) => {
            // Setup event listeners to save grid state on changes
            setupGridStateEvents(params.api, MACHINE_REPAIRS_GRID_STATE_KEY);
            // Size columns to fit the grid width
            params.api.sizeColumnsToFit();
          }}
          onFirstDataRendered={handleFirstDataRendered}
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

export default MachineRepairsTable;
