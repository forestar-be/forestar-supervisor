import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import SaveIcon from '@mui/icons-material/Save';
import CheckIcon from '@mui/icons-material/Check';
import { useAuth } from '../../hooks/AuthProvider';
import {
  getInvoiceItemConfigs,
  createInvoiceItemConfig,
  updateInvoiceItemConfig,
  deleteInvoiceItemConfig,
  getDolibarrBankAccounts,
  setDolibarrBankAccount,
} from '../../utils/api';
import { ServiceInvoiceItemConfig, DolibarrBankAccount } from '../../utils/types';
import { toast } from 'react-toastify';

const InvoiceSettings = (): JSX.Element => {
  const { token } = useAuth();

  // Item configs state
  const [configs, setConfigs] = useState<ServiceInvoiceItemConfig[]>([]);
  const [configsLoading, setConfigsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingConfigId, setEditingConfigId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{ name: string; defaultPrice: number }>({ name: '', defaultPrice: 0 });
  const configCategory = 'REPAIR';
  const [newConfig, setNewConfig] = useState({ name: '', unit: 'pièce', defaultPrice: 0 });

  // Bank accounts state
  const [bankAccounts, setBankAccounts] = useState<DolibarrBankAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<Record<string, number | null>>({
    cash: null,
    card: null,
    transfer: null,
  });
  const [bankAccountLoading, setBankAccountLoading] = useState(true);
  const [bankAccountSaving, setBankAccountSaving] = useState<string | null>(null);

  const fetchConfigs = useCallback(async () => {
    if (!token) return;
    try {
      setConfigsLoading(true);
      const data = await getInvoiceItemConfigs(token, { all: true });
      setConfigs(data);
    } catch {
      toast.error('Erreur lors du chargement des postes de facturation');
    } finally {
      setConfigsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  useEffect(() => {
    if (!token) return;
    getDolibarrBankAccounts(token)
      .then((data) => {
        setBankAccounts(data.accounts);
        setSelectedAccounts((prev) => ({ ...prev, ...data.selectedAccounts }));
      })
      .catch(() => {
        toast.error('Impossible de charger les comptes bancaires depuis Dolibarr');
      })
      .finally(() => setBankAccountLoading(false));
  }, [token]);

  const handleAddConfig = async () => {
    if (!token || !newConfig.name.trim()) return;
    try {
      setSaving(true);
      const created = await createInvoiceItemConfig(token, {
        ...newConfig,
        category: configCategory,
      });
      setConfigs([...configs, created]);
      setNewConfig({ name: '', unit: 'pièce', defaultPrice: 0 });
      toast.success('Poste ajouté');
    } catch {
      toast.error('Impossible de créer le poste');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateConfig = async (id: number, updates: Partial<ServiceInvoiceItemConfig>) => {
    if (!token) return;
    try {
      setSaving(true);
      const updated = await updateInvoiceItemConfig(token, id, updates);
      setConfigs(configs.map((c) => (c.id === id ? updated : c)));
      setEditingConfigId(null);
      toast.success('Poste modifié');
    } catch {
      toast.error('Impossible de modifier le poste');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfig = async (id: number) => {
    if (!token || !window.confirm('Supprimer ce poste ?')) return;
    try {
      setSaving(true);
      await deleteInvoiceItemConfig(token, id);
      setConfigs(configs.filter((c) => c.id !== id));
      toast.success('Poste supprimé');
    } catch {
      toast.error('Impossible de supprimer le poste');
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
      toast.success('Compte bancaire sauvegardé');
    } catch {
      toast.error('Impossible de sauvegarder le compte bancaire');
    } finally {
      setBankAccountSaving(null);
    }
  };

  const filteredConfigs = configs.filter((c) => (c.category || 'REPAIR') === configCategory);

  const bankAccountRows: { key: string; label: string; filter: (a: DolibarrBankAccount) => boolean }[] = [
    { key: 'cash', label: 'Espèces', filter: (a) => a.type === 2 },
    { key: 'card', label: 'Carte bancaire', filter: (a) => a.type !== 2 },
    { key: 'transfer', label: 'Virement', filter: (a) => a.type !== 2 },
  ];

  return (
    <Box sx={{ maxWidth: 800 }}>
      {/* Dolibarr Bank Accounts */}
      <Typography variant="h6" gutterBottom>
        Comptes bancaires Dolibarr
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Comptes utilisés pour enregistrer les paiements dans Dolibarr, selon le mode de paiement de la facture.
      </Typography>

      {bankAccountLoading ? (
        <CircularProgress size={24} />
      ) : bankAccounts.length === 0 ? (
        <Typography variant="body2" color="warning.main">
          Aucun compte bancaire trouvé dans Dolibarr.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
          {bankAccountRows.map(({ key, label, filter }) => (
            <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" sx={{ minWidth: 130, fontWeight: 500 }}>
                {label}
              </Typography>
              <FormControl size="small" sx={{ flex: 1 }}>
                <Select
                  value={selectedAccounts[key] ?? ''}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : null;
                    setSelectedAccounts((prev) => ({ ...prev, [key]: val }));
                  }}
                  displayEmpty
                >
                  <MenuItem value="">— Non configuré —</MenuItem>
                  {bankAccounts.filter(filter).map((acc) => (
                    <MenuItem key={acc.id} value={acc.id}>
                      {acc.label}
                      {acc.iban_prefix ? ` (${acc.iban_prefix})` : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="contained"
                size="small"
                startIcon={bankAccountSaving === key ? <CircularProgress size={16} /> : <SaveIcon />}
                onClick={() => handleSaveBankAccount(key)}
                disabled={bankAccountSaving === key || !selectedAccounts[key]}
              >
                OK
              </Button>
            </Box>
          ))}
        </Box>
      )}

      {/* Item Configs */}
      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        Postes de facturation
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Les postes configurés ici apparaîtront comme options rapides lors de la création de factures de réparation.
      </Typography>

      {configsLoading ? (
        <CircularProgress size={24} />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {filteredConfigs.map((config) => (
            <Box
              key={config.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 1.5,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: 'background.paper',
              }}
            >
              {editingConfigId === config.id ? (
                <>
                  <TextField
                    size="small"
                    value={editValues.name}
                    onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                    sx={{ flex: 1 }}
                    autoFocus
                  />
                  <TextField
                    size="small"
                    type="number"
                    value={editValues.defaultPrice}
                    onChange={(e) =>
                      setEditValues({ ...editValues, defaultPrice: parseFloat(e.target.value) || 0 })
                    }
                    sx={{ width: 100 }}
                  />
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() =>
                      handleUpdateConfig(config.id, {
                        name: editValues.name,
                        defaultPrice: editValues.defaultPrice,
                      })
                    }
                    disabled={saving}
                  >
                    <CheckIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => setEditingConfigId(null)}>
                    ×
                  </IconButton>
                </>
              ) : (
                <>
                  <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
                    {config.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {config.unit} — {config.defaultPrice.toFixed(2)} €
                  </Typography>
                  <Chip
                    label={config.isActive ? 'Actif' : 'Inactif'}
                    size="small"
                    color={config.isActive ? 'success' : 'default'}
                    variant="outlined"
                  />
                  <Tooltip title="Modifier">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditingConfigId(config.id);
                        setEditValues({ name: config.name, defaultPrice: config.defaultPrice });
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={config.isActive ? 'Désactiver' : 'Activer'}>
                    <IconButton
                      size="small"
                      onClick={() => handleUpdateConfig(config.id, { isActive: !config.isActive })}
                    >
                      {config.isActive ? (
                        <VisibilityIcon fontSize="small" />
                      ) : (
                        <VisibilityOffIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Supprimer">
                    <IconButton size="small" color="error" onClick={() => handleDeleteConfig(config.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </Box>
          ))}

          {/* New config form */}
          <Box
            sx={{
              mt: 2,
              p: 2,
              border: 1,
              borderStyle: 'dashed',
              borderColor: 'divider',
              borderRadius: 1,
              bgcolor: 'grey.50',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 2,
              alignItems: 'flex-end',
            }}
          >
            <TextField
              label="Nom du poste"
              size="small"
              value={newConfig.name}
              onChange={(e) => setNewConfig({ ...newConfig, name: e.target.value })}
              placeholder="Ex: Déplacement, Main d'oeuvre..."
              sx={{ flex: 1, minWidth: 200 }}
            />
            <FormControl size="small" sx={{ width: 120 }}>
              <InputLabel>Unité</InputLabel>
              <Select
                value={newConfig.unit}
                label="Unité"
                onChange={(e) => setNewConfig({ ...newConfig, unit: e.target.value })}
              >
                <MenuItem value="pièce">Pièce</MenuItem>
                <MenuItem value="heure">Heure</MenuItem>
                <MenuItem value="km">Km</MenuItem>
                <MenuItem value="forfait">Forfait</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Prix par défaut"
              size="small"
              type="number"
              inputProps={{ min: 0, step: 0.01 }}
              value={newConfig.defaultPrice}
              onChange={(e) =>
                setNewConfig({ ...newConfig, defaultPrice: parseFloat(e.target.value) || 0 })
              }
              sx={{ width: 130 }}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddConfig}
              disabled={saving || !newConfig.name.trim()}
            >
              Ajouter
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default InvoiceSettings;
