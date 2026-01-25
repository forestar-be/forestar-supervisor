import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
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
  useMediaQuery,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CircularProgress from '@mui/material/CircularProgress';
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
  WireType,
} from '../utils/types';
import { useAppDispatch } from '../store/hooks';
import {
  addInventoryItemAsync,
  updateInventoryItemAsync,
  deleteInventoryItemAsync,
  updateInventoryPlansAsync,
  fetchInventorySummaryAsync,
  updateItem,
} from '../store/robotInventorySlice';
import WeeklySummaryModal from '../components/WeeklySummaryModal';
import { uploadRobotImage, deleteRobotImage } from '../utils/api';

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
  const { items, periods, loading, isInitialized } = useSelector(
    (state: RootState) => state.robotInventory,
  );
  const [openDialog, setOpenDialog] = useState(false);
  const [openWeeklySummary, setOpenWeeklySummary] = useState(false);
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
  const [imageUploading, setImageUploading] = useState(false);
  const [confirmDeleteImage, setConfirmDeleteImage] = useState(false);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const gridRef = React.createRef<AgGridReact>();
  const isMediumScreen = useMediaQuery('(max-width:920px)');

  // Save page size to localStorage when it changes
  useEffect(() => {
    saveGridPageSize(INVENTORY_GRID_STATE_KEY, paginationPageSize);
  }, [paginationPageSize]);

  // Refresh data if needed
  useEffect(() => {
    if (token && !isInitialized && !loading) {
      dispatch(fetchInventorySummaryAsync(token));
    }
  }, [token, isInitialized, loading, dispatch]);

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

  // Handle image upload
  const handleImageUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !token || !currentItem.id) {
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Veuillez sélectionner une image');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("L'image ne doit pas dépasser 5MB");
        return;
      }

      setImageUploading(true);
      try {
        const result = await uploadRobotImage(token, currentItem.id, file);
        // Update local dialog state
        setCurrentItem((prev) => ({
          ...prev,
          imageFileName: result.robot.imageFileName,
          imageUrl: result.robot.imageUrl,
        }));
        // Update Redux state directly without full refetch
        dispatch(updateItem(result.robot));
        toast.success('Image uploadée avec succès');
      } catch (error) {
        console.error('Error uploading image:', error);
        toast.error("Erreur lors de l'upload de l'image");
      } finally {
        setImageUploading(false);
        // Reset file input
        if (imageInputRef.current) {
          imageInputRef.current.value = '';
        }
      }
    },
    [token, currentItem.id, dispatch],
  );

  // Handle image delete
  const handleImageDelete = useCallback(async () => {
    if (!token || !currentItem.id) {
      return;
    }

    setImageUploading(true);
    setConfirmDeleteImage(false);
    try {
      const result = await deleteRobotImage(token, currentItem.id);
      // Update local dialog state
      setCurrentItem((prev) => ({
        ...prev,
        imageFileName: undefined,
      }));
      // Update Redux state directly without full refetch
      dispatch(updateItem(result.robot));
      toast.success('Image supprimée avec succès');
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error("Erreur lors de la suppression de l'image");
    } finally {
      setImageUploading(false);
    }
  }, [token, currentItem.id, dispatch]);

  // Handle save item
  const handleSaveItem = async () => {
    if (!token || !currentItem.name) {
      toast.error("Nom de l'élément requis");
      return;
    }

    // Validate selling price is required when visible on public site
    if (currentItem.isPublicVisible && !currentItem.sellingPrice) {
      toast.error(
        'Le prix de vente est requis pour les éléments visibles sur le site public',
      );
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

  // Public visibility cell renderer
  const publicVisibilityCellRenderer = useCallback((params: any) => {
    if (!params.data) return null;
    const item = params.data as RobotInventoryType;

    return (
      <Tooltip
        title={item.isPublicVisible ? 'Visible sur Reparobot' : 'Non visible'}
        arrow
      >
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          {item.isPublicVisible ? (
            <VisibilityIcon color="success" fontSize="small" />
          ) : (
            <VisibilityOffIcon color="disabled" fontSize="small" />
          )}
        </Box>
      </Tooltip>
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
        minWidth: 120,
        valueFormatter: (params) => params.value || '-',
      },
      {
        headerName: 'Nom',
        field: 'name',
        sortable: true,
        filter: true,
        flex: 2,
        minWidth: 180,
      },
      {
        headerName: 'Catégorie',
        field: 'category',
        sortable: true,
        filter: true,
        flex: 1,
        minWidth: 130,
        cellRenderer: categoryCellRenderer,
      },
      {
        headerName: 'Public',
        field: 'isPublicVisible',
        sortable: false,
        filter: false,
        flex: 0.5,
        minWidth: 77,
        maxWidth: 77,
        cellRenderer: publicVisibilityCellRenderer,
      },
      {
        headerName: 'Prix de vente (PV)',
        field: 'sellingPrice',
        sortable: true,
        filter: 'agNumberColumnFilter',
        flex: 1,
        minWidth: 150,
        valueFormatter: formatPrice,
      },
      {
        headerName: "Prix d'achat (PA)",
        field: 'purchasePrice',
        sortable: true,
        filter: 'agNumberColumnFilter',
        flex: 1,
        minWidth: 150,
        valueFormatter: formatPrice,
      },
      {
        headerName: `Quantité (${selectedYear})`,
        field: 'quantity',
        sortable: false,
        filter: false,
        flex: 1,
        minWidth: 130,
        cellRenderer: quantityCellRenderer,
      },
      {
        headerName: 'Actions',
        field: 'actions',
        sortable: false,
        filter: false,
        flex: 1,
        minWidth: 170,
        cellRenderer: actionCellRenderer,
      },
    ],
    [
      formatPrice,
      quantityCellRenderer,
      actionCellRenderer,
      categoryCellRenderer,
      publicVisibilityCellRenderer,
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

  // Apply sizeColumnsToFit on window resize
  useEffect(() => {
    const handleResize = () => {
      if (gridRef.current && gridRef.current.api) {
        gridRef.current.api.sizeColumnsToFit();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [gridRef]);

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
          flexWrap: 'wrap',
          rowGap: 1,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
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
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'nowrap' }}>
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
            </Box>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Tooltip title="Récapitulatif des ventes" arrow>
            <Button
              variant="contained"
              color="success"
              startIcon={!isMediumScreen ? <TrendingUpIcon /> : undefined}
              onClick={() => setOpenWeeklySummary(true)}
              size={isMediumScreen ? 'small' : 'medium'}
            >
              {isMediumScreen ? <TrendingUpIcon /> : 'Récapitulatif'}
            </Button>
          </Tooltip>
          <Tooltip title="Ajouter un élément" arrow>
            <Button
              variant="contained"
              color="primary"
              startIcon={!isMediumScreen ? <AddIcon /> : undefined}
              onClick={handleAddItem}
              size={!isMediumScreen ? 'small' : 'medium'}
            >
              {isMediumScreen ? <AddIcon /> : 'Ajouter'}
            </Button>
          </Tooltip>
          <Tooltip
            title="Réinitialiser le tableau (filtre, tri, déplacement et taille des colonnes)"
            arrow
            placement="bottom"
          >
            <IconButton
              color="secondary"
              onClick={handleResetGrid}
              sx={{
                backgroundColor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
            >
              <RestartAltIcon fontSize="small" />
            </IconButton>
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
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { maxHeight: '90vh' },
        }}
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

            {/* Public Catalog Fields - Visibility toggle for all categories */}
            <Divider sx={{ my: 2 }}>
              <Chip label="Site Public Reparobot" size="small" />
            </Divider>

            <FormControlLabel
              control={
                <Switch
                  checked={currentItem.isPublicVisible || false}
                  onChange={(e) =>
                    setCurrentItem((prev) => ({
                      ...prev,
                      isPublicVisible: e.target.checked,
                    }))
                  }
                  color="primary"
                />
              }
              label="Visible sur le site public"
              sx={{ mb: 1 }}
            />

            {/* Robot-specific public catalog fields - Only for ROBOT category */}
            {(currentItem.category === InventoryCategory.ROBOT ||
              !currentItem.category) &&
              currentItem.isPublicVisible && (
                <>
                  <FormControl fullWidth margin="normal">
                    <InputLabel id="wire-type-select-label">
                      Type de connexion
                    </InputLabel>
                    <Select
                      labelId="wire-type-select-label"
                      value={currentItem.wireType || ''}
                      label="Type de connexion"
                      onChange={(e) =>
                        setCurrentItem((prev) => ({
                          ...prev,
                          wireType: e.target.value as WireType,
                        }))
                      }
                    >
                      <MenuItem value={WireType.WIRED}>Filaire</MenuItem>
                      <MenuItem value={WireType.WIRELESS}>Sans fil</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    margin="normal"
                    fullWidth
                    label="Description publique"
                    multiline
                    rows={2}
                    value={currentItem.publicDescription || ''}
                    onChange={(e) =>
                      setCurrentItem((prev) => ({
                        ...prev,
                        publicDescription: e.target.value,
                      }))
                    }
                    helperText="Description affichée sur le site public"
                  />

                  {/* Image Upload Section */}
                  <Box sx={{ mt: 2, mb: 1 }}>
                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Image du robot
                    </Typography>

                    {/* Image Preview */}
                    {currentItem.imageFileName && (
                      <Box
                        sx={{
                          mb: 2,
                          p: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                        }}
                      >
                        <Box
                          component="img"
                          src={currentItem.imageUrl || ''}
                          alt={currentItem.name}
                          sx={{
                            width: 100,
                            height: 100,
                            objectFit: 'cover',
                            borderRadius: 1,
                            bgcolor: 'grey.100',
                          }}
                          onError={(
                            e: React.SyntheticEvent<HTMLImageElement>,
                          ) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            {currentItem.imageFileName}
                          </Typography>
                        </Box>
                        <Tooltip title="Supprimer l'image" arrow>
                          <IconButton
                            color="error"
                            onClick={() => setConfirmDeleteImage(true)}
                            disabled={imageUploading}
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}

                    {/* Upload Button */}
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleImageUpload}
                      disabled={!currentItem.id || imageUploading}
                    />
                    <Button
                      variant="outlined"
                      startIcon={
                        imageUploading ? (
                          <CircularProgress size={20} />
                        ) : (
                          <CloudUploadIcon />
                        )
                      }
                      onClick={() => imageInputRef.current?.click()}
                      disabled={!currentItem.id || imageUploading}
                      fullWidth
                    >
                      {imageUploading
                        ? 'Upload en cours...'
                        : currentItem.imageFileName
                          ? "Remplacer l'image"
                          : 'Uploader une image'}
                    </Button>
                    {!currentItem.id && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 0.5, display: 'block' }}
                      >
                        Enregistrez d'abord l'élément pour pouvoir uploader une
                        image
                      </Typography>
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      margin="normal"
                      fullWidth
                      label="Surface max (m²)"
                      type="number"
                      InputProps={{ inputProps: { min: 0 } }}
                      value={currentItem.maxSurface || ''}
                      onChange={(e) =>
                        setCurrentItem((prev) => ({
                          ...prev,
                          maxSurface: e.target.value
                            ? parseInt(e.target.value)
                            : undefined,
                        }))
                      }
                    />
                    <TextField
                      margin="normal"
                      fullWidth
                      label="Pente max (%)"
                      type="number"
                      InputProps={{ inputProps: { min: 0, max: 100 } }}
                      value={currentItem.maxSlope || ''}
                      onChange={(e) =>
                        setCurrentItem((prev) => ({
                          ...prev,
                          maxSlope: e.target.value
                            ? parseInt(e.target.value)
                            : undefined,
                        }))
                      }
                    />
                  </Box>

                  <TextField
                    margin="normal"
                    fullWidth
                    label="Prix d'installation"
                    type="number"
                    InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                    value={currentItem.installationPrice || ''}
                    onChange={(e) =>
                      setCurrentItem((prev) => ({
                        ...prev,
                        installationPrice: e.target.value
                          ? parseFloat(e.target.value)
                          : undefined,
                      }))
                    }
                  />

                  <TextField
                    margin="normal"
                    fullWidth
                    label="Promotion (optionnel)"
                    value={currentItem.promotion || ''}
                    onChange={(e) =>
                      setCurrentItem((prev) => ({
                        ...prev,
                        promotion: e.target.value || undefined,
                      }))
                    }
                    helperText="Ex: Coupe-bordure offert"
                  />

                  <TextField
                    margin="normal"
                    fullWidth
                    label="Ordre d'affichage"
                    type="number"
                    InputProps={{ inputProps: { min: 0 } }}
                    value={currentItem.publicOrder || 0}
                    onChange={(e) =>
                      setCurrentItem((prev) => ({
                        ...prev,
                        publicOrder: parseInt(e.target.value) || 0,
                      }))
                    }
                    helperText="Plus petit = affiché en premier"
                  />
                </>
              )}
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

      {/* Weekly Summary Modal */}
      <WeeklySummaryModal
        open={openWeeklySummary}
        onClose={() => setOpenWeeklySummary(false)}
      />

      {/* Image Delete Confirmation Dialog */}
      <Dialog
        open={confirmDeleteImage}
        onClose={() => setConfirmDeleteImage(false)}
        maxWidth="xs"
      >
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>Êtes-vous sûr de vouloir supprimer l'image ?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteImage(false)}>Annuler</Button>
          <Button onClick={handleImageDelete} color="error" variant="contained">
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default Inventory;
