'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { getInvoiceItemConfigs } from '@/lib/api';
import { calculateLineTotals, formatCurrency } from '@/lib/invoice';
import { PaymentMethod, type ServiceInvoiceItemConfig } from '@/lib/types';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@forestar-be/ui';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';

export interface InvoiceFormLine {
  description: string;
  type: string;
  unit: string;
  quantity: number;
  unitPrice: number;
}

export interface InvoiceFormData {
  clientFirstName: string;
  clientLastName: string;
  clientPhone: string;
  clientEmail: string;
  clientAddress: string;
  clientCity: string;
  clientPostalCode: string;
  paymentMethod: PaymentMethod;
  remarks: string;
  lines: InvoiceFormLine[];
  machineRepairId?: number;
  /**
   * R009-S05 (AC-10) — client Forestar existant choisi dans l'onglet
   * « Client » : le serveur rattache la facture à ce client au lieu d'en
   * créer un nouveau (`resolveClientForCreation`), sans jamais vérifier de
   * conflit sur ses coordonnées.
   */
  clientId?: number;
}

const EMPTY_LINE: InvoiceFormLine = {
  description: '',
  type: 'custom',
  unit: 'pièce',
  quantity: 1,
  unitPrice: 0,
};

const UNIT_OPTIONS = [
  { value: 'pièce', label: 'Pièce' },
  { value: 'heure', label: 'Heure' },
  { value: 'km', label: 'Km' },
  { value: 'm', label: 'Mètre' },
  { value: 'forfait', label: 'Forfait' },
];

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: PaymentMethod.CASH, label: 'Espèces' },
  { value: PaymentMethod.CARD, label: 'Carte' },
  { value: PaymentMethod.TRANSFER, label: 'Virement' },
];

interface InvoiceFormProps {
  initialData?: Partial<InvoiceFormData>;
  onSubmit: (data: InvoiceFormData) => Promise<void>;
  submitLabel?: string;
  saving?: boolean;
}

/**
 * Formulaire de facture de service, partagé par la création et l'édition.
 * Porté depuis `InvoiceForm.tsx` (MUI/Grid) vers les primitives du design
 * system : mêmes champs, mêmes règles (nom client requis, 21% de TVA).
 */
