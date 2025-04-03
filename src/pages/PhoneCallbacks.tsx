import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  useTheme,
  SelectChangeEvent,
  Tooltip,
} from '@mui/material';
import { AgGridReact } from 'ag-grid-react';
import {
  ColDef,
  GridReadyEvent,
  GridApi,
  ICellRendererParams,
} from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import 'ag-grid-community/styles/ag-theme-material.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { useAuth } from '../hooks/AuthProvider';
import {
  createPhoneCallback,
  updatePhoneCallback,
  deletePhoneCallback,
  togglePhoneCallbackStatus,
  PhoneCallback,
  PhoneCallbackFormData,
  fetchAllPhoneCallbacks,
} from '../utils/api';
import {
  notifySuccess,
  notifyError,
  notifyWarning,
} from '../utils/notifications';
import { AG_GRID_LOCALE_FR } from '@ag-grid-community/locale';
import {
  onFirstDataRendered,
  setupGridStateEvents,
  clearGridState,
  saveGridPageSize,
  loadGridPageSize,
} from '../utils/agGridSettingsHelper';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { StyledAgGridWrapper } from '../components/styles/AgGridStyles';

// Identifiants des colonnes pour potentiellement configurer quelles colonnes afficher
export enum COLUMN_ID_CALLBACKS {
  ID = 'id',
  CREATED_AT = 'createdAt',
  CLIENT_NAME = 'clientName',
  PHONE_NUMBER = 'phoneNumber',
  REASON = 'reason',
  DESCRIPTION = 'description',
  RESPONSIBLE_PERSON = 'responsiblePerson',
  COMPLETED = 'completed',
}

// Initialisation de dayjs pour utiliser le français
dayjs.locale('fr');

// Valeurs initiales du formulaire
const initialFormData: PhoneCallbackFormData = {
  phoneNumber: '',
  clientName: '',
  reason: 'other',
  description: '',
  responsiblePerson: '',
};

// Composant de renderer pour la colonne Raison
interface ReasonCellProps extends ICellRendererParams {
  value: string;
}

const ReasonCellRenderer: React.FC<ReasonCellProps> = (props) => {
  const reasonLabel = (() => {
    switch (props.value) {
      case 'warranty':
        return 'Garantie';
      case 'delivery':
        return 'Livraison';
      case 'rental':
        return 'Location';
      case 'other':
      default:
        return 'Autre';
    }
  })();

  let color = '';
  switch (props.value) {
    case 'warranty':
      color = '#1976d2'; // primary
      break;
    case 'delivery':
      color = '#9c27b0'; // secondary
      break;
    case 'rental':
      color = '#03a9f4'; // info
      break;
    default:
      color = '#757575'; // default
  }

  return (
    <Tooltip title={`Raison : ${reasonLabel}`} arrow placement="top">
      <Chip
        label={reasonLabel}
        size="small"
        style={{
          backgroundColor: color,
          color: 'white',
        }}
      />
    </Tooltip>
  );
};

// Composant de renderer pour la colonne Statut
interface StatusCellProps extends ICellRendererParams {
  value: boolean;
}

const StatusCellRenderer: React.FC<StatusCellProps> = (props) => {
  const status = props.value ? 'Terminé' : 'À faire';
  const color = props.value ? '#4caf50' : '#ff9800'; // success ou warning

  return (
    <Tooltip title={`Statut : ${status}`} arrow placement="top">
      <Chip
        label={status}
        size="small"
        style={{
          backgroundColor: color,
          color: 'white',
        }}
      />
    </Tooltip>
  );
};

// Composant de renderer pour la colonne Actions
interface ActionsCellProps extends ICellRendererParams {
  data: PhoneCallback;
  onToggleComplete: (callback: PhoneCallback) => void;
  onEdit: (callback: PhoneCallback) => void;
  onDelete: (id: number) => void;
}

