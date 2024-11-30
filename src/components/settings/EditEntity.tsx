import React, { useEffect, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import {
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Box,
} from '@mui/material';
import { useAuth } from '../../hooks/AuthProvider';
import { useTheme } from '@mui/material/styles';
import { toast } from 'react-toastify';
import { AG_GRID_LOCALE_FR } from '@ag-grid-community/locale';

type Entity = string;

interface EditEntityProps {
  entityName: string;
  fetchEntities: (token: string) => Promise<Entity[]>;
  addEntity: (token: string, entity: Entity) => Promise<void>;
  deleteEntity: (token: string, entity: Entity) => Promise<void>;
}

const EditEntity: React.FC<EditEntityProps> = ({
  entityName,
  fetchEntities,
  addEntity,
  deleteEntity,
}) => {
  const auth = useAuth();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [open, setOpen] = useState(false);
  const [entity, setEntity] = useState<string | null>(null);
  const theme = useTheme();

  useEffect(() => {
    const fetchData = async () => {
      const result = await fetchEntities(auth.token);
      setEntities(result);
    };
    fetchData();
  }, [fetchEntities, auth.token]);

  const handleAddEntity = () => {
    setEntity(null);
    setOpen(true);
  };

  const handleDeleteEntity = async (entity: Entity) => {
    const answer = window.confirm(
      `Êtes-vous sûr de vouloir supprimer ce ${entityName.toLowerCase()}?`,
    );
    if (answer) {
      try {
        await deleteEntity(auth.token, entity);
        toast.success(`${entityName} supprimé`);
      } catch (error) {
        console.error(`Failed to delete ${entityName.toLowerCase()}:`, error);
        toast.error(
          `Une erreur s'est produite lors de la suppression du ${entityName.toLowerCase()}`,
        );
      }
      const result = await fetchEntities(auth.token);
      setEntities(result);
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      await addEntity(auth.token, entity!);
      toast.success(`${entityName} sauvegardé`);
    } catch (error) {
      console.error(`Failed to save ${entityName.toLowerCase()}:`, error);
      toast.error(
        `Une erreur s'est produite lors de la sauvegarde du ${entityName.toLowerCase()}`,
      );
    }
    const result = await fetchEntities(auth.token);
    setEntities(result);
    setOpen(false);
  };

  const columns: any = [
    { headerName: entityName, field: 'entity', sortable: true, filter: true },
    {
      headerName: 'Actions',
      field: 'entity',
      cellRenderer: (params: any) => (
        <>
          <Button
            variant="contained"
            color="error"
            onClick={() => handleDeleteEntity(params.data.entity)}
          >
            Supprimer
          </Button>
        </>
      ),
    },
  ];

  return (
    <Box sx={{ height: '100%' }}>
      <Button
        variant="contained"
        color="primary"
        onClick={handleAddEntity}
        sx={{ mb: 2 }}
      >
        Ajouter {entityName.toLowerCase()}
      </Button>
      <div
        className={`ag-theme-quartz${theme.palette.mode === 'dark' ? '-dark' : ''}`}
        style={{ height: '100%', width: '100%' }}
      >
        <AgGridReact
          rowData={entities.map((entity) => ({ entity }))}
          columnDefs={columns}
          rowHeight={50}
          autoSizeStrategy={{
            type: 'fitGridWidth',
          }}
          localeText={AG_GRID_LOCALE_FR}
        />
      </div>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <form onSubmit={handleSave}>
          <DialogTitle>Ajouter {entityName.toLowerCase()}</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label={entityName}
              type="text"
              required
              fullWidth
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              autoComplete={'off'}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)} color="secondary">
              Annuler
            </Button>
            <Button type="submit" color="primary">
              Sauvegarder
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default EditEntity;
