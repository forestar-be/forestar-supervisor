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
  fetchPhoneCallbacks,
  createPhoneCallback,
  updatePhoneCallback,
  deletePhoneCallback,
  togglePhoneCallbackStatus,
  PhoneCallback,
  PhoneCallbackFormData,
} from '../utils/api';
import {
  notifySuccess,
  notifyError,
  notifyLoading,
  notifyWarning,
} from '../utils/notifications';
import { AG_GRID_LOCALE_FR } from '@ag-grid-community/locale';

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

// Composant principal
const PhoneCallbacks: React.FC = () => {
  const auth = useAuth();
  const theme = useTheme();
  const gridRef = useRef<AgGridReact>(null);
  const [callbacks, setCallbacks] = useState<PhoneCallback[]>([]);
  const [formData, setFormData] =
    useState<PhoneCallbackFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Partial<PhoneCallbackFormData>>(
    {},
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [filterCompleted, setFilterCompleted] = useState<boolean | undefined>(
    undefined,
  );
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [loading, setLoading] = useState(false);

  // Constante pour la hauteur des lignes du tableau
  const ROW_HEIGHT = 48;

  // Récupération des données depuis l'API
  const fetchCallbacks = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetchPhoneCallbacks(
        auth.token,
        page + 1,
        rowsPerPage,
        filterCompleted,
      );

      if (response && response.data) {
        setCallbacks(response.data);
        setTotalCount(response.pagination.totalItems);
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
  }, [auth.token, filterCompleted, page, rowsPerPage]);

  // Chargement initial des données
  useEffect(() => {
    fetchCallbacks();
  }, []);

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

    const operation = editingId ? 'Mise à jour' : 'Création';
    const notification = notifyLoading(
      `${operation} du rappel téléphonique en cours...`,
    );

    try {
      if (editingId) {
        await updatePhoneCallback(auth.token, editingId, formData);
        notification.success(`Rappel téléphonique mis à jour avec succès`);
      } else {
        await createPhoneCallback(auth.token, formData);
        notification.success(`Rappel téléphonique créé avec succès`);
      }

      setDialogOpen(false);
      setFormData(initialFormData);
      setEditingId(null);
      fetchCallbacks();
    } catch (error) {
      console.error(
        "Erreur lors de l'enregistrement du rappel téléphonique",
        error,
      );
      notification.error(
        `Erreur lors de l'${operation.toLowerCase()} du rappel téléphonique`,
      );
    }
  };

  // Édition d'un rappel
  const handleEdit = useCallback((callback: PhoneCallback) => {
    setFormData({
      phoneNumber: callback.phoneNumber,
      clientName: callback.clientName,
      reason: callback.reason,
      description: callback.description,
      responsiblePerson: callback.responsiblePerson,
    });
    setEditingId(callback.id);
    setDialogOpen(true);
  }, []);

  // Suppression d'un rappel
  const handleDelete = useCallback(
    async (id: number) => {
      if (
        window.confirm(
          'Êtes-vous sûr de vouloir supprimer ce rappel téléphonique ?',
        )
      ) {
        const notification = notifyLoading(
          'Suppression du rappel téléphonique en cours...',
        );

        try {
          await deletePhoneCallback(auth.token, id);
          fetchCallbacks();
          notification.success('Rappel téléphonique supprimé avec succès');
        } catch (error) {
          console.error(
            'Erreur lors de la suppression du rappel téléphonique',
            error,
          );
          notification.error(
            'Erreur lors de la suppression du rappel téléphonique',
          );
        }
      }
    },
    [auth.token, fetchCallbacks],
  );

  // Basculement de l'état d'un rappel
  const handleToggleComplete = useCallback(
    async (callback: PhoneCallback) => {
      const action = callback.completed ? 'non terminé' : 'terminé';
      const notification = notifyLoading(
        `Changement du statut du rappel en cours...`,
      );

      try {
        await togglePhoneCallbackStatus(auth.token, callback);
        fetchCallbacks();
        notification.success(`Rappel marqué comme ${action}`);
      } catch (error) {
        console.error(
          'Erreur lors de la mise à jour du statut du rappel',
          error,
        );
        notification.error('Erreur lors de la mise à jour du statut du rappel');
      }
    },
    [auth.token, fetchCallbacks],
  );

  // Filtrage des rappels par statut
  const handleFilterChange = (value: boolean | undefined) => {
    setFilterCompleted(value);
    setPage(0);
  };

  // Formatage des dates avec dayjs
  const formatDate = (dateString: string) => {
    return dayjs(dateString).format('DD/MM/YYYY HH:mm');
  };

  // Calcul automatique du nombre de lignes par page en fonction de la taille de l'écran
  const calculatePageSize = useCallback(() => {
    const element = document.getElementById('phone-callbacks-table');
    const footer = document.querySelector('.ag-paging-panel');
    const header = document.querySelector('.ag-header-viewport');
    if (element) {
      const elementHeight = element.clientHeight;
      const footerHeight = footer?.clientHeight ?? 48;
      const headerHeight = header?.clientHeight ?? 48;
      const newPageSize = Math.floor(
        (elementHeight - headerHeight - footerHeight) / ROW_HEIGHT,
      );
      setRowsPerPage(Math.max(5, newPageSize)); // Minimum 5 lignes par page
    }
  }, []);

  // Recalculer la taille de la page quand les données changent
  useEffect(() => {
    calculatePageSize();
  }, [callbacks, calculatePageSize]);

  // Ajouter un écouteur pour le redimensionnement de la fenêtre
  useEffect(() => {
    window.addEventListener('resize', calculatePageSize);
    return () => {
      window.removeEventListener('resize', calculatePageSize);
    };
  }, [calculatePageSize]);

  // Initialisation de la grille
  const onGridReady = (params: GridReadyEvent) => {
    setGridApi(params.api);

    // Si nous avons des données, ajustons automatiquement la taille des colonnes
    if (callbacks.length > 0) {
      params.api.sizeColumnsToFit();
    }

    // Calculer le nombre de lignes par page
    calculatePageSize();
  };

  // Gestion de la pagination
  const onPaginationChanged = () => {
    if (gridApi) {
      const currentPage = gridApi.paginationGetCurrentPage();
      setPage(currentPage);
    }
  };

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

  return (
    <Paper
      sx={{
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* En-tête compact avec titre, filtres et bouton d'ajout sur la même ligne */}
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

        {/* Partie droite: bouton d'ajout */}
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

      {/* Tableau AG Grid */}
      <Box
        id="phone-callbacks-table"
        className={
          theme.palette.mode === 'dark'
            ? 'ag-theme-quartz-dark'
            : 'ag-theme-quartz'
        }
        sx={{ height: '100%', width: '100%' }}
      >
        <AgGridReact
          ref={gridRef}
          rowData={callbacks}
          columnDefs={columnDefs}
          pagination={true}
          paginationPageSize={rowsPerPage}
          onGridReady={onGridReady}
          onPaginationChanged={onPaginationChanged}
          rowSelection="single"
          animateRows={true}
          suppressCellFocus={true}
          enableCellTextSelection={true}
          localeText={AG_GRID_LOCALE_FR}
          overlayNoRowsTemplate="<span>Aucun rappel téléphonique trouvé</span>"
          overlayLoadingTemplate="<span>Chargement des données...</span>"
          tooltipShowDelay={0}
          onFirstDataRendered={(params) => params.api.sizeColumnsToFit()}
          rowHeight={ROW_HEIGHT}
          headerHeight={48}
          domLayout="normal"
          suppressMovableColumns={false}
          suppressColumnVirtualisation={false}
          loadingOverlayComponent="loadingRenderer"
          paginationPageSizeSelector={false}
        />
      </Box>

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
                  <MenuItem value="Miroko">Miroko</MenuItem>
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
