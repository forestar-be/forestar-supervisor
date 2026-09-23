'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { notifyError, notifySuccess } from '@/lib/notifications';
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
  type ColumnDef,
} from '@forestar-be/ui';
import { List, Plus, Trash2 } from 'lucide-react';

type Entity = string;

interface EditEntityProps {
  entityName: string;
  fetchEntities: (token: string) => Promise<Entity[]>;
  addEntity: (token: string, entity: Entity) => Promise<unknown>;
  deleteEntity: (token: string, entity: Entity) => Promise<unknown>;
}

/**
 * Éditeur générique d'une liste de référentiels simples (réparateurs,
 * marques, types de machine, types de robot) — un nom, ajout et suppression.
 * Porté depuis `EditEntity.tsx` (AG Grid + `window.confirm`) vers `DataTable`
 * et `ConfirmDialog`.
 */
export default function EditEntity({
  entityName,
  fetchEntities,
  addEntity,
  deleteEntity,
}: EditEntityProps) {
  const { token } = useAuth();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [entity, setEntity] = useState('');
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Entity | null>(null);
  const [deleting, setDeleting] = useState(false);

  const reload = async () => {
    if (!token) return;
    try {
      const result = await fetchEntities(token);
      setEntities(result);
    } catch {
      notifyError(
        `Erreur lors du chargement de la liste (${entityName.toLowerCase()})`,
      );
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchEntities(token)
      .then(setEntities)
      .catch(() =>
        notifyError(
          `Erreur lors du chargement de la liste (${entityName.toLowerCase()})`,
        ),
      )
      .finally(() => setLoading(false));
    // Chargement initial uniquement : `reload()` sert aux rafraîchissements
    // déclenchés par les actions ci-dessous.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleAdd = async () => {
    if (!token || !entity.trim()) return;
    try {
      setSaving(true);
      await addEntity(token, entity.trim());
      notifySuccess(`${entityName} sauvegardé`);
      setOpen(false);
      setEntity('');
      await reload();
    } catch {
      notifyError(
        `Une erreur s'est produite lors de la sauvegarde du ${entityName.toLowerCase()}`,
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !toDelete) return;
    try {
      setDeleting(true);
      await deleteEntity(token, toDelete);
      notifySuccess(`${entityName} supprimé`);
      setToDelete(null);
      await reload();
    } catch {
      notifyError(
        `Une erreur s'est produite lors de la suppression du ${entityName.toLowerCase()}`,
      );
    } finally {
      setDeleting(false);
    }
  };

  const columns: ColumnDef<Entity>[] = [
    {
      id: 'name',
      header: entityName,
      accessorFn: (row) => row,
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-destructive hover:bg-destructive/10"
          aria-label="Supprimer"
          onClick={(e) => {
            e.stopPropagation();
            setToDelete(row.original);
          }}
        >
          <Trash2 />
        </Button>
      ),
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {entities.length} élément(s)
        </p>
        <Button
          size="sm"
          onClick={() => {
            setEntity('');
            setOpen(true);
          }}
        >
          <Plus />
          Ajouter {entityName.toLowerCase()}
        </Button>
      </div>

      {!loading && entities.length === 0 ? (
        <EmptyState
          icon={List}
          title={`Aucun élément « ${entityName.toLowerCase()} »`}
        />
      ) : (
        <DataTable
          className="min-h-0 flex-1"
          columns={columns}
          data={entities}
          loading={loading}
          getRowId={(row) => row}
          emptyMessage="Aucun élément"
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter {entityName.toLowerCase()}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label>{entityName}</Label>
            <Input
              autoFocus
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAdd} disabled={saving || !entity.trim()}>
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={toDelete !== null}
        title={`Supprimer ${entityName.toLowerCase()}`}
        message={`Êtes-vous sûr de vouloir supprimer ${toDelete ? `« ${toDelete} »` : 'cet élément'} ?`}
        type="delete"
        confirmText="Supprimer"
        isLoading={deleting}
        onConfirm={handleDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
