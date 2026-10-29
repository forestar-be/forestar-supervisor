'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type ColumnDef,
} from '@forestar-be/ui';
import {
  addRobotType,
  deleteRobotType,
  fetchRobotTypes,
  getStorage,
  updateStorageSettings,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { notifyError, notifySuccess } from '@/lib/notifications';
import { storageSizeSlots, type StorageSize } from '@/lib/storage';
import EditEntity from './edit-entity';

/**
 * Types de robot : mêmes règles qu'`EditEntity`, avec les endpoints dédiés et
 * la colonne « Taille rangement ». Un type large occupe deux places voisines du
 * rack ; c'est la taille proposée au dépôt, modifiable sur chaque fiche.
 */
export default function EditRobotType() {
  const { token } = useAuth();
  // Un type absent de la table du rangement (ajouté depuis) vaut standard.
  const [sizes, setSizes] = useState<Record<string, StorageSize>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const running = useRef(false);

  useEffect(() => {
    if (!token) return;
    getStorage(token)
      .then((data) =>
        setSizes(
          Object.fromEntries(
            (data.robotTypes ?? []).map((t) => [t.name, t.storageSize]),
          ),
        ),
      )
      .catch(() => notifyError('Erreur lors du chargement des tailles'));
  }, [token]);

  async function changeSize(name: string, storageSize: StorageSize) {
    if (!token || running.current) return;
    running.current = true;
    setSaving(name);
    try {
      await updateStorageSettings(token, {
        robotTypes: [{ name, storageSize }],
      });
      setSizes((current) => ({ ...current, [name]: storageSize }));
      notifySuccess(`Taille de rangement de « ${name} » enregistrée`);
    } catch {
      notifyError(
        `Impossible de modifier la taille de rangement de « ${name} »`,
      );
    } finally {
      running.current = false;
      setSaving(null);
    }
  }

  const sizeColumn: ColumnDef<string> = {
    id: 'storageSize',
    header: 'Taille rangement',
    enableSorting: false,
    cell: ({ row }) => {
      const name = row.original;
      const value = sizes[name] ?? 'STANDARD';
      return (
        <Select
          value={value}
          disabled={saving !== null}
          onValueChange={(next) => {
            if (next === 'STANDARD' || next === 'LARGE')
              void changeSize(name, next);
          }}
        >
          <SelectTrigger
            size="sm"
            className="w-32"
            aria-label={`Taille de rangement de ${name}`}
            onClick={(e) => e.stopPropagation()}
          >
            <SelectValue>{() => storageSizeSlots(value)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(['STANDARD', 'LARGE'] as const).map((size) => (
              <SelectItem
                key={size}
                value={size}
                label={storageSizeSlots(size)}
              >
                {storageSizeSlots(size)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    },
  };

  return (
    <EditEntity
      entityName="Type de robot"
      fetchEntities={fetchRobotTypes}
      addEntity={addRobotType}
      deleteEntity={deleteRobotType}
      extraColumns={[sizeColumn]}
    />
  );
}
