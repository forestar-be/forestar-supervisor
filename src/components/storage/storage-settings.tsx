'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  Bot,
  LockKeyhole,
  Plus,
  Save,
  Settings2,
  Snowflake,
  Warehouse,
} from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Button,
  Checkbox,
  ConfirmDialog,
  Input,
  Spinner,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@forestar-be/ui';
import {
  getStorage,
  addStorageRack,
  deactivateStorageRack,
  activateStorageRack,
  changeStorageRackCategory,
  updateStorageSettings,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { StorageOverview } from '@/lib/storage';
import { rackCategoryAppearance } from './storage-rack-appearance';

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
    <section aria-label="Paramètres du rangement" className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary">
          <Warehouse className="size-6" aria-hidden />
        </span>
        <h2 className="text-lg font-semibold">Paramètres du rangement</h2>
      </div>
      <SettingsForm
        key={JSON.stringify([
          data.settings,
          data.machineTypes,
          data.racks.map((r) => [r.id, r.active, r.category]),
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
  const [newWinter, setNewWinter] = useState(false);
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
    <div className="space-y-5">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)]">
        <section
          className="min-w-0 rounded-2xl border bg-card shadow-sm"
          aria-label="Configuration du rangement"
        >
          <div className="flex items-center gap-2 border-b px-5 py-4">
            <Settings2 className="size-4 text-primary" aria-hidden />
            <h3 className="font-semibold">Configuration</h3>
          </div>
          <div className="space-y-5 p-5">
            <div className="space-y-4">
              <label className="flex cursor-pointer items-start justify-between gap-4">
                <span className="min-w-0">
                  <span className="block text-sm font-medium">
                    Activer le rangement
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    Autoriser les nouveaux dépôts.
                  </span>
                </span>
                <Switch
                  className="mt-1"
                  checked={settings.enabled}
                  disabled={busy}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, enabled: checked })
                  }
                />
              </label>
              <label className="flex cursor-pointer items-start justify-between gap-4 border-t pt-4">
                <span className="min-w-0">
                  <span className="block text-sm font-medium">
                    Dépôts sans emplacement
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    Les autoriser quand la limite de racks est atteinte.
                  </span>
                </span>
                <Switch
                  className="mt-1"
                  checked={settings.allowOverflow}
                  disabled={busy}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, allowOverflow: checked })
                  }
                />
              </label>
            </div>
            <div className="space-y-2 border-t pt-5">
              <label htmlFor={maxRacksId} className="block text-sm font-medium">
                Nombre maximum de racks
              </label>
              <Input
                id={maxRacksId}
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                className="w-full"
                placeholder="Sans limite"
                value={maxRacks}
                disabled={busy}
                aria-invalid={maxRacksInvalid}
                aria-describedby={`${maxRacksId}-hint`}
                onChange={(e) => setMaxRacks(e.target.value)}
              />
              <p
                id={`${maxRacksId}-hint`}
                className="text-sm text-muted-foreground"
              >
                Création automatique quand les places sont prises. Limite
                commune aux deux zones. Vide : sans limite.
              </p>
              {maxRacksInvalid && (
                <p className="text-sm text-destructive">
                  Entrez un nombre entier positif, ou laissez vide.
                </p>
              )}
            </div>
            <fieldset className="min-w-0 border-t pt-5">
              <legend className="flex items-center gap-2 pr-2 text-sm font-semibold">
                <Bot className="size-4 text-primary" aria-hidden />
                Machines à ranger
              </legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {types.map((type) => (
                  <label
                    key={type.name}
                    className={`flex min-w-0 cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-sm transition-colors ${type.isRobot ? 'border-primary/25 bg-primary/5' : 'border-border bg-muted/15 hover:bg-muted/40'}`}
                  >
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
                    <span className="min-w-0 break-words">{type.name}</span>
                  </label>
                ))}
              </div>
              {!types.length && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Aucun type de machine configuré.
                </p>
              )}
            </fieldset>
          </div>
          <div className="border-t p-4 sm:px-5">
            <Button
              className="h-auto min-h-10 w-full whitespace-normal"
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
              <Save className="size-4 shrink-0" aria-hidden />
              Enregistrer les paramètres
            </Button>
          </div>
        </section>
        <section
          className="min-w-0 overflow-hidden rounded-2xl border bg-card shadow-sm"
          aria-label="Gestion des racks"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b p-4 sm:px-5">
            <div>
              <h3 className="font-semibold">Racks</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                12 places · 4 étages × 3 positions
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={newWinter}
                  disabled={busy}
                  onCheckedChange={(checked) => setNewWinter(checked === true)}
                />
                <Snowflake
                  className="size-4 text-sky-800 dark:text-sky-200"
                  aria-hidden
                />
                Hivernage
              </label>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void mutate(() =>
                    addStorageRack(token, newWinter ? 'HIVERNAGE' : 'ATELIER'),
                  )
                }
              >
                <Plus className="size-4" aria-hidden />
                Ajouter un rack
              </Button>
            </div>
          </div>
          <Table aria-label="Racks" className="text-xs sm:text-sm">
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="px-1.5 sm:px-5">Numéro</TableHead>
                <TableHead className="px-1.5 text-center sm:px-3">
                  <span className="sr-only sm:not-sr-only">Hivernage</span>
                  <Snowflake
                    className="mx-auto size-4 text-sky-800 sm:hidden dark:text-sky-200"
                    aria-hidden
                  />
                </TableHead>
                <TableHead className="px-1.5 sm:px-3">Statut</TableHead>
                <TableHead className="px-1.5 text-right sm:px-5">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.racks.map((rack) => {
                const occupied = rack.slots.some((slot) => !!slot.repair);
                const appearance = rackCategoryAppearance(rack.category);
                const Icon = appearance.Icon;
                return (
                  <TableRow key={rack.id}>
                    <TableCell className="px-1.5 py-2 font-semibold sm:px-5">
                      <span className="flex items-center gap-2.5">
                        <span
                          className={`hidden size-8 shrink-0 items-center justify-center rounded-lg sm:flex ${appearance.axis} ${appearance.foreground}`}
                        >
                          <Icon className="size-4" aria-hidden />
                        </span>
                        <span className={appearance.foreground}>
                          R{rack.number}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="px-1.5 py-2 text-center sm:px-3">
                      <Checkbox
                        className="mx-auto"
                        aria-label={`Hivernage du rack ${rack.number}`}
                        checked={rack.category === 'HIVERNAGE'}
                        disabled={busy || occupied}
                        title={
                          occupied
                            ? 'Videz le rack avant de changer son usage.'
                            : undefined
                        }
                        onCheckedChange={(checked) =>
                          void mutate(() =>
                            changeStorageRackCategory(
                              token,
                              rack.id,
                              checked === true ? 'HIVERNAGE' : 'ATELIER',
                            ),
                          )
                        }
                      />
                    </TableCell>
                    <TableCell className="px-1.5 py-2 sm:px-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium sm:px-2 ${rack.active ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200' : 'bg-muted text-muted-foreground'}`}
                      >
                        <span
                          className={`hidden size-1.5 rounded-full sm:block ${rack.active ? 'bg-emerald-700 dark:bg-emerald-300' : 'bg-muted-foreground'}`}
                          aria-hidden
                        />
                        {rack.active ? 'Activé' : 'Désactivé'}
                      </span>
                    </TableCell>
                    <TableCell className="px-1.5 py-2 text-right sm:px-5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 text-xs sm:min-w-24 sm:text-sm"
                        aria-label={`${rack.active ? 'Désactiver' : 'Activer'} le rack ${rack.number}`}
                        disabled={busy || (rack.active && occupied)}
                        title={
                          rack.active && occupied
                            ? 'Videz le rack avant de le désactiver.'
                            : undefined
                        }
                        onClick={() =>
                          rack.active
                            ? setDeactivate(rack.id)
                            : void mutate(() =>
                                activateStorageRack(token, rack.id),
                              )
                        }
                      >
                        {rack.active ? 'Désactiver' : 'Activer'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!data.racks.length && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="px-5 py-10 text-center text-sm text-muted-foreground"
                  >
                    Aucun rack créé. Ajoutez le premier ci-dessus.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <p className="flex items-start gap-2 border-t bg-muted/20 px-4 py-3 text-sm text-muted-foreground sm:px-5">
            <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden />
            Videz un rack avant de changer sa catégorie ou de le désactiver.
          </p>
        </section>
      </div>
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
