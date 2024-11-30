import React, { useEffect, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import {
  deleteReplacedPart,
  fetchReplacedParts,
  putReplacedParts,
} from '../../utils/api';
import { useAuth } from '../../hooks/AuthProvider';
import {
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Box,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { toast } from 'react-toastify';
import { AG_GRID_LOCALE_FR } from '@ag-grid-community/locale';

export interface ReplacedPart {
  name: string;
  price: number;
}

const EditRepairedPart = () => {
  const auth = useAuth();
  const [replacedParts, setReplacedParts] = useState<ReplacedPart[]>([]);
  const [initialReplacedParts, setInitialReplacedParts] = useState<
    ReplacedPart[]
  >([]);
  const [open, setOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<ReplacedPart | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const theme = useTheme();

  const fetchData = async () => {
    try {
      const newReplacedParts = await fetchReplacedParts(auth.token);
      setReplacedParts(newReplacedParts);
      setInitialReplacedParts(newReplacedParts);
    } catch (error) {
      console.error('Error fetching replacedParts:', error);
      alert(
        `Une erreur s'est produite lors de la récupération des données ${error}`,
      );
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddPart = () => {
    setSelectedPart(null);
    setName('');
    setPrice(null);
    setOpen(true);
  };

  const handleEditPart = (part: ReplacedPart) => {
    setSelectedPart(part);
    setName(part.name);
    setPrice(part.price);
    setOpen(true);
  };

  const handleDeletePart = async (part: ReplacedPart) => {
    const choice = window.confirm(
      `Voulez-vous vraiment supprimer la pièce ${part.name} ?`,
    );

    if (!choice) {
      return;
    }

    const updatedParts = replacedParts.filter((p) => p !== part);

    try {
      await deleteReplacedPart(auth.token, part.name);
      setReplacedParts(updatedParts);
      toast.success('Pièce supprimée avec succès');
    } catch (error) {
      console.error('Error deleting replacedPart:', error);
      toast.error(
        "Une erreur s'est produite lors de la suppression de la pièce",
      );
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    const newPart = { name: name!, price: price! };
    let updatedParts;
    if (selectedPart) {
      updatedParts = replacedParts.map((p) =>
        p === selectedPart ? newPart : p,
      );
    } else {
      updatedParts = [...replacedParts, newPart];
    }
    setReplacedParts(updatedParts);
    setOpen(false);

    try {
      await putReplacedParts(auth.token, updatedParts);
      toast.success('Données sauvegardées avec succès');
    } catch (error) {
      console.error('Error saving replacedParts:', error);
      toast.error(
        "Une erreur s'est produite lors de la sauvegarde des données",
      );
    }
  };

  const columns: any = [
    { headerName: 'Nom', field: 'name', sortable: true, filter: true },
    { headerName: 'Prix', field: 'price', sortable: true, filter: true },
    {
      headerName: 'Actions',
      field: 'actions',
      cellRenderer: (params: any) => (
        <>
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleEditPart(params.data)}
            sx={{ mr: 1 }}
          >
            Modifier
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => handleDeletePart(params.data)}
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
        onClick={handleAddPart}
        sx={{ mb: 2 }}
      >
        Ajouter une pièce
      </Button>
      <div
        className={`ag-theme-quartz${theme.palette.mode === 'dark' ? '-dark' : ''}`}
        style={{ height: '100%', width: '100%' }}
      >
        <AgGridReact
          rowData={replacedParts}
          columnDefs={columns}
          autoSizeStrategy={{
            type: 'fitGridWidth',
          }}
          rowHeight={50}
          localeText={AG_GRID_LOCALE_FR}
        />
      </div>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <form onSubmit={handleSave}>
          <DialogTitle>
            {selectedPart ? 'Modifier' : 'Ajouter'} une pièce
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Nom"
              type="text"
              required
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <TextField
              margin="dense"
              label="Prix"
              type="number"
              required
              fullWidth
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value))}
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

export default EditRepairedPart;
