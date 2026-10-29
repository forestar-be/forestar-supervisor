'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Bot, LockKeyhole, Plus, Save, Settings2 } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Button,
  Checkbox,
  ConfirmDialog,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
import {
  rackCategoryLabel,
  type StorageOverview,
  type StorageRackCategory,
} from '@/lib/storage';

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
    <section
      aria-label="Paramètres du rangement"
      className="flex shrink-0 flex-col gap-5 lg:min-h-0 lg:flex-1 lg:shrink"
    >
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

function StorageRackTypeSelect({
  label,
  value,
  disabled,
  title,
  onChange,
}: {
  label: string;
  value: StorageRackCategory;
  disabled: boolean;
  title?: string;
  onChange: (value: StorageRackCategory) => void;
}) {
  const appearance = rackCategoryAppearance(value);
  const Icon = appearance.Icon;
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        if (next === 'ATELIER' || next === 'HIVERNAGE') onChange(next);
      }}
    >
      <SelectTrigger
        size="sm"
        aria-label={label}
        title={title}
        className={`w-26 gap-1 px-2 text-xs disabled:opacity-100 sm:w-36 sm:gap-2 sm:text-sm ${appearance.foreground}`}
      >
        <Icon className="hidden size-4 sm:block" aria-hidden />
        <SelectValue className="min-w-0">
          {() => rackCategoryLabel(value)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {(['ATELIER', 'HIVERNAGE'] as const).map((category) => {
          const categoryAppearance = rackCategoryAppearance(category);
          const CategoryIcon = categoryAppearance.Icon;
          return (
            <SelectItem
              key={category}
              value={category}
              label={rackCategoryLabel(category)}
            >
              <CategoryIcon
                className={`size-4 ${categoryAppearance.foreground}`}
                aria-hidden
              />
              {rackCategoryLabel(category)}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

function StorageRackStatus({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-xs font-medium sm:px-2 ${active ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200' : 'bg-muted text-muted-foreground'}`}
    >
      <span
        className={`hidden size-1.5 rounded-full sm:block ${active ? 'bg-emerald-700 dark:bg-emerald-300' : 'bg-muted-foreground'}`}
        aria-hidden
      />
      {active ? 'Activé' : 'Désactivé'}
    </span>
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
  const [newRackCategory, setNewRackCategory] =
    useState<StorageRackCategory>('ATELIER');
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
    <div className="flex flex-col gap-5 lg:min-h-0 lg:flex-1">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="grid min-w-0 items-start gap-5 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:items-stretch">
        <section
          className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm"
          aria-label="Configuration du rangement"
        >
          <div className="flex shrink-0 items-center gap-2 border-b px-5 py-3">
            <Settings2 className="size-4 text-primary" aria-hidden />
            <h3 className="font-semibold">Configuration</h3>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-3">
            <div className="shrink-0 space-y-3">
              <label className="flex cursor-pointer items-center justify-between gap-4">
                <span className="min-w-0">
                  <span className="block text-sm font-medium">
                    Activer le rangement
                  </span>
                </span>
                <Switch
                  checked={settings.enabled}
                  disabled={busy}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, enabled: checked })
                  }
                />
              </label>
              <label className="flex cursor-pointer items-start justify-between gap-4 border-t pt-3">
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
            <div className="shrink-0 space-y-2 border-t pt-4">
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
            <fieldset className="flex min-h-20 min-w-0 flex-1 flex-col border-t pt-3">
              <legend className="flex shrink-0 items-center gap-2 pr-2 text-sm font-semibold">
                <Bot className="size-4 text-primary" aria-hidden />
                Machines à ranger
              </legend>
              <div
                className="mt-2 grid max-h-56 min-h-0 content-start gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:max-h-none lg:flex-1"
                aria-label="Liste des machines à ranger"
              >
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
          <div className="shrink-0 border-t px-4 py-3 sm:px-5">
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
          className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm"
          aria-label="Gestion des racks"
        >
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b p-4 sm:px-5">
            <div>
              <h3 className="font-semibold">Racks</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                12 places · 4 étages × 3 positions
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <StorageRackTypeSelect
                label="Type du nouveau rack"
                value={newRackCategory}
                disabled={busy}
                onChange={setNewRackCategory}
              />
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void mutate(() => addStorageRack(token, newRackCategory))
                }
              >
                <Plus className="size-4" aria-hidden />
                Ajouter un rack
              </Button>
            </div>
          </div>
          <Table
            aria-label="Racks"
            className="text-xs sm:text-sm"
            containerClassName="max-h-[32rem] overflow-auto lg:max-h-none lg:min-h-0 lg:flex-1"
          >
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead className="px-1 sm:px-5">Numéro</TableHead>
                <TableHead className="px-1 sm:px-3">Type de rack</TableHead>
                <TableHead className="hidden px-1 sm:table-cell sm:px-3">
                  Statut
                </TableHead>
                <TableHead className="px-1 text-right sm:px-5">
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
                    <TableCell className="px-1 py-2 font-semibold sm:px-5">
                      <span className="flex items-center gap-2.5">
                        <span
                          className={`hidden size-8 shrink-0 items-center justify-center rounded-lg sm:flex ${appearance.axis} ${appearance.foreground}`}
                        >
                          <Icon className="size-4" aria-hidden />
                        </span>
                        <span className="flex flex-col items-start gap-1">
                          <span className={appearance.foreground}>
                            R{rack.number}
                          </span>
                          <span className="sm:hidden">
                            <StorageRackStatus active={rack.active} />
                          </span>
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="px-1 py-2 sm:px-3">
                      <StorageRackTypeSelect
                        label={`Type du rack ${rack.number}`}
                        value={rack.category ?? 'ATELIER'}
                        disabled={busy || occupied}
                        title={
                          occupied
                            ? 'Videz le rack avant de changer son usage.'
                            : undefined
                        }
                        onChange={(category) =>
                          void mutate(() =>
                            changeStorageRackCategory(token, rack.id, category),
                          )
                        }
                      />
                    </TableCell>
                    <TableCell className="hidden px-1 py-2 sm:table-cell sm:px-3">
                      <StorageRackStatus active={rack.active} />
                    </TableCell>
                    <TableCell className="px-1 py-2 text-right sm:px-5">
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
          <p className="flex shrink-0 items-start gap-2 border-t bg-muted/20 px-4 py-3 text-sm text-muted-foreground sm:px-5">
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
