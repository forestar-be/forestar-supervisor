'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  Button,
  Checkbox,
  ConfirmDialog,
  Input,
  Spinner,
} from '@forestar-be/ui';
import {
  getStorage,
  addStorageRack,
  deactivateStorageRack,
  updateStorageSettings,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { StorageOverview } from '@/lib/storage';

export function StorageSettings({
  data,
  token,
  onSaved,
}: {
  data: StorageOverview;
  token: string;
  onSaved: () => Promise<unknown>;
}) {
  return (
    <section
      aria-label="Paramètres du rangement"
      className="rounded-lg border bg-card p-4"
    >
      <h2 className="font-medium">Paramètres du rangement</h2>
      <SettingsForm
        key={JSON.stringify([
          data.settings,
          data.machineTypes,
          data.racks.map((r) => [r.id, r.active]),
        ])}
        data={data}
        token={token}
        onSaved={onSaved}
      />
    </section>
  );
}
function SettingsForm({
  data,
  token,
  onSaved,
}: {
  data: StorageOverview;
  token: string;
  onSaved: () => Promise<unknown>;
}) {
  const [settings, setSettings] = useState(data.settings);
  const [types, setTypes] = useState(data.machineTypes);
  const maxRacksId = useId();
  const [maxRacks, setMaxRacks] = useState(
    data.settings.maxRacks === null ? '' : String(data.settings.maxRacks),
  );
  const maxRacksValue = maxRacks.trim() === '' ? null : Number(maxRacks);
  const maxRacksInvalid =
    maxRacksValue !== null &&
    (!Number.isInteger(maxRacksValue) || maxRacksValue <= 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deactivate, setDeactivate] = useState<number | null>(null);
  const running = useRef(false);
  async function mutate(action: () => Promise<unknown>) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError('');
    try {
      await action();
      setDeactivate(null);
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Modification impossible.');
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="mt-4 flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Définissez les types de machines concernés et les racks disponibles à
        l’atelier.
      </p>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      <label className="flex items-center gap-2">
        <Checkbox
          checked={settings.enabled}
          disabled={busy}
          onCheckedChange={(checked) =>
            setSettings({ ...settings, enabled: checked === true })
          }
        />
        Activer le rangement et les nouveaux dépôts
      </label>
      <label className="flex items-center gap-2">
        <Checkbox
          checked={settings.allowOverflow}
          disabled={busy}
          onCheckedChange={(checked) =>
            setSettings({ ...settings, allowOverflow: checked === true })
          }
        />
        Autoriser un dépôt sans emplacement quand le maximum de racks est
        atteint
      </label>
      <div className="flex flex-col gap-1">
        <label htmlFor={maxRacksId}>Nombre maximum de racks</label>
        <Input
          id={maxRacksId}
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          className="w-32"
          placeholder="Sans limite"
          value={maxRacks}
          disabled={busy}
          aria-invalid={maxRacksInvalid}
          onChange={(e) => setMaxRacks(e.target.value)}
        />
        <span className="text-sm text-muted-foreground">
          Quand toutes les places sont prises, un rack est ajouté
          automatiquement tant que ce nombre n’est pas atteint. Vide : sans
          limite.
        </span>
        {maxRacksInvalid && (
          <span className="text-sm text-destructive">
            Entrez un nombre entier positif, ou laissez vide.
          </span>
        )}
      </div>
      <fieldset className="space-y-2">
        <legend className="mb-2 font-medium">
          Types de machines qui sont des robots
        </legend>
        {types.map((type) => (
          <label key={type.name} className="flex items-center gap-2">
            <Checkbox
              checked={type.isRobot}
              disabled={busy}
              onCheckedChange={(checked) =>
                setTypes(
                  types.map((item) =>
                    item.name === type.name
                      ? { ...item, isRobot: checked === true }
                      : item,
                  ),
                )
              }
            />
            {type.name}
          </label>
        ))}
      </fieldset>
      <Button
        className="self-start"
        disabled={busy || maxRacksInvalid}
        onClick={() =>
          void mutate(() =>
            updateStorageSettings(token, {
              enabled: settings.enabled,
              allowOverflow: settings.allowOverflow,
              maxRacks: maxRacksValue,
              machineTypes: types,
            }),
          )
        }
      >
        Enregistrer les paramètres
      </Button>
      <div>
        <h3 className="mb-2 font-medium">Racks · 4 étages × 3 places</h3>
        <ul className="space-y-2">
          {data.racks.map((rack) => (
            <li key={rack.id} className="flex flex-wrap items-center gap-3">
              <span>
                Rack {rack.number}
                {!rack.active ? ' · Désactivé' : ''}
              </span>
              {rack.active && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || rack.slots.some((slot) => !!slot.repair)}
                  onClick={() => setDeactivate(rack.id)}
                >
                  Désactiver le rack {rack.number}
                </Button>
              )}
              {rack.active && rack.slots.some((slot) => !!slot.repair) && (
                <span className="text-sm text-muted-foreground">
                  Occupé : désactivation impossible
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
      <Button
        variant="outline"
        className="self-start"
        disabled={busy}
        onClick={() => void mutate(() => addStorageRack(token))}
      >
        Ajouter un rack
      </Button>
      <ConfirmDialog
        open={deactivate !== null}
        title="Désactiver ce rack vide ?"
        message="Les références historiques sont conservées. Les autres racks gardent leur numéro."
        isLoading={busy}
        confirmText="Désactiver"
        onClose={() => {
          if (!busy) setDeactivate(null);
        }}
        onConfirm={() => {
          if (deactivate !== null)
            void mutate(() => deactivateStorageRack(token, deactivate));
        }}
      />
    </div>
  );
}

export function StorageSettingsPage() {
  const { token } = useAuth();
  const [data, setData] = useState<StorageOverview | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setData(await getStorage(token));
  }, [token]);
  useEffect(() => {
    let active = true;
    getStorage(token)
      .then((value) => {
        if (active) setData(value);
      })
      .catch(() => {
        if (active)
          setError('Impossible de charger les paramètres du rangement.');
      });
    return () => {
      active = false;
    };
  }, [token]);
  if (error) return <p role="alert">{error}</p>;
  return data ? (
    <StorageSettings data={data} token={token} onSaved={load} />
  ) : (
    <Spinner />
  );
}
