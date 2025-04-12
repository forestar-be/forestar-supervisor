import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
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
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useAuth } from '../hooks/AuthProvider';
import { toast } from 'react-toastify';
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
import {
  onFirstDataRendered,
  setupGridStateEvents,
  clearGridState,
  saveGridPageSize,
  loadGridPageSize,
} from '../utils/agGridSettingsHelper';
import { useSelector } from 'react-redux';
import { RootState } from '../store/index';
import {
  RobotInventory as RobotInventoryType,
  InventoryPlan,
  InventoryCategory,
} from '../utils/types';
import { useAppDispatch } from '../store/hooks';
import {
  addInventoryItemAsync,
  updateInventoryItemAsync,
  deleteInventoryItemAsync,
  updateInventoryPlansAsync,
  fetchInventorySummaryAsync,
} from '../store/robotInventorySlice';

// Helper function to get current year
const getCurrentYear = () => {
  const now = new Date();
  return now.getFullYear();
};

// Grid state key for inventory
const INVENTORY_GRID_STATE_KEY = 'inventoryAgGridState';

const Inventory: React.FC = () => {
  const { token } = useAuth();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { items, periods, loading } = useSelector(
    (state: RootState) => state.robotInventory,
  );
  const [openDialog, setOpenDialog] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<RobotInventoryType>>(
    {},
  );
  const [selectedYear, setSelectedYear] = useState<number>(getCurrentYear());
  const [inventoryEdits, setInventoryEdits] = useState<{
    [key: string]: number;
  }>({});
  const [paginationPageSize, setPaginationPageSize] = useState(() =>
    loadGridPageSize(INVENTORY_GRID_STATE_KEY, 20),
  );
  const [hideZeroQuantity, setHideZeroQuantity] = useState(false);
  const gridRef = React.createRef<AgGridReact>();

  // Save page size to localStorage when it changes
  useEffect(() => {
    saveGridPageSize(INVENTORY_GRID_STATE_KEY, paginationPageSize);
  }, [paginationPageSize]);

  // Refresh data if needed
  useEffect(() => {
    if (token && items.length === 0 && !loading) {
      dispatch(fetchInventorySummaryAsync(token));
    }
  }, [token, items.length, loading, dispatch]);

  // Get available years from periods
  const years = useMemo(() => {
    const uniqueYears = Array.from(new Set(periods.map((p) => p.year)));
    const currentYear = getCurrentYear();

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

  // Find inventory plan for an item in the selected year
  const getInventoryPlan = useCallback(
    (item: RobotInventoryType): InventoryPlan | undefined => {
      return item.inventoryPlans?.find((plan) => plan.year === selectedYear);
    },
    [selectedYear],
  );

  // Get quantity for an item in the selected year
  const getQuantity = useCallback(
    (item: RobotInventoryType): number => {
      const plan = getInventoryPlan(item);
      const editKey = `${item.id}-${selectedYear}`;

      if (editKey in inventoryEdits) {
        return inventoryEdits[editKey];
      }

      return plan?.quantity || 0;
    },
    [getInventoryPlan, inventoryEdits, selectedYear],
  );

  // Filter items based on hideZeroQuantity setting
  const filteredItems = useMemo(() => {
    if (!hideZeroQuantity) return items;
    return items.filter((item) => getQuantity(item) > 0);
  }, [items, hideZeroQuantity, getQuantity]);

  // Handle dialog open for adding new item
  const handleAddItem = () => {
    setCurrentItem({});
    setOpenDialog(true);
  };

  // Handle dialog open for editing item
  const handleEditItem = useCallback((item: RobotInventoryType) => {
    setCurrentItem({ ...item });
    setOpenDialog(true);
  }, []);

  // Handle dialog close
  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
    setCurrentItem({});
  }, []);

  // Handle save item
  const handleSaveItem = async () => {
    if (!token || !currentItem.name) {
      toast.error("Nom de l'élément requis");
      return;
    }

    try {
      if (currentItem.id) {
        // Update existing item
        await dispatch(
          updateInventoryItemAsync({
            token,
            id: currentItem.id,
            itemData: currentItem,
          }),
        ).unwrap();
        toast.success('Élément mis à jour avec succès');
      } else {
        // Create new item
        await dispatch(
          addInventoryItemAsync({
            token,
            itemData: currentItem,
          }),
        ).unwrap();
        toast.success('Élément ajouté avec succès');
      }
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error(`Erreur lors de la sauvegarde: ${error}`);
    }
  };

  // Handle delete item
  const handleDeleteItem = useCallback(
    async (item: RobotInventoryType) => {
      if (
        !token ||
        !window.confirm('Êtes-vous sûr de vouloir supprimer cet élément?')
      ) {
        return;
      }

      try {
        await dispatch(
          deleteInventoryItemAsync({ token, id: item.id }),
        ).unwrap();
        toast.success('Élément supprimé avec succès');
      } catch (error) {
        console.error('Error deleting item:', error);
        toast.error('Erreur lors de la suppression');
      }
    },
    [token, dispatch],
  );

  // Handle quantity change for an item
  const handleQuantityChange = useCallback(
    (id: number, quantity: number) => {
      const editKey = `${id}-${selectedYear}`;
      setInventoryEdits((prev) => ({
        ...prev,
        [editKey]: quantity,
      }));
    },
    [selectedYear],
  );

  // Increment item quantity
  const handleIncrementQuantity = useCallback(
    (item: RobotInventoryType) => {
      setInventoryEdits((prev) => {
        const key = `${item.id}-${selectedYear}`;
        const currentQuantity =
          key in prev ? prev[key] : getInventoryPlan(item)?.quantity || 0;
        return { ...prev, [key]: currentQuantity + 1 };
      });
    },
    [selectedYear, getInventoryPlan],
  );

  // Decrement item quantity
  const handleDecrementQuantity = useCallback(
    (item: RobotInventoryType) => {
      setInventoryEdits((prev) => {
        const key = `${item.id}-${selectedYear}`;
        const currentQuantity =
          key in prev ? prev[key] : getInventoryPlan(item)?.quantity || 0;
        return { ...prev, [key]: currentQuantity - 1 };
      });
    },
    [selectedYear, getInventoryPlan],
  );

  // Save all inventory changes
  const handleSaveInventory = async () => {
    if (!token || Object.keys(inventoryEdits).length === 0) {
      return;
    }

    try {
      // Convert inventoryEdits to array of inventory plans
      const plans = Object.keys(inventoryEdits).map((key) => {
        const [itemId, year] = key.split('-').map(Number);
        return {
          robotInventoryId: itemId,
          year,
          quantity: inventoryEdits[key],
        };
      });

      await dispatch(updateInventoryPlansAsync({ token, plans })).unwrap();

      // Clear edits
      setInventoryEdits({});

      toast.success('Inventaire mis à jour avec succès');
    } catch (error) {
      console.error('Error saving inventory:', error);
      toast.error(`Erreur lors de la sauvegarde de l'inventaire: ${error}`);
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

      const itemId = params.data.id;
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
              handleQuantityChange(itemId, Number(e.target.value))
            }
            InputProps={{
              sx: { height: '32px' },
            }}
            sx={{
              width: '100px',
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
      const item = params.data as RobotInventoryType;

      return (
        <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
          <Tooltip title="Diminuer quantité" arrow>
            <IconButton
              color="error"
              onClick={() => handleDecrementQuantity(item)}
              size="small"
            >
              <RemoveCircleIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Augmenter quantité" arrow>
            <IconButton
              color="success"
              onClick={() => handleIncrementQuantity(item)}
              size="small"
            >
              <AddCircleIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Modifier" arrow>
            <IconButton
              color="primary"
              onClick={() => handleEditItem(params.data)}
              size="small"
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Supprimer" arrow>
            <IconButton
              color="error"
              onClick={() => handleDeleteItem(params.data)}
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
      handleEditItem,
      handleDeleteItem,
    ],
  );

  // Category cell renderer
  const categoryCellRenderer = useCallback((params: any) => {
    if (!params.value) return '-';

    // Create color map for different inventory categories
    const colorMap: { [key in InventoryCategory]: any } = {
      [InventoryCategory.ROBOT]: 'primary',
      [InventoryCategory.ANTENNA]: 'secondary',
      [InventoryCategory.PLUGIN]: 'success',
      [InventoryCategory.SHELTER]: 'warning',
    };

    // Get friendly display name for category
    const getCategoryDisplayName = (category: InventoryCategory): string => {
      switch (category) {
        case InventoryCategory.ROBOT:
          return 'Robot';
        case InventoryCategory.ANTENNA:
          return 'Antenne';
        case InventoryCategory.PLUGIN:
          return 'Plugin';
        case InventoryCategory.SHELTER:
          return 'Abri';
        default:
          return category;
      }
    };

    // Cast the value to the correct type
    const category = params.value as InventoryCategory;

    return (
      <Chip
        label={getCategoryDisplayName(category)}
        color={colorMap[category] || 'default'}
        size="small"
      />
    );
  }, []);

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
        headerName: `Quantité (${selectedYear})`,
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

      const gridApi = params.api;
      // Setup event listeners to save grid state on changes
      setupGridStateEvents(gridApi, INVENTORY_GRID_STATE_KEY);
    },
    [loading],
  );

  // Handle first data rendered - load saved column state
  const handleFirstDataRendered = useCallback((params: any) => {
    onFirstDataRendered(params, INVENTORY_GRID_STATE_KEY);
  }, []);

  // Update the grid when year changes
  useEffect(() => {
    if (gridRef.current && gridRef.current.api) {
      gridRef.current.api.refreshHeader();
    }
  }, [selectedYear, gridRef]);

  // Handle reset grid state
  const handleResetGrid = useCallback(() => {
    if (
      window.confirm(
        'Réinitialiser tous les paramètres du tableau (colonnes, filtres) ?',
      )
    ) {
      // Clear the saved state
      clearGridState(INVENTORY_GRID_STATE_KEY);
      // Reload the page to apply the reset
      window.location.reload();
    }
  }, []);

  // Available page size options
  const pageSizeOptions = [5, 10, 15, 20, 25, 50, 100];

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
            Inventaire
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
          <FormControlLabel
            control={
              <Switch
                checked={hideZeroQuantity}
                onChange={(e) => setHideZeroQuantity(e.target.checked)}
                color="primary"
              />
            }
            label="Masquer éléments sans stock"
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
        <Box sx={{ display: 'flex', gap: 2 }}>
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
          <Tooltip title="Ajouter un élément" arrow>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAddItem}
            >
              Ajouter
            </Button>
          </Tooltip>
        </Box>
      </Box>
      <StyledAgGridWrapper
        id="inventory-table"
        className={`inventory-table ag-theme-quartz${
          theme.palette.mode === 'dark' ? '-dark' : ''
        }`}
      >
        <AgGridReact
          suppressCellFocus={true}
          ref={gridRef}
          rowData={filteredItems}
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
          overlayNoRowsTemplate='<span class="ag-overlay-no-rows-center">Aucun élément trouvé</span>'
          onPaginationChanged={(event) => {
            const api = event.api;
            const newPageSize = api.paginationGetPageSize();
            if (newPageSize !== paginationPageSize) {
              setPaginationPageSize(newPageSize);
            }
          }}
        />
      </StyledAgGridWrapper>
      {/* Item Edit Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {currentItem.id ? "Modifier l'élément" : 'Ajouter un élément'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              fullWidth
              label="Référence"
              value={currentItem.reference || ''}
              onChange={(e) =>
                setCurrentItem((prev) => ({
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
              value={currentItem.name || ''}
              onChange={(e) =>
                setCurrentItem((prev) => ({ ...prev, name: e.target.value }))
              }
            />
            <FormControl fullWidth margin="normal">
              <InputLabel id="category-select-label">Catégorie</InputLabel>
              <Select
                labelId="category-select-label"
                value={currentItem.category || InventoryCategory.ROBOT}
                label="Catégorie"
                onChange={(e) =>
                  setCurrentItem((prev) => ({
                    ...prev,
                    category: e.target.value as InventoryCategory,
                  }))
                }
              >
                <MenuItem value={InventoryCategory.ROBOT}>Robot</MenuItem>
                <MenuItem value={InventoryCategory.ANTENNA}>Antenne</MenuItem>
                <MenuItem value={InventoryCategory.PLUGIN}>Plugin</MenuItem>
                <MenuItem value={InventoryCategory.SHELTER}>Abri</MenuItem>
              </Select>
            </FormControl>
            <TextField
              margin="normal"
              fullWidth
              label="Prix de vente (PV)"
              type="number"
              InputProps={{ inputProps: { min: 0, step: 0.01 } }}
              value={currentItem.sellingPrice || ''}
              onChange={(e) =>
                setCurrentItem((prev) => ({
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
              value={currentItem.purchasePrice || ''}
              onChange={(e) =>
                setCurrentItem((prev) => ({
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
              onClick={handleSaveItem}
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

export default Inventory;
