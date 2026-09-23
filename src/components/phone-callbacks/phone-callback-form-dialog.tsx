'use client';

import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Textarea,
} from '@forestar-be/ui';
import type { PhoneCallbackFormData } from '@/lib/api';

const REASON_OPTIONS = [
  { value: 'warranty', label: 'Garantie' },
  { value: 'delivery', label: 'Livraison' },
  { value: 'rental', label: 'Location' },
  { value: 'other', label: 'Autre' },
];

const RESPONSIBLE_OPTIONS = ['Jowel', 'Julien', 'Mirko'];

const EMPTY_FORM: PhoneCallbackFormData = {
  phoneNumber: '',
  clientName: '',
  reason: 'other',
  description: '',
  responsiblePerson: '',
};

interface PhoneCallbackFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  initialValue: PhoneCallbackFormData | null;
  loading: boolean;
  onSubmit: (data: PhoneCallbackFormData) => Promise<void>;
}

/**
 * Formulaire de création/édition d'un rappel téléphonique, porté de la
 * boîte de dialogue de `src/pages/PhoneCallbacks.tsx`.
 */
export function PhoneCallbackFormDialog({
  open,
  onOpenChange,
  isEditing,
  initialValue,
  loading,
  onSubmit,
}: PhoneCallbackFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !loading && onOpenChange(next)}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? 'Modifier le rappel téléphonique'
              : 'Nouveau rappel téléphonique'}
          </DialogTitle>
        </DialogHeader>
        {open && (
          <PhoneCallbackForm
            key={isEditing ? 'edit' : 'create'}
            initialValue={initialValue ?? EMPTY_FORM}
            isEditing={isEditing}
            loading={loading}
            onCancel={() => onOpenChange(false)}
            onSubmit={onSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface PhoneCallbackFormProps {
  initialValue: PhoneCallbackFormData;
  isEditing: boolean;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (data: PhoneCallbackFormData) => Promise<void>;
}

function PhoneCallbackForm({
  initialValue,
  isEditing,
  loading,
  onCancel,
  onSubmit,
}: PhoneCallbackFormProps) {
  const [formData, setFormData] = useState<PhoneCallbackFormData>(initialValue);
  const [errors, setErrors] = useState<Partial<PhoneCallbackFormData>>({});

  const validate = (): boolean => {
    const nextErrors: Partial<PhoneCallbackFormData> = {};
    if (!formData.phoneNumber.trim()) {
      nextErrors.phoneNumber = 'Le numéro de téléphone est obligatoire';
    }
    if (!formData.clientName.trim()) {
      nextErrors.clientName = 'Le nom du client est obligatoire';
    }
    if (!formData.reason) {
      nextErrors.reason = 'La raison du rappel est obligatoire';
    }
    if (!formData.description.trim()) {
      nextErrors.description = 'La description est obligatoire';
    }
    if (!formData.responsiblePerson) {
      nextErrors.responsiblePerson = 'La personne responsable est obligatoire';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onSubmit(formData);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Numéro de téléphone" error={errors.phoneNumber} required>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              value={formData.phoneNumber}
              onChange={(e) =>
                setFormData({ ...formData, phoneNumber: e.target.value })
              }
              disabled={loading}
            />
          )}
        </FormField>
        <FormField label="Nom du client" error={errors.clientName} required>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              value={formData.clientName}
              onChange={(e) =>
                setFormData({ ...formData, clientName: e.target.value })
              }
              disabled={loading}
            />
          )}
        </FormField>
        <FormField label="Raison du rappel" error={errors.reason} required>
          {(fieldProps) => (
            <Select
              value={formData.reason}
              onValueChange={(value) =>
                setFormData({ ...formData, reason: String(value) })
              }
              disabled={loading}
            >
              <SelectTrigger id={fieldProps.id} className="w-full">
                <SelectValue placeholder="Raison du rappel" />
              </SelectTrigger>
              <SelectContent>
                {REASON_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
        <FormField
          label="Personne responsable"
          error={errors.responsiblePerson}
          required
        >
          {(fieldProps) => (
            <Select
              value={formData.responsiblePerson}
              onValueChange={(value) =>
                setFormData({ ...formData, responsiblePerson: String(value) })
              }
              disabled={loading}
            >
              <SelectTrigger id={fieldProps.id} className="w-full">
                <SelectValue placeholder="Personne responsable" />
              </SelectTrigger>
              <SelectContent>
                {RESPONSIBLE_OPTIONS.map((person) => (
                  <SelectItem key={person} value={person}>
                    {person}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
      </div>
      <FormField label="Description" error={errors.description} required>
        {(fieldProps) => (
          <Textarea
            {...fieldProps}
            rows={4}
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            disabled={loading}
          />
        )}
      </FormField>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Annuler
        </Button>
        <Button type="button" onClick={() => void handleSubmit()} disabled={loading}>
          {loading && <Spinner size="sm" />}
          {isEditing ? 'Mettre à jour' : 'Créer'}
        </Button>
      </DialogFooter>
    </div>
  );
}
