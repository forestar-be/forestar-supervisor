import { useState, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragHandle as DragHandleIcon,
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { RootState } from '../store';
import {
  fetchAllInstallationTextsThunk,
  createInstallationTextThunk,
  updateInstallationTextThunk,
  deleteInstallationTextThunk,
  reorderInstallationTextsThunk,
} from '../store/installationTextsSlice';
import {
  InstallationPreparationText,
  InstallationTextType,
} from '../utils/types';
import { useAuth } from '../hooks/AuthProvider';
import { AppDispatch } from '../store';
import { notifyError, notifySuccess } from '../utils/notifications';

interface FormData {
  content: string;
  type: InstallationTextType;
}

const InstallationPreparationTextEditor = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { texts, loading } = useSelector(
    (state: RootState) => state.installationTexts,
  );
  const { token } = useAuth();
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>({
    content: '',
    type: InstallationTextType.PARAGRAPH,
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [textToDelete, setTextToDelete] = useState<number | null>(null);

  const resetForm = useCallback(() => {
    setFormData({
      content: '',
      type: InstallationTextType.PARAGRAPH,
    });
    setEditMode(false);
    setCurrentId(null);
  }, []);

  const handleOpenDialog = useCallback(
    (text?: InstallationPreparationText) => {
      if (text) {
        setFormData({
          content: text.content,
          type: text.type as InstallationTextType,
        });
        setEditMode(true);
        setCurrentId(text.id);
      } else {
        resetForm();
      }
      setOpenDialog(true);
    },
    [resetForm],
  );

  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
    resetForm();
  }, [resetForm]);

  const handleSubmit = useCallback(() => {
    const { content, type } = formData;
    if (!content.trim() || !token) return;

    if (editMode && currentId !== null) {
      dispatch(
        updateInstallationTextThunk({
          token,
          id: currentId,
          updates: { content, type },
        }),
      ).then(() => {
        dispatch(fetchAllInstallationTextsThunk(token));
      });
    } else {
      const order =
        texts.length > 0 ? Math.max(...texts.map((t) => t.order)) + 1 : 0;
      dispatch(
        createInstallationTextThunk({
          token,
          content,
          type,
          order,
        }),
      ).then(() => {
        dispatch(fetchAllInstallationTextsThunk(token));
      });
    }

    handleCloseDialog();
  }, [
    formData,
    editMode,
    currentId,
    token,
    texts,
    dispatch,
    handleCloseDialog,
  ]);

  const handleChange = useCallback(
    (
      e:
        | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
        | SelectChangeEvent<InstallationTextType>,
    ) => {
      const { name, value } = e.target;
      setFormData((prev) => ({
        ...prev,
        [name as string]: value,
      }));
    },
    [],
  );

  const handleDeleteClick = useCallback((id: number) => {
    setTextToDelete(id);
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (textToDelete !== null && token) {
      dispatch(deleteInstallationTextThunk({ token, id: textToDelete })).then(
        () => {
          dispatch(fetchAllInstallationTextsThunk(token));
        },
      );
    }
    setDeleteDialogOpen(false);
    setTextToDelete(null);
  }, [textToDelete, token, dispatch]);

  const handleDragEnd = useCallback(
    (result: any) => {
      if (!result.destination || !token) return;

      const items = Array.from(texts);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);

      const newOrderIds = items.map((item) => item.id);
      dispatch(
        reorderInstallationTextsThunk({ token, textIds: newOrderIds }),
      ).then(() => {
        dispatch(fetchAllInstallationTextsThunk(token));
      });
    },
    [texts, token, dispatch],
  );

  const getTextStyle = useCallback((type: InstallationTextType) => {
    switch (type) {
      case InstallationTextType.TITLE:
        return { fontWeight: 'bold', fontSize: '1.5rem' };
      case InstallationTextType.SUBTITLE:
        return { fontWeight: 'bold', fontSize: '1.3rem' };
      case InstallationTextType.SUBTITLE2:
        return { fontWeight: 'bold', fontSize: '1.1rem' };
      default:
        return { fontSize: '1rem' };
    }
  }, []);

  const getTextTypeTranslation = useCallback(
    (type: InstallationTextType): string => {
      switch (type) {
        case InstallationTextType.TITLE:
          return 'Titre';
        case InstallationTextType.SUBTITLE:
          return 'Sous-titre';
        case InstallationTextType.SUBTITLE2:
          return 'Sous-titre 2';
        case InstallationTextType.PARAGRAPH:
          return 'Paragraphe';
        default:
          return type;
      }
    },
    [],
  );

  const dialogTitle = useMemo(
    () => (editMode ? 'Modifier une section' : 'Ajouter une section'),
    [editMode],
  );

  const submitButtonText = useMemo(
    () => (editMode ? 'Mettre à jour' : 'Ajouter'),
    [editMode],
  );

  const emptyStateMessage = useMemo(
    () =>
      texts.length === 0 ? (
        <Box p={3} textAlign="center">
          <Typography color="text.secondary">
            Aucune instruction de préparation n'a été définie. Cliquez sur
            "Ajouter une section" pour commencer.
          </Typography>
        </Box>
      ) : null,
    [texts.length],
  );

  return (
    <Box sx={{ width: '100%' }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h5" component="h2">
          Texte de préparation d'installation
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          disabled={loading}
        >
          Ajouter une section
        </Button>
      </Box>

      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Utilisez cet éditeur pour modifier les instructions de préparation
          d'installation qui apparaîtront dans le bon de commande. Vous pouvez
          réorganiser les sections en les faisant glisser.
        </Typography>
      </Paper>

      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper elevation={3} sx={{ p: 0, overflow: 'hidden' }}>
          {emptyStateMessage}
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="texts">
              {(provided) => (
                <List {...provided.droppableProps} ref={provided.innerRef}>
                  {texts.map((text, index) => (
                    <Draggable
                      key={text.id}
                      draggableId={text.id.toString()}
                      index={index}
                    >
                      {(provided) => (
                        <ListItem
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          sx={{
                            borderBottom:
                              index < texts.length - 1
                                ? '1px solid #eee'
                                : 'none',
                            bgcolor:
                              index % 2 === 0 ? 'rgba(0,0,0,0.01)' : 'inherit',
                          }}
                        >
                          <Box
                            {...provided.dragHandleProps}
                            sx={{ mr: 1, color: 'text.secondary' }}
                          >
                            <DragHandleIcon />
                          </Box>
                          <ListItemText
                            primary={
                              <Typography
                                component="div"
                                sx={{
                                  ...getTextStyle(
                                    text.type as InstallationTextType,
                                  ),
                                  whiteSpace: 'pre-wrap',
                                }}
                              >
                                {text.content}
                              </Typography>
                            }
                            secondary={
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {getTextTypeTranslation(
                                  text.type as InstallationTextType,
                                )}
                              </Typography>
                            }
                          />
                          <ListItemSecondaryAction>
                            <IconButton
                              edge="end"
                              onClick={() => handleOpenDialog(text)}
                              aria-label="edit"
                              size="small"
                              sx={{ mr: 1 }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              edge="end"
                              onClick={() => handleDeleteClick(text.id)}
                              aria-label="delete"
                              size="small"
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </List>
              )}
            </Droppable>
          </DragDropContext>
        </Paper>
      )}

      {/* Add/Edit Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <FormControl fullWidth>
              <InputLabel id="text-type-label">Type</InputLabel>
              <Select
                labelId="text-type-label"
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                label="Type"
              >
                <MenuItem value={InstallationTextType.TITLE}>Titre</MenuItem>
                <MenuItem value={InstallationTextType.SUBTITLE}>
                  Sous-titre
                </MenuItem>
                <MenuItem value={InstallationTextType.SUBTITLE2}>
                  Sous-titre 2
                </MenuItem>
                <MenuItem value={InstallationTextType.PARAGRAPH}>
                  Paragraphe
                </MenuItem>
              </Select>
            </FormControl>

            <TextField
              autoFocus
              margin="dense"
              id="content"
              name="content"
              label="Contenu"
              type="text"
              fullWidth
              multiline
              rows={4}
              value={formData.content}
              onChange={handleChange}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {submitButtonText}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Êtes-vous sûr de vouloir supprimer cette section ? Cette action est
            irréversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
          <Button onClick={handleConfirmDelete} color="error">
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InstallationPreparationTextEditor;
