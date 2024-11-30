import React, { useCallback, useEffect, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import {
  Box,
  IconButton,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useAuth } from '../hooks/AuthProvider';
import { useTheme } from '@mui/material/styles';
import type { ColDef } from 'ag-grid-community/dist/types/core/entities/colDef';
import { AG_GRID_LOCALE_FR } from '@ag-grid-community/locale';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import VisibilityIcon from '@mui/icons-material/Visibility';
import '../styles/MachineRepairsTable.css';
import { fetchAllConfig, getAllMachineRepairs } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { MachineRepair, MachineRepairFromApi } from '../utils/types';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SearchIcon from '@mui/icons-material/Search';
import { IRowNode } from 'ag-grid-community';

const rowHeight = 40;

const MachineRepairsTable: React.FC = () => {
  const auth = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();
  const gridRef = React.createRef<AgGridReact>();
  const [machineRepairs, setMachineRepairs] = useState<MachineRepair[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerFilterText, setCustomerFilterText] = useState('');
  const [paginationPageSize, setPaginationPageSize] = useState(10);
  const [colorByState, setColorByState] = useState<{ [key: string]: string }>(
    {},
  );

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

  const fetchData = async () => {
    setLoading(true);
    try {
      const data: MachineRepairFromApi[] = await getAllMachineRepairs(
        auth.token,
      );
      const repairsDataWithDate: MachineRepair[] = data.map(
        (repair: MachineRepairFromApi) => ({
          ...repair,
          start_timer: repair.start_timer ? new Date(repair.start_timer) : null,
          client_call_times: repair.client_call_times.map(
            (date) => new Date(date),
          ),
        }),
      );
      setMachineRepairs(repairsDataWithDate);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      alert("Une erreur s'est produite lors de la récupération des données");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllConfigData = async () => {
    try {
      const {
        config: { États: stateColorsStr },
      } = await fetchAllConfig(auth.token);
      setColorByState(JSON.parse(stateColorsStr));
    } catch (error) {
      console.error('Error fetching config:', error);
      alert(
        `Une erreur s'est produite lors de la récupération des données ${error}`,
      );
    }
  };

  useEffect(() => {
    fetchAllConfigData();
    fetchData();
  }, []);

  useEffect(() => {
    calculatePageSize();
  }, [machineRepairs]);

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
      headerName: 'Réparateur',
      field: 'repairer_name' as keyof MachineRepair,
      sortable: true,
      filter: true,
      valueFormatter: (params: any) => params.value || 'Non affecté',
      //  width: 130,
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
      sort: 'desc', // Tri par défaut par cette colonne, en ordre décroissant
      valueFormatter: (params: any) =>
        new Date(params.value).toLocaleString('fr-FR'),
      comparator: (valueA: string, valueB: string) =>
        new Date(valueA).getTime() - new Date(valueB).getTime(),
    },
  ];

  const calculatePageSize = () => {
    const element = document.getElementById('machine-repairs-table');
    const footer = document.querySelector('.ag-paging-panel');
    const header = document.querySelector('.ag-header-viewport');
    if (element && footer && header) {
      const elementHeight = element.clientHeight;
      const footerHeight = footer.clientHeight;
      const headerHeight = header.clientHeight;
      const newPageSize = Math.floor(
        (elementHeight - headerHeight - footerHeight) / rowHeight,
      );
      setPaginationPageSize(newPageSize);
    }
  };

  useEffect(() => {
    window.addEventListener('resize', calculatePageSize);
    return () => {
      window.removeEventListener('resize', calculatePageSize);
    };
  }, []);

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        display={'flex'}
        flexDirection={'row'}
        justifyContent={'space-between'}
        alignItems={'center'}
      >
        <div style={{ padding: 16 }}>
          <Typography variant="h6">Réparations/Entretiens</Typography>
        </div>
        <Box>
          <TextField
            id="search-client"
            label="Rechercher un client"
            variant="outlined"
            sx={{ minWidth: 450, margin: 2 }}
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
      <Box
        id="machine-repairs-table"
        className={`machine-repairs-table ag-theme-quartz${theme.palette.mode === 'dark' ? '-dark' : ''}`}
        sx={{ height: '100%', width: '100%' }}
      >
        <AgGridReact
          rowHeight={rowHeight}
          ref={gridRef}
          rowData={machineRepairs}
          columnDefs={columns}
          pagination={true}
          paginationPageSize={paginationPageSize}
          localeText={AG_GRID_LOCALE_FR}
          autoSizeStrategy={{
            type: 'fitGridWidth',
          }}
          paginationPageSizeSelector={false}
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
        />
      </Box>
    </Paper>
  );
};

export default MachineRepairsTable;
