import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
  useTheme,
  Tooltip,
  Chip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import { useAuth } from '../hooks/AuthProvider';
import { toast } from 'react-toastify';
import {
  createRobotInventory,
  updateRobotInventory,
  deleteRobotInventory,
  fetchRobotInventory,
  fetchInventorySummary,
  updateInventoryPlans,
} from '../utils/api';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import {
  ColDef,
  GridReadyEvent,
  ValueFormatterParams,
} from 'ag-grid-community';
import { AG_GRID_LOCALE_FR } from '@ag-grid-community/locale';
import { StyledAgGridWrapper } from '../components/styles/AgGridStyles';
import { saveGridState, loadGridState } from '../utils/agGridSettingsHelper';
import { useSelector } from 'react-redux';
import { RootState } from '../store/index';
import {
  RobotInventory as RobotInventoryType,
  InventoryPlan,
} from '../utils/types';

// Helper function to get month name from month number (1-12)
const getMonthName = (month: number): string => {
  const date = new Date();
  date.setMonth(month - 1);
  return date.toLocaleString('fr-FR', { month: 'long' });
};

// Helper function to get current year and month
const getCurrentYearMonth = () => {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1, // JavaScript months are 0-indexed
  };
};

const RobotInventory: React.FC = () => {
  const { token } = useAuth();
  const theme = useTheme();
  const config = useSelector((state: RootState) => state.config.config);
  const [robots, setRobots] = useState<RobotInventoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentRobot, setCurrentRobot] = useState<Partial<RobotInventoryType>>(
    {},
  );
  const [periods, setPeriods] = useState<{ year: number; month: number }[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(
    getCurrentYearMonth().year,
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    getCurrentYearMonth().month,
  );
  const [inventoryEdits, setInventoryEdits] = useState<{
    [key: string]: number;
  }>({});
  const [paginationPageSize, setPaginationPageSize] = useState(10);
  const [hideZeroQuantity, setHideZeroQuantity] = useState(true);
  const gridRef = React.createRef<AgGridReact>();

  // Get categories from config
  const categories = useMemo(() => {
    const categoriesFromConfig = config['Catégories robot'] || '';
    const parsedCategories = categoriesFromConfig
      .split(',')
      .map((cat) => cat.trim())
      .filter((cat) => cat.length > 0);

    // Add 'Autre' if not already in the list
    if (!parsedCategories.includes('Autre')) {
      parsedCategories.push('Autre');
    }

    return parsedCategories.length > 0 ? parsedCategories : ['Autre'];
  }, [config]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const summaryResponse = await fetchInventorySummary(token);
        setRobots(summaryResponse.robots || []);
        setPeriods(summaryResponse.periods || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  // Calculate page size
  const calculatePageSize = useCallback(() => {
    const element = document.getElementById('robot-inventory-table');
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

  // Get available years from periods
  const years = useMemo(() => {
    const uniqueYears = Array.from(new Set(periods.map((p) => p.year)));
    const currentYear = getCurrentYearMonth().year;

    // Add current year if not in list
    if (!uniqueYears.includes(currentYear)) {
      uniqueYears.push(currentYear);
    }

    // Add previous year if not in list
    if (!uniqueYears.includes(currentYear - 1)) {
      uniqueYears.push(currentYear - 1);
    }

    // Add next year if not in list
    if (!uniqueYears.includes(currentYear + 1)) {
      uniqueYears.push(currentYear + 1);
    }

    return uniqueYears.sort((a, b) => a - b);
  }, [periods]);

  // Get available months - always return all 12 months
  const months = useMemo(() => {
    // Return all 12 months for any selected year
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  }, []);

  // Find inventory plan for a robot in the selected year/month
  const getInventoryPlan = useCallback(
    (robot: RobotInventoryType): InventoryPlan | undefined => {
      return robot.inventoryPlans?.find(
        (plan) => plan.year === selectedYear && plan.month === selectedMonth,
      );
    },
    [selectedYear, selectedMonth],
  );

  // Get quantity for a robot in the selected year/month
  const getQuantity = useCallback(
    (robot: RobotInventoryType): number => {
      const plan = getInventoryPlan(robot);
      const editKey = `${robot.id}-${selectedYear}-${selectedMonth}`;

      if (editKey in inventoryEdits) {
        return inventoryEdits[editKey];
      }

      return plan?.quantity || 0;
    },
    [getInventoryPlan, inventoryEdits, selectedMonth, selectedYear],
  );

  // Filter robots based on hideZeroQuantity setting
  const filteredRobots = useMemo(() => {
    if (!hideZeroQuantity) return robots;
    return robots.filter((robot) => getQuantity(robot) > 0);
  }, [robots, hideZeroQuantity, getQuantity]);

  // Handle dialog open for adding new robot
  const handleAddRobot = () => {
    setCurrentRobot({});
    setOpenDialog(true);
  };

  // Handle dialog open for editing robot
  const handleEditRobot = useCallback((robot: RobotInventoryType) => {
    setCurrentRobot({ ...robot });
    setOpenDialog(true);
  }, []);

  // Handle dialog close
  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
    setCurrentRobot({});
  }, []);

  // Handle save robot
  const handleSaveRobot = async () => {
    if (!token || !currentRobot.name) {
      toast.error('Nom du robot requis');
      return;
    }

    try {
      let updatedRobot: RobotInventoryType;
      if (currentRobot.id) {
        // Update existing robot
        updatedRobot = await updateRobotInventory(
          token,
          currentRobot.id,
          currentRobot,
        );
        setRobots((prev) =>
          prev.map((r) => (r.id === updatedRobot.id ? updatedRobot : r)),
        );
        toast.success('Robot mis à jour avec succès');
      } else {
        // Create new robot
        updatedRobot = await createRobotInventory(token, currentRobot);
        setRobots((prev) => [...prev, updatedRobot]);
        toast.success('Robot ajouté avec succès');
      }
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving robot:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  // Handle delete robot
  const handleDeleteRobot = useCallback(
    async (robot: RobotInventoryType) => {
      if (
        !token ||
        !window.confirm('Êtes-vous sûr de vouloir supprimer ce robot?')
      ) {
        return;
      }

      try {
        await deleteRobotInventory(token, robot.id);
        setRobots((prev) => prev.filter((r) => r.id !== robot.id));
        toast.success('Robot supprimé avec succès');
      } catch (error) {
        console.error('Error deleting robot:', error);
        toast.error('Erreur lors de la suppression');
      }
    },
    [token],
  );

  // Handle quantity change for a robot
  const handleQuantityChange = useCallback(
    (id: number, quantity: number) => {
      const editKey = `${id}-${selectedYear}-${selectedMonth}`;
      setInventoryEdits((prev) => ({
        ...prev,
        [editKey]: quantity,
      }));
    },
    [selectedMonth, selectedYear],
  );

  // Increment robot quantity
  const handleIncrementQuantity = useCallback(
    (robot: RobotInventoryType) => {
      setInventoryEdits((prev) => {
        const key = `${robot.id}-${selectedYear}-${selectedMonth}`;
        const currentQuantity =
          key in prev ? prev[key] : getInventoryPlan(robot)?.quantity || 0;
        return { ...prev, [key]: currentQuantity + 1 };
      });
    },
    [selectedYear, selectedMonth, getInventoryPlan],
  );

  // Decrement robot quantity
  const handleDecrementQuantity = useCallback(
    (robot: RobotInventoryType) => {
      setInventoryEdits((prev) => {
        const key = `${robot.id}-${selectedYear}-${selectedMonth}`;
        const currentQuantity =
          key in prev ? prev[key] : getInventoryPlan(robot)?.quantity || 0;
        if (currentQuantity > 0) {
          return { ...prev, [key]: currentQuantity - 1 };
        }
        return prev;
      });
    },
    [selectedYear, selectedMonth, getInventoryPlan],
  );

  // Save all inventory changes
  const handleSaveInventory = async () => {
    if (!token || Object.keys(inventoryEdits).length === 0) {
      return;
    }

    try {
      // Convert inventoryEdits to array of inventory plans
      const plans = Object.keys(inventoryEdits).map((key) => {
        const [robotId, year, month] = key.split('-').map(Number);
        return {
          robotInventoryId: robotId,
          year,
          month,
          quantity: inventoryEdits[key],
        };
      });

      await updateInventoryPlans(token, plans);

      // Refresh data
      const response = await fetchRobotInventory(token);
      setRobots(response.data || []);

      // Clear edits
      setInventoryEdits({});

      toast.success('Inventaire mis à jour avec succès');
    } catch (error) {
      console.error('Error saving inventory:', error);
      toast.error("Erreur lors de la sauvegarde de l'inventaire");
    }
  };

  // Cancel inventory changes
  const handleCancelInventory = () => {
    setInventoryEdits({});
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = Object.keys(inventoryEdits).length > 0;

  // Format for price cells
  const formatPrice = useCallback((params: ValueFormatterParams) => {
    if (params.value === null || params.value === undefined) return '-';
    return `${Number(params.value).toLocaleString('fr-FR')} €`;
  }, []);

  // Format for quantity cells
  const quantityCellRenderer = useCallback(
    (params: any) => {
      if (!params.data) return null;

      const robotId = params.data.id;
      const quantity = getQuantity(params.data);

      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'start',
            height: '100%',
          }}
        >
          <TextField
            type="number"
            size="small"
            value={quantity}
            onChange={(e) =>
              handleQuantityChange(robotId, Number(e.target.value))
            }
            InputProps={{
              inputProps: { min: 0 },
              sx: { height: '32px' },
            }}
            sx={{
              width: '80px',
              '& .MuiOutlinedInput-root': {
                height: '32px',
                padding: '0 8px',
              },
              '& .MuiInputLabel-root': {
                display: 'none',
              },
            }}
          />
        </Box>
      );
    },
    [getQuantity, handleQuantityChange],
  );

  // Action cell renderer with edit and delete buttons
  const actionCellRenderer = useCallback(
    (params: any) => {
      if (!params.data) return null;
      const robot = params.data as RobotInventoryType;

      return (
        <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
          <Tooltip title="Diminuer quantité" arrow>
            <IconButton
              color="error"
              onClick={() => handleDecrementQuantity(robot)}
              size="small"
            >
              <RemoveCircleIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Augmenter quantité" arrow>
            <IconButton
              color="success"
              onClick={() => handleIncrementQuantity(robot)}
              size="small"
            >
              <AddCircleIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Modifier" arrow>
            <IconButton
              color="primary"
              onClick={() => handleEditRobot(params.data)}
              size="small"
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Supprimer" arrow>
            <IconButton
              color="error"
              onClick={() => handleDeleteRobot(params.data)}
              size="small"
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      );
    },
    [
      handleIncrementQuantity,
      handleDecrementQuantity,
      handleEditRobot,
      handleDeleteRobot,
    ],
  );

  // Category cell renderer
  const categoryCellRenderer = useCallback(
    (params: any) => {
      if (!params.value) return '-';

      // Create color map dynamically from available categories
      const colorOptions = [
        'primary',
        'secondary',
        'success',
        'info',
        'warning',
      ];
      const colorMap: { [key: string]: any } = {};

      categories.forEach((category, index) => {
        // Assign colors from the available options, cycling if needed
        colorMap[category] = colorOptions[index % colorOptions.length];
      });

      // Always set 'Autre' to default
      colorMap['Autre'] = 'default';

      return (
        <Chip
          label={params.value}
          color={colorMap[params.value] || 'default'}
          size="small"
        />
      );
    },
    [categories],
  );

  // Column definitions
  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        headerName: 'Référence',
        field: 'reference',
        sortable: true,
        filter: true,
        flex: 1,
        valueFormatter: (params) => params.value || '-',
      },
      {
        headerName: 'Nom',
        field: 'name',
        sortable: true,
        filter: true,
        flex: 2,
      },
      {
        headerName: 'Catégorie',
        field: 'category',
        sortable: true,
        filter: true,
        flex: 1,
        cellRenderer: categoryCellRenderer,
      },
      {
        headerName: 'Prix de vente (PV)',
        field: 'sellingPrice',
        sortable: true,
        filter: 'agNumberColumnFilter',
        flex: 1,
        valueFormatter: formatPrice,
      },
      {
        headerName: "Prix d'achat (PA)",
        field: 'purchasePrice',
        sortable: true,
        filter: 'agNumberColumnFilter',
        flex: 1,
        valueFormatter: formatPrice,
      },
      {
        headerName: `Quantité (${getMonthName(selectedMonth)} ${selectedYear})`,
        field: 'quantity',
        sortable: false,
        filter: false,
        flex: 1,
        cellRenderer: quantityCellRenderer,
      },
      {
        headerName: 'Actions',
        field: 'actions',
        sortable: false,
        filter: false,
        flex: 1,
        cellRenderer: actionCellRenderer,
      },
    ],
    [
      formatPrice,
      quantityCellRenderer,
      actionCellRenderer,
      categoryCellRenderer,
      selectedMonth,
      selectedYear,
    ],
  );

  const onGridReady = useCallback(
    (params: GridReadyEvent<RobotInventoryType>) => {
      if (loading) {
        params.api.showLoadingOverlay();
      } else {
        params.api.hideOverlay();
      }
      calculatePageSize();

      const gridApi = params.api;
      // Load saved grid state on grid ready
      loadGridState(gridApi, 'robotInventoryAgGridState');

      // Attach event listeners to save grid state on changes
      gridApi.addEventListener('columnMoved', () =>
        saveGridState(gridApi, 'robotInventoryAgGridState'),
      );
      gridApi.addEventListener('columnResized', () =>
        saveGridState(gridApi, 'robotInventoryAgGridState'),
      );
      gridApi.addEventListener('sortChanged', () =>
        saveGridState(gridApi, 'robotInventoryAgGridState'),
      );
      gridApi.addEventListener('filterChanged', () =>
        saveGridState(gridApi, 'robotInventoryAgGridState'),
      );
    },
    [loading, calculatePageSize],
  );

  // Update the grid when year or month changes
  useEffect(() => {
    if (gridRef.current && gridRef.current.api) {
      gridRef.current.api.refreshHeader();
    }
  }, [selectedYear, selectedMonth]);

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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h5" component="h1" sx={{ mr: 4 }}>
            Inventaire des robots
          </Typography>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel id="year-select-label">Année</InputLabel>
            <Select
              labelId="year-select-label"
              value={selectedYear}
              label="Année"
              size="small"
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {years.map((year) => (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel id="month-select-label">Mois</InputLabel>
            <Select
              labelId="month-select-label"
              value={selectedMonth}
              label="Mois"
              size="small"
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              {months.map((month) => (
                <MenuItem key={month} value={month}>
                  {getMonthName(month)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Switch
                checked={hideZeroQuantity}
                onChange={(e) => setHideZeroQuantity(e.target.checked)}
                color="primary"
              />
            }
            label="Masquer robots sans stock"
          />
          {hasUnsavedChanges && (
            <>
              <Tooltip title="Enregistrer les modifications" arrow>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSaveInventory}
                >
                  Enregistrer
                </Button>
              </Tooltip>
              <Tooltip title="Annuler les modifications" arrow>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={handleCancelInventory}
                >
                  Annuler
                </Button>
              </Tooltip>
            </>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Tooltip title="Ajouter un robot" arrow>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAddRobot}
            >
              Ajouter un robot
            </Button>
          </Tooltip>
        </Box>
      </Box>
      <StyledAgGridWrapper
        id="robot-inventory-table"
        className={`robot-inventory-table ag-theme-quartz${
          theme.palette.mode === 'dark' ? '-dark' : ''
        }`}
      >
        <AgGridReact
          suppressCellFocus={true}
          ref={gridRef}
          rowData={filteredRobots}
          columnDefs={columnDefs}
          pagination={true}
          paginationPageSize={paginationPageSize}
          localeText={AG_GRID_LOCALE_FR}
          autoSizeStrategy={{ type: 'fitGridWidth' }}
          onGridReady={onGridReady}
          overlayLoadingTemplate='<span class="ag-overlay-loading-center">Chargement...</span>'
          paginationPageSizeSelector={false}
          loadingOverlayComponentParams={{ loading }}
          overlayNoRowsTemplate='<span class="ag-overlay-no-rows-center">Aucun robot trouvé</span>'
        />
      </StyledAgGridWrapper>
      {/* Robot Edit Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {currentRobot.id ? 'Modifier le robot' : 'Ajouter un robot'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              fullWidth
              label="Référence"
              value={currentRobot.reference || ''}
              onChange={(e) =>
                setCurrentRobot((prev) => ({
                  ...prev,
                  reference: e.target.value,
                }))
              }
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Nom"
              value={currentRobot.name || ''}
              onChange={(e) =>
                setCurrentRobot((prev) => ({ ...prev, name: e.target.value }))
              }
            />
            <FormControl fullWidth margin="normal">
              <InputLabel id="category-select-label">Catégorie</InputLabel>
              <Select
                labelId="category-select-label"
                value={currentRobot.category || ''}
                label="Catégorie"
                onChange={(e) =>
                  setCurrentRobot((prev) => ({
                    ...prev,
                    category: e.target.value,
                  }))
                }
              >
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              margin="normal"
              fullWidth
              label="Prix de vente (PV)"
              type="number"
              InputProps={{ inputProps: { min: 0, step: 0.01 } }}
              value={currentRobot.sellingPrice || ''}
              onChange={(e) =>
                setCurrentRobot((prev) => ({
                  ...prev,
                  sellingPrice: e.target.value
                    ? parseFloat(e.target.value)
                    : undefined,
                }))
              }
            />
            <TextField
              margin="normal"
              fullWidth
              label="Prix d'achat (PA)"
              type="number"
              InputProps={{ inputProps: { min: 0, step: 0.01 } }}
              value={currentRobot.purchasePrice || ''}
              onChange={(e) =>
                setCurrentRobot((prev) => ({
                  ...prev,
                  purchasePrice: e.target.value
                    ? parseFloat(e.target.value)
                    : undefined,
                }))
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Tooltip title="Annuler" arrow>
            <Button onClick={handleCloseDialog}>Annuler</Button>
          </Tooltip>
          <Tooltip title="Enregistrer" arrow>
            <Button
              onClick={handleSaveRobot}
              variant="contained"
              color="primary"
            >
              Enregistrer
            </Button>
          </Tooltip>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default RobotInventory;
