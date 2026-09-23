'use client';

import { DatePicker } from '@forestar-be/ui';

interface RepairDatesSectionProps {
  /** ISO, toujours renseignée (défaut serveur : création de la fiche). */
  entryDate: string;
  /** ISO ou `null` : pas encore de sortie. */
  exitDate: string | null;
  /** Fiche archivée (D-18) : les deux dates sont en lecture seule. */
  disabled: boolean;
  onEntryDateChange: (date: Date) => void;
  /** `undefined` : la sortie a été effacée. */
  onExitDateChange: (date: Date | undefined) => void;
}

/**
 * R003-S05 — dates d'entrée et de sortie de la fiche, éditées directement
 * (chaque changement s'enregistre aussitôt par `PATCH`, comme le chronomètre
 * ou l'état d'appel) : pas de bascule édition/lecture comme les sections
 * « Détails » ou « Coordonnées », les deux valeurs sont toujours visibles.
 */
export function RepairDatesSection({
  entryDate,
  exitDate,
  disabled,
  onEntryDateChange,
  onExitDateChange,
}: RepairDatesSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1">
        <label
          htmlFor="repair-entry-date"
          className="text-sm font-medium text-foreground"
        >
          Date d&apos;entrée
        </label>
        <DatePicker
          id="repair-entry-date"
          value={new Date(entryDate)}
          onChange={(date) => date && onEntryDateChange(date)}
          disabled={disabled}
          displayFormat="dd/MM/yyyy"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label
          htmlFor="repair-exit-date"
          className="text-sm font-medium text-foreground"
        >
          Date de sortie
        </label>
        <DatePicker
          id="repair-exit-date"
          value={exitDate ? new Date(exitDate) : undefined}
          onChange={onExitDateChange}
          disabled={disabled}
          clearable
          placeholder="Aucune"
          displayFormat="dd/MM/yyyy"
        />
      </div>
    </div>
  );
}
