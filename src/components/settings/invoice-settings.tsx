'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import {
  createInvoiceItemConfig,
  deleteInvoiceItemConfig,
  getDolibarrBankAccounts,
  getInvoiceItemConfigs,
  setDolibarrBankAccount,
  updateInvoiceItemConfig,
} from '@/lib/api';
import { notifyError, notifySuccess } from '@/lib/notifications';
import { formatCurrency } from '@/lib/invoice';
import type { DolibarrBankAccount, ServiceInvoiceItemConfig } from '@/lib/types';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  StatusBadge,
} from '@forestar-be/ui';
import { Check, Eye, EyeOff, Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react';

const UNIT_OPTIONS = [
  { value: 'pièce', label: 'Pièce' },
  { value: 'heure', label: 'Heure' },
  { value: 'km', label: 'Km' },
  { value: 'forfait', label: 'Forfait' },
];

const CONFIG_CATEGORY = 'REPAIR';

const BANK_ACCOUNT_ROWS: {
  key: string;
  label: string;
  filter: (a: DolibarrBankAccount) => boolean;
}[] = [
  { key: 'cash', label: 'Espèces', filter: (a) => a.type === 2 },
  { key: 'card', label: 'Carte bancaire', filter: (a) => a.type !== 2 },
  { key: 'transfer', label: 'Virement', filter: (a) => a.type !== 2 },
];

/**
 * Paramètres de facturation : postes rapides de facturation (réparation) et
 * comptes bancaires Dolibarr par mode de paiement. Porté depuis
 * `InvoiceSettings.tsx`.
 */
export default function InvoiceSettings() {
  const { token } = useAuth();

  const [configs, setConfigs] = useState<ServiceInvoiceItemConfig[]>([]);
  const [configsLoading, setConfigsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingConfigId, setEditingConfigId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{ name: string; defaultPrice: number }>({
    name: '',
    defaultPrice: 0,
  });
  const [newConfig, setNewConfig] = useState({
    name: '',
    unit: 'pièce',
    defaultPrice: 0,
  });

  const [bankAccounts, setBankAccounts] = useState<DolibarrBankAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<
    Record<string, number | null>
  >({ cash: null, card: null, transfer: null });
  const [bankAccountLoading, setBankAccountLoading] = useState(true);
  const [bankAccountSaving, setBankAccountSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getInvoiceItemConfigs(token, { all: true })
      .then(setConfigs)
      .catch(() => notifyError('Erreur lors du chargement des postes de facturation'))
      .finally(() => setConfigsLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    getDolibarrBankAccounts(token)
      .then((data) => {
        setBankAccounts(data.accounts);
        setSelectedAccounts((prev) => ({ ...prev, ...data.selectedAccounts }));
      })
      .catch(() =>
        notifyError('Impossible de charger les comptes bancaires depuis Dolibarr'),
      )
      .finally(() => setBankAccountLoading(false));
  }, [token]);

  const handleAddConfig = async () => {
    if (!token || !newConfig.name.trim()) return;
    try {
      setSaving(true);
      const created = await createInvoiceItemConfig(token, {
        ...newConfig,
        category: CONFIG_CATEGORY,
      });
      setConfigs((prev) => [...prev, created]);
      setNewConfig({ name: '', unit: 'pièce', defaultPrice: 0 });
      notifySuccess('Poste ajouté');
    } catch {
      notifyError('Impossible de créer le poste');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateConfig = async (
    id: number,
    updates: Partial<ServiceInvoiceItemConfig>,
  ) => {
    if (!token) return;
    try {
      setSaving(true);
      const updated = await updateInvoiceItemConfig(token, id, updates);
      setConfigs((prev) => prev.map((c) => (c.id === id ? updated : c)));
      setEditingConfigId(null);
      notifySuccess('Poste modifié');
    } catch {
      notifyError('Impossible de modifier le poste');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfig = async (id: number) => {
    if (!token) return;
    try {
      setSaving(true);
      await deleteInvoiceItemConfig(token, id);
      setConfigs((prev) => prev.filter((c) => c.id !== id));
      notifySuccess('Poste supprimé');
    } catch {
      notifyError('Impossible de supprimer le poste');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBankAccount = async (key: string) => {
    if (!token || !selectedAccounts[key]) return;
    try {
      setBankAccountSaving(key);
      await setDolibarrBankAccount(token, {
        accountId: selectedAccounts[key]!,
        paymentMethod: key,
      });
      notifySuccess('Compte bancaire sauvegardé');
    } catch {
      notifyError('Impossible de sauvegarder le compte bancaire');
    } finally {
      setBankAccountSaving(null);
    }
  };

  const filteredConfigs = configs.filter(
    (c) => (c.category || CONFIG_CATEGORY) === CONFIG_CATEGORY,
  );

  return (
    <div className="max-w-3xl space-y-8">
      {/* Dolibarr bank accounts */}
      <div>
        <h2 className="text-base font-semibold">Comptes bancaires Dolibarr</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Comptes utilisés pour enregistrer les paiements dans Dolibarr, selon
          le mode de paiement de la facture.
        </p>

        {bankAccountLoading ? (
          <Skeleton className="mt-3 h-6 w-32" />
        ) : bankAccounts.length === 0 ? (
          <p className="mt-3 text-sm text-amber-600">
            Aucun compte bancaire trouvé dans Dolibarr.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {BANK_ACCOUNT_ROWS.map(({ key, label, filter }) => (
              <div key={key} className="flex flex-wrap items-center gap-2">
                <span className="w-32 shrink-0 text-sm font-medium">{label}</span>
                <Select
                  value={selectedAccounts[key] ? String(selectedAccounts[key]) : ''}
                  onValueChange={(v) =>
                    setSelectedAccounts((prev) => ({
                      ...prev,
                      [key]: v ? Number(v) : null,
                    }))
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="— Non configuré —" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.filter(filter).map((acc) => (
                      <SelectItem key={acc.id} value={String(acc.id)}>
                        {acc.label}
                        {acc.iban_prefix ? ` (${acc.iban_prefix})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  disabled={bankAccountSaving === key || !selectedAccounts[key]}
                  onClick={() => handleSaveBankAccount(key)}
                >
                  {bankAccountSaving === key ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Save />
                  )}
                  OK
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Item configs */}
      <div>
        <h2 className="text-base font-semibold">Postes de facturation</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Les postes configurés ici apparaîtront comme options rapides lors de
          la création de factures de réparation.
        </p>

        {configsLoading ? (
          <Skeleton className="mt-3 h-24 w-full" />
        ) : (
          <div className="mt-3 flex flex-col gap-1.5">
            {filteredConfigs.map((config) => (
              <div
                key={config.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2.5"
              >
                {editingConfigId === config.id ? (
                  <>
                    <Input
                      autoFocus
                      value={editValues.name}
                      onChange={(e) =>
                        setEditValues({ ...editValues, name: e.target.value })
                      }
                      className="min-w-0 flex-1"
                    />
                    <Input
                      type="number"
                      value={editValues.defaultPrice}
                      onChange={(e) =>
                        setEditValues({
                          ...editValues,
                          defaultPrice: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-28"
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={saving}
                      aria-label="Valider"
                      onClick={() =>
                        handleUpdateConfig(config.id, {
                          name: editValues.name,
                          defaultPrice: editValues.defaultPrice,
                        })
                      }
                    >
                      <Check />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Annuler"
                      onClick={() => setEditingConfigId(null)}
                    >
                      <X />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium">{config.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {config.unit} — {formatCurrency(config.defaultPrice)}
                    </span>
                    <StatusBadge tone={config.isActive ? 'success' : 'neutral'}>
                      {config.isActive ? 'Actif' : 'Inactif'}
                    </StatusBadge>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Modifier"
                      onClick={() => {
                        setEditingConfigId(config.id);
                        setEditValues({
                          name: config.name,
                          defaultPrice: config.defaultPrice,
                        });
                      }}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={config.isActive ? 'Désactiver' : 'Activer'}
                      onClick={() =>
                        handleUpdateConfig(config.id, { isActive: !config.isActive })
                      }
                    >
                      {config.isActive ? <Eye /> : <EyeOff />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:bg-destructive/10"
                      aria-label="Supprimer"
                      onClick={() => handleDeleteConfig(config.id)}
                    >
                      <Trash2 />
                    </Button>
                  </>
                )}
              </div>
            ))}

            {/* New config form */}
            <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-border p-3">
              <div className="min-w-48 flex-1">
                <Label>Nom du poste</Label>
                <Input
                  value={newConfig.name}
                  placeholder="Ex: Déplacement, Main d'oeuvre..."
                  onChange={(e) => setNewConfig({ ...newConfig, name: e.target.value })}
                />
              </div>
              <div className="w-32">
                <Label>Unité</Label>
                <Select
                  value={newConfig.unit}
                  onValueChange={(v) => v && setNewConfig({ ...newConfig, unit: v })}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {(v: string) =>
                        UNIT_OPTIONS.find((o) => o.value === v)?.label ?? v
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-32">
                <Label>Prix par défaut</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={newConfig.defaultPrice}
                  onChange={(e) =>
                    setNewConfig({
                      ...newConfig,
                      defaultPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <Button
                disabled={saving || !newConfig.name.trim()}
                onClick={handleAddConfig}
              >
                <Plus />
                Ajouter
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
