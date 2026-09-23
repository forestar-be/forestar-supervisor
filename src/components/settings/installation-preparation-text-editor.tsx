'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  createInstallationTextThunk,
  deleteInstallationTextThunk,
  fetchAllInstallationTextsThunk,
  reorderInstallationTextsThunk,
  updateInstallationTextThunk,
} from '@/store/installationTextsSlice';
import { notifyError, notifySuccess } from '@/lib/notifications';
import {
  InstallationPreparationText,
  InstallationTextType,
} from '@/lib/types';
import {
  Button,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SortableList,
  SortableListHandle,
  Spinner,
  Textarea,
} from '@forestar-be/ui';
import { FileText, Pencil, Plus, Trash2 } from 'lucide-react';

const TEXT_TYPE_LABELS: Record<InstallationTextType, string> = {
  [InstallationTextType.TITLE]: 'Titre',
  [InstallationTextType.SUBTITLE]: 'Sous-titre',
  [InstallationTextType.SUBTITLE2]: 'Sous-titre 2',
  [InstallationTextType.PARAGRAPH]: 'Paragraphe',
};

const TEXT_STYLE: Record<InstallationTextType, string> = {
  [InstallationTextType.TITLE]: 'text-2xl font-bold',
  [InstallationTextType.SUBTITLE]: 'text-xl font-bold',
  [InstallationTextType.SUBTITLE2]: 'text-lg font-bold',
  [InstallationTextType.PARAGRAPH]: 'text-base',
};

/**
 * Éditeur du texte de préparation d'installation, porté depuis
 * `InstallationPreparationTextEditor.tsx`. Le réordonnancement passait par
 * `@hello-pangea/dnd` ; il passe désormais par `SortableList`. Les thunks du
 * store ne notifient plus : succès et erreur s'affichent ici.
 */
export default function InstallationPreparationTextEditor() {
  const dispatch = useAppDispatch();
  const { texts, loading } = useAppSelector((state) => state.installationTexts);
  const { token } = useAuth();

  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [content, setContent] = useState('');
  const [type, setType] = useState<InstallationTextType>(
    InstallationTextType.PARAGRAPH,
  );
  const [saving, setSaving] = useState(false);
  const [textToDelete, setTextToDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!token) return;
    dispatch(fetchAllInstallationTextsThunk(token))
      .unwrap()
      .catch(() =>
        notifyError('Erreur lors du chargement des textes de préparation'),
      );
  }, [token, dispatch]);

  const resetForm = () => {
    setContent('');
    setType(InstallationTextType.PARAGRAPH);
    setEditMode(false);
    setCurrentId(null);
  };

  const handleOpenDialog = (text?: InstallationPreparationText) => {
    if (text) {
      setContent(text.content);
      setType(text.type);
      setEditMode(true);
      setCurrentId(text.id);
    } else {
      resetForm();
    }
    setOpenDialog(true);
  };

  const handleSubmit = async () => {
    if (!content.trim() || !token) return;
    try {
      setSaving(true);
      if (editMode && currentId !== null) {
        await dispatch(
          updateInstallationTextThunk({ token, id: currentId, updates: { content, type } }),
        ).unwrap();
        notifySuccess('Section mise à jour');
      } else {
        const order = texts.length > 0 ? Math.max(...texts.map((t) => t.order)) + 1 : 0;
        await dispatch(
          createInstallationTextThunk({ token, content, type, order }),
        ).unwrap();
        notifySuccess('Section ajoutée');
      }
      setOpenDialog(false);
      resetForm();
    } catch {
      notifyError("Une erreur s'est produite lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (textToDelete === null || !token) return;
    try {
      setDeleting(true);
      await dispatch(deleteInstallationTextThunk({ token, id: textToDelete })).unwrap();
      notifySuccess('Section supprimée');
      setTextToDelete(null);
    } catch {
      notifyError("Une erreur s'est produite lors de la suppression");
    } finally {
      setDeleting(false);
    }
  };

  const handleReorder = async (next: InstallationPreparationText[]) => {
    if (!token) return;
    try {
      await dispatch(
        reorderInstallationTextsThunk({ token, textIds: next.map((t) => t.id) }),
      ).unwrap();
    } catch {
      notifyError("Une erreur s'est produite lors du réordonnancement");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">
            Texte de préparation d&apos;installation
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Réorganisez les sections en les faisant glisser par leur poignée.
            Elles apparaîtront dans cet ordre sur le bon de commande.
          </p>
        </div>
        <Button size="sm" disabled={loading} onClick={() => handleOpenDialog()}>
          <Plus />
          Ajouter une section
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : texts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Aucune instruction de préparation"
          description="Cliquez sur « Ajouter une section » pour commencer."
        />
      ) : (
        <SortableList
          items={texts}
          getId={(t) => String(t.id)}
          onReorder={handleReorder}
          renderItem={(text, state) => (
            <div
              className={`flex items-start gap-2 rounded-lg border border-border bg-card p-3 ${
                state.isDragging ? 'opacity-60' : ''
              }`}
            >
              <SortableListHandle
                {...state.handleProps}
                aria-label="Réordonner"
                className="mt-1 shrink-0 cursor-grab text-muted-foreground"
              />
              <div className="min-w-0 flex-1">
                <p className={`whitespace-pre-wrap ${TEXT_STYLE[text.type]}`}>
                  {text.content}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {TEXT_TYPE_LABELS[text.type]}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Modifier"
                onClick={() => handleOpenDialog(text)}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:bg-destructive/10"
                aria-label="Supprimer"
                onClick={() => setTextToDelete(text.id)}
              >
                <Trash2 />
              </Button>
            </div>
          )}
        />
      )}

      <Dialog
        open={openDialog}
        onOpenChange={(v) => {
          setOpenDialog(v);
          if (!v) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editMode ? 'Modifier une section' : 'Ajouter une section'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(v) => v && setType(v as InstallationTextType)}
              >
                <SelectTrigger>
                  <SelectValue>
                    {(v: string) => TEXT_TYPE_LABELS[v as InstallationTextType] ?? v}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.values(InstallationTextType).map((t) => (
                    <SelectItem key={t} value={t}>
                      {TEXT_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Contenu</Label>
              <Textarea
                autoFocus
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={saving || !content.trim()}>
              {editMode ? 'Mettre à jour' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={textToDelete !== null}
        title="Confirmer la suppression"
        message="Êtes-vous sûr de vouloir supprimer cette section ? Cette action est irréversible."
        type="delete"
        confirmText="Supprimer"
        isLoading={deleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setTextToDelete(null)}
      />
    </div>
  );
}
