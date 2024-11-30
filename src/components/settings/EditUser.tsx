import React, { useEffect, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { fetchUsers, addUser, updateUser, deleteUser } from '../../utils/api';
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
import { useAuth } from '../../hooks/AuthProvider';
import { useTheme } from '@mui/material/styles';
import type { ColDef } from '@ag-grid-community/core/dist/types/src/entities/colDef';
import { toast } from 'react-toastify';

export interface User {
  id: string;
  username: string;
  role: 'OPERATOR' | 'SUPERVISOR' | 'ADMIN';
}

const EditUser = () => {
  const auth = useAuth();
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [role, setRole] = useState<'OPERATOR' | 'SUPERVISOR' | 'ADMIN' | null>(
    null,
  );
  const theme = useTheme();

  useEffect(() => {
    const fetchData = async () => {
      const result = await fetchUsers(auth.token);
      setUsers(result);
    };
    fetchData();
  }, []);

  const handleAddUser = () => {
    setSelectedUser(null);
    setUsername(null);
    setPassword(null);
    setRole(null);
    setOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setUsername(user.username);
    setPassword(null);
    setRole(user.role);
    setOpen(true);
  };

  const handleDeleteUser = async (user: User) => {
    const answer = window.confirm(
      'Êtes-vous sûr de vouloir supprimer cet utilisateur?',
    );
    if (answer) {
      try {
        await deleteUser(auth.token, user.id);
        toast.success('Utilisateur supprimé');
      } catch (error) {
        console.error('Failed to delete user:', error);
        toast.error(
          "Une erreur s'est produite lors de la suppression de l'utilisateur",
        );
      }
      const result = await fetchUsers(auth.token);
      setUsers(result);
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      if (selectedUser) {
        await updateUser(auth.token, selectedUser.id, {
          username,
          password,
          role,
        });
      } else {
        await addUser(auth.token, { username, password, role });
      }
      toast.success('Utilisateur sauvegardé');
    } catch (error) {
      console.error('Failed to save user:', error);
      toast.error(
        "Une erreur s'est produite lors de la sauvegarde de l'utilisateur",
      );
    }
    const result = await fetchUsers(auth.token);
    setUsers(result);
    setOpen(false);
  };

  const columns: any = [
    { headerName: 'Utilisateur', field: 'username' },
    {
      headerName: 'Rôle',
      field: 'role',
      valueFormatter: (params: any) => {
        if (params.value === 'OPERATOR') {
          return 'Opérateur';
        }

        if (params.value === 'SUPERVISOR') {
          return 'Superviseur';
        }

        if (params.value === 'ADMIN') {
          return 'Admin';
        }
      },
    },
    {
      headerName: 'Actions',
      field: 'id',
      cellRenderer: (params: any) => (
        <>
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleEditUser(params.data)}
            sx={{ mr: 1 }}
          >
            Modifier
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => handleDeleteUser(params.data)}
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
        onClick={handleAddUser}
        sx={{ mb: 2 }}
      >
        Ajouter un utilisateur
      </Button>
      <div
        className={`ag-theme-quartz${theme.palette.mode === 'dark' ? '-dark' : ''}`}
        style={{ height: '100%', width: '100%' }}
      >
        <AgGridReact
          rowData={users}
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
            {selectedUser ? 'Modifier' : 'Ajouter'} un utilisateur
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Nom d'utilisateur"
              type="text"
              required
              fullWidth
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete={'username'}
            />
            <TextField
              margin="dense"
              label="Mot de passe"
              type="password"
              required
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={'new-password'}
            />
            <TextField
              select
              margin="dense"
              label="Rôle"
              fullWidth
              value={role}
              required
              onChange={(e) =>
                setRole(e.target.value as 'OPERATOR' | 'SUPERVISOR' | 'ADMIN')
              }
            >
              <MenuItem value="OPERATOR">Opérateur</MenuItem>
              <MenuItem value="SUPERVISOR">Superviseur</MenuItem>
              <MenuItem value="ADMIN">Admin</MenuItem>
            </TextField>
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

export default EditUser;
