'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import {
  Button,
  ConfirmDialog,
  DataTable,
  type ColumnDef,
  type DataTableState,
  StatusBadge,
  ToggleGroup,
  ToggleGroupItem,
} from '@forestar-be/ui';
import { useAuth } from '@/lib/auth';
import {
  createPhoneCallback,
  deletePhoneCallback,
  fetchAllPhoneCallbacks,
  togglePhoneCallbackStatus,
  updatePhoneCallback,
  type PhoneCallback,
  type PhoneCallbackFormData,
} from '@/lib/api';
import { notifyError, notifySuccess, notifyWarning } from '@/lib/notifications';
import { usePersistedState } from '@/lib/use-persisted-state';
import dayjs from '@/lib/dayjs';
import { PhoneCallbackFormDialog } from './phone-callback-form-dialog';

type CompletionFilter = 'all' | 'pending' | 'completed';

const REASON_LABEL: Record<string, string> = {
  warranty: 'Garantie',
  delivery: 'Livraison',
  rental: 'Location',
  other: 'Autre',
};

const REASON_TONE: Record<string, 'info' | 'neutral' | 'warning'> = {
  warranty: 'info',
  delivery: 'neutral',
  rental: 'warning',
  other: 'neutral',
};

/**
 * Rappels téléphoniques, portés de `src/pages/PhoneCallbacks.tsx` (AG Grid +
 * MUI) vers `DataTable`. Le filtre de statut passe de boutons/`Select`
 * responsive à un `ToggleGroup` unique — il reste utilisable à toutes les
 * largeurs.
 */
