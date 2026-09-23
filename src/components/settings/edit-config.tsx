'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  addConfigAsync,
  deleteConfigAsync,
  fetchConfigAsync,
  updateConfigAsync,
} from '@/store/configSlice';
import { notifyError, notifySuccess } from '@/lib/notifications';
import type { ConfigElement } from '@/lib/types';
import {
  Button,
  ConfirmDialog,
  DataTable,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  Textarea,
  type ColumnDef,
} from '@forestar-be/ui';
import { Plus, Settings2, Trash2 } from 'lucide-react';

/**
 * Éditeur des clés de configuration libres (`config['États']`, taux
 * horaire…). Porté depuis `EditConfig.tsx` : mêmes actions (le store
 * `configSlice` ne notifie pas, c'est l'écran qui affiche succès/erreur).
 */
export default function EditConfig() {
  const { token } = useAuth();
  const dispatch = useAppDispatch();
  const { config: storeConfig, loading } = useAppSelector(
    (state) => state.config,
  );
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [element, setElement] = useState<ConfigElement>({ key: '', value: '' });
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!token) return;
    dispatch(fetchConfigAsync(token));
  }, [token, dispatch]);

  const config: ConfigElement[] = Object.entries(storeConfig || {}).map(
    ([key, value]) => ({ key, value: String(value) }),
  );

  const handleAdd = () => {
    setElement({ key: '', value: '' });
    setIsEditing(false);
    setOpen(true);
  };

  const handleEdit = (el: ConfigElement) => {
    setElement(el);
    setIsEditing(true);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!token || !element.key.trim()) return;
    try {
      setSaving(true);
      if (isEditing) {
        await dispatch(
          updateConfigAsync({ token, configElement: element }),
        ).unwrap();
        notifySuccess(`${element.key} mis à jour`);
      } else {
        await dispatch(addConfigAsync({ token, configElement: element })).unwrap();
        notifySuccess(`${element.key} sauvegardé`);
      }
      setOpen(false);
    } catch {
      notifyError(
        `Une erreur s'est produite lors de la sauvegarde de ${element.key}`,
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !toDelete) return;
    try {
      setDeleting(true);
      await dispatch(deleteConfigAsync({ token, key: toDelete })).unwrap();
      notifySuccess(`${toDelete} supprimé`);
      setToDelete(null);
    } catch {
      notifyError(`Une erreur s'est produite lors de la suppression du ${toDelete}`);
    } finally {
      setDeleting(false);
    }
  };

  const columns: ColumnDef<ConfigElement>[] = [
    { id: 'key', header: 'Nom', accessorKey: 'key' },
    {
      id: 'value',
      header: 'Valeur',
      accessorKey: 'value',
      cell: ({ getValue }) => (
        <span className="line-clamp-2 max-w-md">{getValue() as string}</span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(row.original);
            }}
          >
            Modifier
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-destructive hover:bg-destructive/10"
            aria-label="Supprimer"
            onClick={(e) => {
              e.stopPropagation();
              setToDelete(row.original.key);
            }}
          >
            <Trash2 />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {config.length} élément(s) de configuration
        </p>
        <Button size="sm" onClick={handleAdd}>
          <Plus />
          Ajouter un élément de configuration
        </Button>
      </div>

      {!loading && config.length === 0 ? (
        <EmptyState icon={Settings2} title="Aucun élément de configuration" />
      ) : (
        <DataTable
          columns={columns}
          data={config}
          loading={loading}
          getRowId={(row) => row.key}
          emptyMessage="Aucun élément"
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Modifier' : 'Ajouter'} un élément de configuration
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Nom</Label>
              <Input
                autoFocus
                value={element.key}
                disabled={isEditing}
                onChange={(e) => setElement({ ...element, key: e.target.value })}
              />
            </div>
            <div>
              <Label>Valeur</Label>
              <Textarea
                value={element.value}
                onChange={(e) => setElement({ ...element, value: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving || !element.key.trim()}>
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer l'élément"
        message={`Êtes-vous sûr de vouloir supprimer ${toDelete ?? 'cet élément'} ?`}
        type="delete"
        confirmText="Supprimer"
        isLoading={deleting}
        onConfirm={handleDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
