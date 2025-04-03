import React, { useCallback, useEffect, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import {
  Box,
  Button,
  IconButton,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useAuth } from '../hooks/AuthProvider';
import { useTheme } from '@mui/material/styles';
import type { ColDef } from 'ag-grid-community';
import { AG_GRID_LOCALE_FR } from '@ag-grid-community/locale';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
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
        const { first_name, last_name } = node.data;
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
            normalizeString(first_name || '').includes(word) ||
            normalizeString(last_name || '').includes(word),
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

  const columns: ColDef<MachineRepair>[] = [
    {
      headerName: '',
      field: 'id',
      cellRenderer: (params: { value: number }) => (
        <>
          <Tooltip title="Ouvrir" arrow>
            <IconButton
              color="primary"
              component="a"
              href={`/reparation/${params.value}`}
              rel="noopener noreferrer"
              onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                e.preventDefault();
                navigate(`/reparation/${params.value}`);
              }}
              // sx={{ paddingRight: 0 }}
            >
              <VisibilityIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Ouvrir dans un nouvel onglet" arrow>
            <IconButton
              color="primary"
              component="a"
              href={`/reparation/${params.value}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <OpenInNewIcon />
            </IconButton>
          </Tooltip>
        </>
      ),
      // minWidth: 70,
      width: 120,
      // maxWidth: 110,
      cellStyle: {
        // paddingLeft: 0,
        // paddingRight: 0,
        // display: 'flex',
        // flexDirection: 'row',
        // alignItems: 'center',
      },
    },
    {
      headerName: 'N°',
      field: 'id' as keyof MachineRepair,
      sortable: true,
      filter: true,
      width: 70,
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
      field: 'machine_type_name' as keyof MachineRepair,
      sortable: true,
      filter: true,
    },
    {
      headerName: 'Type de robot',
      field: 'robot_type_name' as keyof MachineRepair,
      sortable: true,
      filter: true,
      valueFormatter: (params: any) => params.value || '-',
    },
    {
      headerName: 'Réparateur',
      field: 'repairer_name' as keyof MachineRepair,
      sortable: true,
      filter: true,
      valueFormatter: (params: any) => params.value || 'Non affecté',
    },
    {
      headerName: 'Prénom',
      field: 'first_name' as keyof MachineRepair,
      sortable: true,
      filter: true,
      //  width: 130,
    },
    {
      headerName: 'Nom',
      field: 'last_name' as keyof MachineRepair,
      sortable: true,
      filter: true,
      //   width: 130,
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
        }}
      >
        <Box>
          <Typography variant="h6">Réparations/Entretiens</Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Tooltip title="Réinitialiser le tableau" arrow>
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
            sx={{ minWidth: 450 }}
            size="small"
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