export default function InvoiceForm({
  initialData,
  onSubmit,
  submitLabel = 'Enregistrer',
  saving = false,
}: InvoiceFormProps) {
  const { token } = useAuth();
  // `initialData` n'est lu qu'au montage : l'édition ne rend ce formulaire
  // qu'une fois la facture chargée, et la création le remonte via `key`
  // quand la réparation importée change — la donnée initiale est donc
  // toujours à jour au premier rendu.
  const [form, setForm] = useState<InvoiceFormData>({
    clientFirstName: '',
    clientLastName: '',
    clientPhone: '',
    clientEmail: '',
    clientAddress: '',
    clientCity: '',
    clientPostalCode: '',
    paymentMethod: PaymentMethod.CASH,
    remarks: '',
    lines: [{ ...EMPTY_LINE }],
    ...initialData,
  });
  const [itemConfigs, setItemConfigs] = useState<ServiceInvoiceItemConfig[]>(
    [],
  );

  useEffect(() => {
    if (!token) return;
    getInvoiceItemConfigs(token, { category: 'REPAIR' })
      .then(setItemConfigs)
      .catch(() => {
        // Ajout rapide indisponible : le formulaire reste utilisable sans.
      });
  }, [token]);

  const updateField = <K extends keyof InvoiceFormData>(
    field: K,
    value: InvoiceFormData[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateLine = <K extends keyof InvoiceFormLine>(
    index: number,
    field: K,
    value: InvoiceFormLine[K],
  ) => {
    setForm((prev) => {
      const newLines = [...prev.lines];
      newLines[index] = { ...newLines[index], [field]: value };
      return { ...prev, lines: newLines };
    });
  };

  const addLine = () => {
    setForm((prev) => ({
      ...prev,
      lines: [...prev.lines, { ...EMPTY_LINE }],
    }));
  };

  const addFromConfig = (config: ServiceInvoiceItemConfig) => {
    setForm((prev) => ({
      ...prev,
      lines: [
        ...prev.lines,
        {
          description: config.name,
          type: config.type,
          unit: config.unit,
          quantity: 1,
          unitPrice: config.defaultPrice,
        },
      ],
    }));
  };

  const removeLine = (index: number) => {
    if (form.lines.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index),
    }));
  };

  const totals = calculateLineTotals(form.lines);

  const canSubmit =
    form.clientLastName.trim() !== '' && form.lines.length > 0 && !saving;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Client info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Informations client
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>
              Nom <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.clientLastName}
              onChange={(e) => updateField('clientLastName', e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Prénom</Label>
            <Input
              value={form.clientFirstName}
              onChange={(e) => updateField('clientFirstName', e.target.value)}
            />
          </div>
          <div>
            <Label>Téléphone</Label>
            <Input
              value={form.clientPhone}
              onChange={(e) => updateField('clientPhone', e.target.value)}
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={form.clientEmail}
              onChange={(e) => updateField('clientEmail', e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Adresse</Label>
            <Input
              value={form.clientAddress}
              onChange={(e) => updateField('clientAddress', e.target.value)}
            />
          </div>
          <div>
            <Label>Code postal</Label>
            <Input
              value={form.clientPostalCode}
              onChange={(e) =>
                updateField('clientPostalCode', e.target.value)
              }
            />
          </div>
          <div>
            <Label>Ville</Label>
            <Input
              value={form.clientCity}
              onChange={(e) => updateField('clientCity', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Invoice lines */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Lignes de facture
          </CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={addLine}>
            <Plus />
            Ajouter une ligne
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {itemConfigs.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs text-muted-foreground">
                Ajout rapide :
              </p>
              <div className="flex flex-wrap gap-1.5">
                {itemConfigs
                  .filter((c) => c.isActive)
                  .map((config) => (
                    <Button
                      key={config.id}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addFromConfig(config)}
                    >
                      {config.name}
                      {config.defaultPrice > 0 &&
                        ` (${formatCurrency(config.defaultPrice)})`}
                    </Button>
                  ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {form.lines.map((line, index) => (
              <div
                key={index}
                className="rounded-xl border border-border bg-muted/30 p-3"
              >
                <div className="mb-2 flex items-start gap-2">
                  <Input
                    value={line.description}
                    onChange={(e) =>
                      updateLine(index, 'description', e.target.value)
                    }
                    placeholder="Description"
                    className="flex-1"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10"
                    disabled={form.lines.length <= 1}
                    onClick={() => removeLine(index)}
                    aria-label="Supprimer la ligne"
                  >
                    <Trash2 />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Unité
                    </Label>
                    <Select
                      value={line.unit}
                      onValueChange={(v) => v && updateLine(index, 'unit', v)}
                    >
                      <SelectTrigger size="sm">
                        <SelectValue>
                          {(v: string) =>
                            UNIT_OPTIONS.find((o) => o.value === v)?.label ??
                            v
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
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Quantité
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(
                          index,
                          'quantity',
                          parseFloat(e.target.value) || 0,
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Prix unit. HT
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={line.unitPrice}
                      onChange={(e) =>
                        updateLine(
                          index,
                          'unitPrice',
                          parseFloat(e.target.value) || 0,
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Total HT
                    </Label>
                    <div className="flex h-9 items-center rounded-xl border border-input bg-muted/50 px-3 text-sm font-medium">
                      {formatCurrency(
                        Math.round(line.quantity * line.unitPrice * 100) /
                          100,
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-end gap-1 border-t border-border pt-3">
            <div className="flex w-64 justify-between text-sm">
              <span className="text-muted-foreground">Sous-total HT</span>
              <span className="font-medium">
                {formatCurrency(totals.subtotalHT)}
              </span>
            </div>
            <div className="flex w-64 justify-between text-sm">
              <span className="text-muted-foreground">TVA (21%)</span>
              <span className="font-medium">
                {formatCurrency(totals.vatAmount)}
              </span>
            </div>
            <div className="flex w-64 justify-between border-t border-border pt-1 text-base font-bold">
              <span>Total TTC</span>
              <span className="text-primary">
                {formatCurrency(totals.totalTTC)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment & remarks */}
      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-3">
          <div>
            <Label>Mode de paiement</Label>
            <Select
              value={form.paymentMethod}
              onValueChange={(v) =>
                v && updateField('paymentMethod', v as PaymentMethod)
              }
            >
              <SelectTrigger>
                <SelectValue>
                  {(v: string) =>
                    PAYMENT_OPTIONS.find((o) => o.value === v)?.label ?? v
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Remarques</Label>
            <Textarea
              value={form.remarks}
              onChange={(e) => updateField('remarks', e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={!canSubmit}>
          {saving ? <Loader2 className="animate-spin" /> : <Save />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
