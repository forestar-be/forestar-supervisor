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
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchConfigAsync,
  addConfigAsync,
  updateConfigAsync,
  deleteConfigAsync,
} from '../../store/configSlice';
import { RootState, AppDispatch } from '../../store';

export type ConfigElement = {
  key: string;
  value: string;
};

type Config = ConfigElement[];

interface EditConfigProps {}

const EditConfig: React.FC<EditConfigProps> = ({}) => {
  const auth = useAuth();
  const dispatch = useDispatch<AppDispatch>();
  const { config: storeConfig, loading } = useSelector(
    (state: RootState) => state.config,
  );
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [configElement, setConfigElement] = useState<ConfigElement>({
    key: '',
    value: '',
  });
  const theme = useTheme();

  // Convert storeConfig object to array of ConfigElement
  const config: Config = Object.entries(storeConfig || {}).map(
    ([key, value]) => ({
      key,
      value,
    }),
  );

  useEffect(() => {
    dispatch(fetchConfigAsync(auth.token));
  }, [auth.token, dispatch]);

  const handleAddConfigElement = () => {
    setConfigElement({ key: '', value: '' });
    setIsEditing(false);
    setOpen(true);
  };

  const handleEditConfigElement = (element: ConfigElement) => {
    setConfigElement(element);
    setIsEditing(true);
    setOpen(true);
  };

  const handleDeleteConfigElement = async (key: string) => {
    const answer = window.confirm(`Êtes-vous sûr de vouloir supprimer ${key}?`);
    if (answer) {
      try {
        await dispatch(deleteConfigAsync({ token: auth.token, key })).unwrap();
        toast.success(`${key} supprimé`);
      } catch (error) {
        console.error(`Failed to delete ${key}:`, error);
        toast.error(
          `Une erreur s'est produite lors de la suppression du ${key}`,
        );
      }
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!configElement) {
      return;
    }

    try {
      if (isEditing) {
        await dispatch(
          updateConfigAsync({ token: auth.token, configElement }),
        ).unwrap();
        toast.success(`${configElement.key} mis à jour`);
      } else {
        await dispatch(
          addConfigAsync({ token: auth.token, configElement }),
        ).unwrap();
        toast.success(`${configElement.key} sauvegardé`);
      }
      setOpen(false);
    } catch (error) {
      console.error(`Failed to save ${configElement.key}:`, error);
      toast.error(
        `Une erreur s'est produite lors de la sauvegarde de ${configElement.key}`,
      );
    }
  };

  const columns: any = [
    { headerName: 'Nom', field: 'key' },
    { headerName: 'Valeur', field: 'value' },
    {
      headerName: 'Actions',
      field: 'configElement',
      cellRenderer: (params: any) => (
        <>
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleEditConfigElement(params.data)}
            sx={{ mr: 1 }}
          >
            Modifier
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => handleDeleteConfigElement(params.data.key)}
          >
            Supprimer
          </Button>
        </>
      ),
    },
  ];

  return (
    <Box height={'100%'}>
      <Button
        variant="contained"
        color="primary"
        onClick={handleAddConfigElement}
        sx={{ mb: 2 }}
      >
        Ajouter un élément de configuration
      </Button>
      <div
        className={`ag-theme-quartz${theme.palette.mode === 'dark' ? '-dark' : ''}`}
        style={{ height: '100%', width: '100%' }}
      >
        <AgGridReact
          rowData={config}
          columnDefs={columns}
          autoSizeStrategy={{
            type: 'fitGridWidth',
          }}
          rowHeight={50}
        />
      </div>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <form onSubmit={handleSave}>
          <DialogTitle>
            {isEditing ? 'Modifier' : 'Ajouter'} un élément de configuration
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label={'Nom'}
              type="text"
              required
              fullWidth
              value={configElement.key}
              onChange={(e) =>
                setConfigElement({ ...configElement, key: e.target.value })
              }
              autoComplete={'off'}
              disabled={isEditing}
            />
            <TextField
              autoFocus
              margin="dense"
              label={'Valeur'}
              type="text"
              required
              fullWidth
              value={configElement.value}
              onChange={(e) =>
                setConfigElement({ ...configElement, value: e.target.value })
              }
              autoComplete={'off'}
              multiline
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

export default EditConfig;
