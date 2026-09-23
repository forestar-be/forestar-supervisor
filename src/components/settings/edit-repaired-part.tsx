'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import {
  deleteReplacedPart,
  fetchReplacedParts,
  putReplacedParts,
} from '@/lib/api';
import { notifyError, notifySuccess } from '@/lib/notifications';
import { formatCurrency } from '@/lib/invoice';
import type { ReplacedPart } from '@/lib/types';
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
import { Plus, Trash2, Wrench } from 'lucide-react';

/**
 * Catalogue des pièces remplacées, portée depuis `EditRepairedPart.tsx` :
 * la liste entière est réécrite à chaque sauvegarde (`putReplacedParts`),
 * comme le faisait l'ancien code.
 */
export default function EditRepairedPart() {
  const { token } = useAuth();
  const [parts, setParts] = useState<ReplacedPart[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<ReplacedPart | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<ReplacedPart | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchReplacedParts(token)
      .then(setParts)
      .catch(() =>
        notifyError(
          "Une erreur s'est produite lors de la récupération des pièces",
        ),
      )
      .finally(() => setLoading(false));
  }, [token]);

  const handleAdd = () => {
    setSelectedPart(null);
    setName('');
    setPrice(0);
    setOpen(true);
  };

  const handleEdit = (part: ReplacedPart) => {
    setSelectedPart(part);
    setName(part.name);
    setPrice(part.price);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!token || !name.trim()) return;
    const newPart = { name: name.trim(), price };
    const updated = selectedPart
      ? parts.map((p) => (p === selectedPart ? newPart : p))
      : [...parts, newPart];
    try {
      setSaving(true);
      await putReplacedParts(token, updated);
      setParts(updated);
      notifySuccess('Données sauvegardées avec succès');
      setOpen(false);
    } catch {
      notifyError(
        "Une erreur s'est produite lors de la sauvegarde des données",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !toDelete) return;
    try {
      setDeleting(true);
      await deleteReplacedPart(token, toDelete.name);
      setParts((prev) => prev.filter((p) => p !== toDelete));
      notifySuccess('Pièce supprimée avec succès');
      setToDelete(null);
    } catch {
      notifyError(
        "Une erreur s'est produite lors de la suppression de la pièce",
      );
    } finally {
      setDeleting(false);
    }
  };

  const columns: ColumnDef<ReplacedPart>[] = [
    { id: 'name', header: 'Nom', accessorKey: 'name' },
    {
      id: 'price',
      header: 'Prix',
      accessorKey: 'price',
      cell: ({ getValue }) => formatCurrency(getValue() as number),
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
              setToDelete(row.original);
            }}
          >
            <Trash2 />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={handleAdd}>
          <Plus />
          Ajouter une pièce
        </Button>
      </div>

      {!loading && parts.length === 0 ? (
        <EmptyState icon={Wrench} title="Aucune pièce enregistrée" />
      ) : (
        <DataTable
          className="min-h-0 flex-1"
          columns={columns}
          data={parts}
          loading={loading}
          getRowId={(row) => row.name}
          emptyMessage="Aucune pièce"
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedPart ? 'Modifier' : 'Ajouter'} une pièce
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Nom</Label>
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label>Prix</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer la pièce"
        message={`Voulez-vous vraiment supprimer la pièce ${toDelete?.name ?? ''} ?`}
        type="delete"
        confirmText="Supprimer"
        isLoading={deleting}
        onConfirm={handleDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