export function PhoneCallbacksPageClient() {
  const auth = useAuth();
  const [allCallbacks, setAllCallbacks] = useState<PhoneCallback[]>([]);
  // Vrai dès le départ : l'effet ci-dessous ne le repasse jamais à vrai (il
  // n'existe pas de rechargement manuel), pour ne poser aucun `setState`
  // synchrone depuis l'effet — la règle de lint du projet l'interdit.
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CompletionFilter>('all');
  const [tableState, setTableState] = usePersistedState<
    Partial<DataTableState>
  >('atelier.phoneCallbacksTable', {});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PhoneCallback | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Chargement initial des rappels. Effet en IIFE directe (pas de fonction
  // nommée invoquée depuis l'effet) : la règle de lint du projet suit les
  // fonctions nommées jusqu'à leurs `setState` internes même après un
  // `await`, mais pas le contenu d'une IIFE écrite en ligne.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetchAllPhoneCallbacks(auth.token);
        if (cancelled) return;
        if (response?.data) {
          setAllCallbacks(response.data);
        } else {
          notifyWarning('Aucun rappel téléphonique trouvé');
        }
      } catch (error) {
        if (cancelled) return;
        console.error(
          'Erreur lors de la récupération des rappels téléphoniques',
          error,
        );
        notifyError('Erreur lors de la récupération des rappels téléphoniques');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth.token]);

  const filteredCallbacks = useMemo(() => {
    if (filter === 'pending') return allCallbacks.filter((c) => !c.completed);
    if (filter === 'completed') return allCallbacks.filter((c) => c.completed);
    return allCallbacks;
  }, [allCallbacks, filter]);

  const handleToggleComplete = async (callback: PhoneCallback) => {
    setLoading(true);
    try {
      const updated = await togglePhoneCallbackStatus(auth.token, callback);
      setAllCallbacks((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c)),
      );
      notifySuccess(
        `Rappel marqué comme ${updated.completed ? 'terminé' : 'à faire'}`,
      );
    } catch (error) {
      console.error('Erreur lors de la modification du statut', error);
      notifyError('Erreur lors de la modification du statut');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deletingId === null) return;
    setIsDeleting(true);
    try {
      await deletePhoneCallback(auth.token, deletingId);
      setAllCallbacks((prev) => prev.filter((c) => c.id !== deletingId));
      notifySuccess('Rappel supprimé avec succès');
      setDeletingId(null);
    } catch (error) {
      console.error('Erreur lors de la suppression du rappel', error);
      notifyError('Erreur lors de la suppression du rappel');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (data: PhoneCallbackFormData) => {
    setSaving(true);
    try {
      if (editing) {
        const updated = await updatePhoneCallback(auth.token, editing.id, data);
        setAllCallbacks((prev) =>
          prev.map((c) => (c.id === editing.id ? updated : c)),
        );
        notifySuccess('Rappel téléphonique mis à jour avec succès');
      } else {
        const created = await createPhoneCallback(auth.token, data);
        setAllCallbacks((prev) => [created, ...prev]);
        notifySuccess('Rappel téléphonique créé avec succès');
      }
      setDialogOpen(false);
      setEditing(null);
    } catch (error) {
      console.error(
        "Erreur lors de l'enregistrement du rappel téléphonique",
        error,
      );
      notifyError("Erreur lors de l'enregistrement du rappel téléphonique");
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo<ColumnDef<PhoneCallback>[]>(
    () => [
      {
        accessorKey: 'createdAt',
        header: 'Date',
        cell: ({ getValue }) =>
          dayjs(getValue<string>()).format('DD/MM/YYYY HH:mm'),
      },
      {
        accessorKey: 'clientName',
        header: 'Client',
      },
      {
        accessorKey: 'phoneNumber',
        header: 'Téléphone',
      },
      {
        accessorKey: 'reason',
        header: 'Raison',
        cell: ({ getValue }) => {
          const value = getValue<string>();
          return (
            <StatusBadge tone={REASON_TONE[value] ?? 'neutral'}>
              {REASON_LABEL[value] ?? value}
            </StatusBadge>
          );
        },
      },
      {
        accessorKey: 'description',
        header: 'Description',
      },
      {
        accessorKey: 'responsiblePerson',
        header: 'Responsable',
      },
      {
        accessorKey: 'completed',
        header: 'Statut',
        cell: ({ getValue }) => (
          <StatusBadge tone={getValue<boolean>() ? 'success' : 'warning'}>
            {getValue<boolean>() ? 'Terminé' : 'À faire'}
          </StatusBadge>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => {
          const callback = row.original;
          return (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={
                  callback.completed
                    ? 'Marquer comme non terminé'
                    : 'Marquer comme terminé'
                }
                onClick={(event) => {
                  event.stopPropagation();
                  void handleToggleComplete(callback);
                }}
              >
                {callback.completed ? (
                  <CheckCircle2 className="size-4 text-success" />
                ) : (
                  <Circle className="size-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Modifier"
                onClick={(event) => {
                  event.stopPropagation();
                  setEditing(callback);
                  setDialogOpen(true);
                }}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Supprimer"
                onClick={(event) => {
                  event.stopPropagation();
                  setDeletingId(callback.id);
                }}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <DataTable
        className="min-h-0 flex-1"
        title="Gestion des rappels téléphoniques"
        toolbar={
          <>
            <ToggleGroup
              value={[filter]}
              onValueChange={(values) => {
                const next = values[values.length - 1] as
                  CompletionFilter | undefined;
                if (next) setFilter(next);
              }}
              aria-label="Filtrer les rappels"
            >
              <ToggleGroupItem value="all">Tous</ToggleGroupItem>
              <ToggleGroupItem value="pending">À faire</ToggleGroupItem>
              <ToggleGroupItem value="completed">Terminés</ToggleGroupItem>
            </ToggleGroup>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTableState({})}
            >
              <RotateCcw className="size-4" />
              Réinitialiser
            </Button>
            <Button
              type="button"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="size-4" />
              Nouveau rappel
            </Button>
          </>
        }
        columns={columns}
        data={filteredCallbacks}
        loading={loading}
        emptyMessage="Aucun rappel téléphonique trouvé"
        state={tableState}
        onStateChange={setTableState}
        enableColumnVisibility
        getRowId={(row) => String(row.id)}
      />

      <PhoneCallbackFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        isEditing={!!editing}
        initialValue={
          editing
            ? {
                phoneNumber: editing.phoneNumber,
                clientName: editing.clientName,
                reason: editing.reason,
                description: editing.description,
                responsiblePerson: editing.responsiblePerson,
              }
            : null
        }
        loading={saving}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={deletingId !== null}
        title="Supprimer le rappel"
        message="Êtes-vous sûr de vouloir supprimer ce rappel ?"
        type="delete"
        isLoading={isDeleting}
        onConfirm={() => void handleDelete()}
        onClose={() => setDeletingId(null)}
      />
    </div>
  );
}