const ActionsCellRenderer: React.FC<ActionsCellProps> = (props) => {
  const { data, onToggleComplete, onEdit, onDelete } = props;

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        justifyContent: 'start',
        alignItems: 'center',
      }}
    >
      <Tooltip
        title={
          data.completed ? 'Marquer comme non terminé' : 'Marquer comme terminé'
        }
        arrow
        placement="top"
      >
        <IconButton
          size="small"
          color={data.completed ? 'success' : 'default'}
          onClick={() => onToggleComplete(data)}
        >
          {data.completed ? <CheckCircleIcon /> : <CheckCircleOutlineIcon />}
        </IconButton>
      </Tooltip>

      <Tooltip title="Modifier" arrow placement="top">
        <IconButton size="small" color="primary" onClick={() => onEdit(data)}>
          <EditIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title="Supprimer" arrow placement="top">
        <IconButton
          size="small"
          color="error"
          onClick={() => onDelete(data.id)}
        >
          <DeleteIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

// Grid state key for phone callbacks
const PHONE_CALLBACKS_GRID_STATE_KEY = 'phoneCallbacksAgGridState';

// Composant principal
const PhoneCallbacks: React.FC = () => {
  const auth = useAuth();
  const theme = useTheme();
  const gridRef = useRef<AgGridReact>(null);
  const [allCallbacks, setAllCallbacks] = useState<PhoneCallback[]>([]);
  const [callbacks, setCallbacks] = useState<PhoneCallback[]>([]);
  const [formData, setFormData] =
    useState<PhoneCallbackFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Partial<PhoneCallbackFormData>>(
    {},
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(() =>
    loadGridPageSize(PHONE_CALLBACKS_GRID_STATE_KEY, 20),
  );
  const [totalCount, setTotalCount] = useState(0);
  const [filterCompleted, setFilterCompleted] = useState<boolean | undefined>(
    undefined,
  );
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [loading, setLoading] = useState(false);

  // Constante pour la hauteur des lignes du tableau
  const ROW_HEIGHT = 48;

  // Options de taille de page disponibles
  const pageSizeOptions = [5, 10, 15, 20, 25, 50, 100];

  // Save page size to localStorage when it changes
  useEffect(() => {
    saveGridPageSize(PHONE_CALLBACKS_GRID_STATE_KEY, rowsPerPage);
  }, [rowsPerPage]);

  // Récupération des données depuis l'API
  const fetchCallbacks = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetchAllPhoneCallbacks(auth.token);

      if (response && response.data) {
        setAllCallbacks(response.data);
      } else {
        notifyWarning('Aucun rappel téléphonique trouvé');
      }
    } catch (error) {
      console.error(
        'Erreur lors de la récupération des rappels téléphoniques',
        error,
      );
      notifyError('Erreur lors de la récupération des rappels téléphoniques');
    } finally {
      setLoading(false);
    }
  }, [auth.token]);

  // Filtrer les données et gérer la pagination côté client
  useEffect(() => {
    if (allCallbacks.length === 0) return;

    // Appliquer le filtre si nécessaire
    let filtered = [...allCallbacks];
    if (filterCompleted !== undefined) {
      filtered = filtered.filter(
        (callback) => callback.completed === filterCompleted,
      );
    }

    // Mettre à jour le nombre total d'éléments
    setTotalCount(filtered.length);

    // Appliquer la pagination
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    setCallbacks(filtered.slice(start, end));
  }, [allCallbacks, filterCompleted, page, rowsPerPage]);

  // Validation du formulaire
  const validateForm = (): boolean => {
    const validationErrors: Partial<PhoneCallbackFormData> = {};
    let isValid = true;

    if (!formData.phoneNumber.trim()) {
      validationErrors.phoneNumber = 'Le numéro de téléphone est obligatoire';
      isValid = false;
    }

    if (!formData.clientName.trim()) {
      validationErrors.clientName = 'Le nom du client est obligatoire';
      isValid = false;
    }

    if (!formData.reason) {
      validationErrors.reason = 'La raison du rappel est obligatoire';
      isValid = false;
    }

    if (!formData.description.trim()) {
      validationErrors.description = 'La description est obligatoire';
      isValid = false;
    }

    if (!formData.responsiblePerson) {
      validationErrors.responsiblePerson =
        'La personne responsable est obligatoire';
      isValid = false;
    }

    setFormErrors(validationErrors);
    return isValid;
  };

  // Gestion des champs de saisie
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>,
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name as string]: value,
    });
  };

  // Gestion des menus déroulants
  const handleSelectChange = (event: SelectChangeEvent<string>) => {
    const { name, value } = event.target;
    setFormData({
      ...formData,
      [name as string]: value,
    });
  };

  // Soumission du formulaire
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (editingId) {
        const updatedCallback = await updatePhoneCallback(
          auth.token,
          editingId,
          formData,
        );
        // Mettre à jour l'état local
        setAllCallbacks((prevCallbacks) =>
          prevCallbacks.map((cb) =>
            cb.id === editingId ? updatedCallback : cb,
          ),
        );
        notifySuccess(`Rappel téléphonique mis à jour avec succès`);
      } else {
        const newCallback = await createPhoneCallback(auth.token, formData);
        // Ajouter le nouveau rappel à la liste
        setAllCallbacks((prevCallbacks) => [newCallback, ...prevCallbacks]);
        notifySuccess(`Rappel téléphonique créé avec succès`);
      }

      setDialogOpen(false);
      setFormData(initialFormData);
      setEditingId(null);
    } catch (error) {
      console.error(
        "Erreur lors de l'enregistrement du rappel téléphonique",
        error,
      );
      notifyError("Erreur lors de l'enregistrement du rappel téléphonique");
    } finally {
      setLoading(false);
    }
  };

  // Modification du statut d'un rappel
  const handleToggleComplete = (callback: PhoneCallback) => {
    setLoading(true);

    togglePhoneCallbackStatus(auth.token, callback)
      .then((updatedCallback) => {
        // Mettre à jour l'état local
        setAllCallbacks((prevCallbacks) =>
          prevCallbacks.map((cb) =>
            cb.id === updatedCallback.id ? updatedCallback : cb,
          ),
        );
        notifySuccess(
          `Rappel marqué comme ${
            updatedCallback.completed ? 'terminé' : 'à faire'
          }`,
        );
      })
      .catch((error) => {
        console.error('Erreur lors de la modification du statut', error);
        notifyError('Erreur lors de la modification du statut');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Suppression d'un rappel
  const handleDelete = (id: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce rappel ?')) {
      setLoading(true);

      deletePhoneCallback(auth.token, id)
        .then(() => {
          // Mettre à jour l'état local
          setAllCallbacks((prevCallbacks) =>
            prevCallbacks.filter((cb) => cb.id !== id),
          );
          notifySuccess('Rappel supprimé avec succès');
        })
        .catch((error) => {
          console.error('Erreur lors de la suppression du rappel', error);
          notifyError('Erreur lors de la suppression du rappel');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };

  // Édition d'un rappel
  const handleEdit = (callback: PhoneCallback) => {
    setFormData({
      phoneNumber: callback.phoneNumber,
      clientName: callback.clientName,
      reason: callback.reason,
      description: callback.description,
      responsiblePerson: callback.responsiblePerson,
    });
    setEditingId(callback.id);
    setDialogOpen(true);
  };

  // Filtrage des rappels par statut
  const handleFilterChange = (value: boolean | undefined) => {
    setFilterCompleted(value);
    setPage(0);
  };

  // Formatage des dates avec dayjs
  const formatDate = (dateString: string) => {
    return dayjs(dateString).format('DD/MM/YYYY HH:mm');
  };

  // Initialisation de la grille
  const onGridReady = (params: GridReadyEvent) => {
    setGridApi(params.api);

    // Si nous avons des données, ajustons automatiquement la taille des colonnes
    if (callbacks.length > 0) {
      params.api.sizeColumnsToFit();
    }

    // Setup event listeners to save grid state on changes
    setupGridStateEvents(params.api, PHONE_CALLBACKS_GRID_STATE_KEY);
  };

  // Handle first data rendered - load saved column state
  const handleFirstDataRendered = useCallback((params: any) => {
    onFirstDataRendered(params, PHONE_CALLBACKS_GRID_STATE_KEY);
  }, []);

  // Handle reset grid state
  const handleResetGrid = useCallback(() => {
    if (
      window.confirm(
        'Réinitialiser tous les paramètres du tableau (colonnes, filtres) ?',
      )
    ) {
      // Clear the saved state
      clearGridState(PHONE_CALLBACKS_GRID_STATE_KEY);
      // Reload the page to apply the reset
      window.location.reload();
    }
  }, []);

  // Configuration de base commune à toutes les colonnes
  const baseColumnConfig = useMemo(
    () => ({
      sortable: true,
      filter: true,
      filterParams: {
        buttons: ['reset', 'apply'],
      },
      resizable: true,
    }),
    [],
  );

  // Définition des colonnes pour AG Grid
  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        headerName: 'Date',
        field: COLUMN_ID_CALLBACKS.CREATED_AT,
        valueFormatter: (params) => formatDate(params.value),
        flex: 1,
        ...baseColumnConfig,
      },
      {
        headerName: 'Nom du client',
        field: COLUMN_ID_CALLBACKS.CLIENT_NAME,
        flex: 1,
        ...baseColumnConfig,
      },
      {
        headerName: 'Téléphone',
        field: COLUMN_ID_CALLBACKS.PHONE_NUMBER,
        flex: 1,
        ...baseColumnConfig,
      },
      {
        headerName: 'Raison',
        field: COLUMN_ID_CALLBACKS.REASON,
        flex: 1,
        cellRenderer: ReasonCellRenderer,
        ...baseColumnConfig,
      },
      {
        headerName: 'Description',
        field: COLUMN_ID_CALLBACKS.DESCRIPTION,
        flex: 2,
        ...baseColumnConfig,
      },
      {
        headerName: 'Responsable',
        field: COLUMN_ID_CALLBACKS.RESPONSIBLE_PERSON,
        flex: 1,
        ...baseColumnConfig,
      },
      {
        headerName: 'Statut',
        field: COLUMN_ID_CALLBACKS.COMPLETED,
        flex: 1,
        cellRenderer: StatusCellRenderer,
        ...baseColumnConfig,
      },
      {
        headerName: 'Actions',
        sortable: false,
        filter: false,
        flex: 1.5,
        cellRenderer: ActionsCellRenderer,
        cellRendererParams: {
          onToggleComplete: handleToggleComplete,
          onEdit: handleEdit,
          onDelete: handleDelete,
        },
      },
    ],
    [handleToggleComplete, handleEdit, handleDelete, baseColumnConfig],
  );

  // Charger toutes les données au premier rendu
  useEffect(() => {
    fetchCallbacks();
  }, [fetchCallbacks]);

  return (
    <Paper
      sx={{
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 2,
        }}
      >
        {/* Partie gauche: titre et filtres */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" component="h6" sx={{ whiteSpace: 'nowrap' }}>
            Gestion des rappels téléphoniques
          </Typography>

          {/* Filtres à côté du titre */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Afficher tous les rappels" arrow placement="bottom">
              <Button
                variant={
                  filterCompleted === undefined ? 'contained' : 'outlined'
                }
                onClick={() => handleFilterChange(undefined)}
                disabled={loading}
              >
                Tous
              </Button>
            </Tooltip>
            <Tooltip
              title="Afficher uniquement les rappels à faire"
              arrow
              placement="bottom"
            >
              <Button
                variant={filterCompleted === false ? 'contained' : 'outlined'}
                onClick={() => handleFilterChange(false)}
                disabled={loading}
              >
                À faire
              </Button>
            </Tooltip>
            <Tooltip
              title="Afficher uniquement les rappels terminés"
              arrow
              placement="bottom"
            >
              <Button
                variant={filterCompleted === true ? 'contained' : 'outlined'}
                onClick={() => handleFilterChange(true)}
                disabled={loading}
              >
                Terminés
              </Button>
            </Tooltip>
          </Box>
        </Box>

        {/* Partie droite: boutons d'action */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Tooltip
            title="Réinitialiser le tableau (filtre, tri, déplacement et taille des colonnes)"
            arrow
            placement="left"
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
          <Tooltip
            title="Ajouter un nouveau rappel téléphonique"
            arrow
            placement="left"
          >
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => {
                setFormData(initialFormData);
                setEditingId(null);
                setDialogOpen(true);
              }}
              disabled={loading}
            >
              Nouveau rappel
            </Button>
          </Tooltip>
        </Box>
      </Box>
      {/* Tableau AG Grid */}
      <StyledAgGridWrapper
        id="phone-callbacks-table"
        className={`ag-theme-quartz${
          theme.palette.mode === 'dark' ? '-dark' : ''
        }`}
      >
        <AgGridReact
          ref={gridRef}
          rowData={callbacks}
          columnDefs={columnDefs}
          pagination={true}
          paginationPageSize={rowsPerPage}
          paginationPageSizeSelector={pageSizeOptions}
          onGridReady={onGridReady}
          onFirstDataRendered={handleFirstDataRendered}
          onPaginationChanged={(event) => {
            const api = event.api;
            const newPageSize = api.paginationGetPageSize();
            if (newPageSize !== rowsPerPage) {
              setRowsPerPage(newPageSize);
            }
            const currentPage = api.paginationGetCurrentPage();
            setPage(currentPage);
          }}
          animateRows={true}
          suppressCellFocus={true}
          enableCellTextSelection={true}
          localeText={AG_GRID_LOCALE_FR}
          overlayNoRowsTemplate="<span>Aucun rappel téléphonique trouvé</span>"
          overlayLoadingTemplate="<span>Chargement des données...</span>"
          tooltipShowDelay={0}
          rowHeight={ROW_HEIGHT}
          headerHeight={48}
          domLayout="normal"
          suppressMovableColumns={false}
          suppressColumnVirtualisation={false}
          loadingOverlayComponent="loadingRenderer"
        />
      </StyledAgGridWrapper>
      <Dialog
        open={dialogOpen}
        onClose={() => !loading && setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingId
            ? 'Modifier le rappel téléphonique'
            : 'Nouveau rappel téléphonique'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                name="phoneNumber"
                label="Numéro de téléphone"
                fullWidth
                value={formData.phoneNumber}
                onChange={handleInputChange}
                error={!!formErrors.phoneNumber}
                helperText={formErrors.phoneNumber}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="clientName"
                label="Nom du client"
                fullWidth
                value={formData.clientName}
                onChange={handleInputChange}
                error={!!formErrors.clientName}
                helperText={formErrors.clientName}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl
                fullWidth
                error={!!formErrors.reason}
                disabled={loading}
              >
                <InputLabel>Raison du rappel</InputLabel>
                <Select
                  name="reason"
                  value={formData.reason}
                  label="Raison du rappel"
                  onChange={handleSelectChange}
                >
                  <MenuItem value="warranty">Garantie</MenuItem>
                  <MenuItem value="delivery">Livraison</MenuItem>
                  <MenuItem value="rental">Location</MenuItem>
                  <MenuItem value="other">Autre</MenuItem>
                </Select>
                {formErrors.reason && (
                  <FormHelperText>{formErrors.reason}</FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl
                fullWidth
                error={!!formErrors.responsiblePerson}
                disabled={loading}
              >
                <InputLabel>Personne responsable</InputLabel>
                <Select
                  name="responsiblePerson"
                  value={formData.responsiblePerson}
                  label="Personne responsable"
                  onChange={handleSelectChange}
                >
                  <MenuItem value="Jowel">Jowel</MenuItem>
                  <MenuItem value="Julien">Julien</MenuItem>
                  <MenuItem value="Mirko">Mirko</MenuItem>
                </Select>
                {formErrors.responsiblePerson && (
                  <FormHelperText>
                    {formErrors.responsiblePerson}
                  </FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="description"
                label="Description"
                fullWidth
                multiline
                rows={4}
                value={formData.description}
                onChange={handleInputChange}
                error={!!formErrors.description}
                helperText={formErrors.description}
                disabled={loading}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setDialogOpen(false)}
            color="inherit"
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {editingId ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default PhoneCallbacks;
