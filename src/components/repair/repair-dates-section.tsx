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
 * Placées sur la deuxième ligne de l'en-tête, étiquette à gauche du champ.
 */
export function RepairDatesSection({
  entryDate,
  exitDate,
  disabled,
  onEntryDateChange,
  onExitDateChange,
}: RepairDatesSectionProps) {
  return (
    <>
      <div className="flex items-center gap-2">
        <label
          htmlFor="repair-entry-date"
          className="text-sm text-muted-foreground"
        >
          Entrée
        </label>
        <DatePicker
          id="repair-entry-date"
          className="w-40"
          value={new Date(entryDate)}
          onChange={(date) => date && onEntryDateChange(date)}
          disabled={disabled}
          displayFormat="dd/MM/yyyy"
        />
      </div>
      <div className="flex items-center gap-2">
        <label
          htmlFor="repair-exit-date"
          className="text-sm text-muted-foreground"
        >
          Sortie
        </label>
        <DatePicker
          id="repair-exit-date"
          className="w-40"
          value={exitDate ? new Date(exitDate) : undefined}
          onChange={onExitDateChange}
          disabled={disabled}
          clearable
          placeholder="Aucune"
          displayFormat="dd/MM/yyyy"
        />
      </div>
    </>
  );
}
