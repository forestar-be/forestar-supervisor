'use client';

import { useState } from 'react';
import {
  Alert,
  AlertDescription,
  Button,
  DatePicker,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Spinner,
} from '@forestar-be/ui';
import dayjs from '@/lib/dayjs';

/** États qui veulent dire « réparée » : pas d'avertissement en dessous (D-18). */
const COMPLETED_STATES = new Set(['Terminé', 'Terminé et en hivernage']);

interface HandoverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** État actuel de la fiche, tel qu'affiché (`null`/`''` : « sans état »). */
  state: string | null;
  loading: boolean;
  /** Date de sortie choisie, au format `AAAA-MM-JJ`. */
  onConfirm: (exitDate: string) => Promise<void>;
}

/**
 * R003-S05 — « Machine rendue au client » : demande la date de sortie
 * (aujourd'hui par défaut) avant d'archiver la fiche et d'envoyer son PDF
 * (D-02). Avertit si l'état n'est ni « Terminé » ni « Terminé et en
 * hivernage » (D-18), sans jamais modifier cet état.
 *
 * Le formulaire se réinitialise à chaque ouverture par remontage (`key`),
 * comme `CalendarEventDialog` : pas d'état local posé depuis un effet.
 */
export function HandoverDialog({
  open,
  onOpenChange,
  state,
  loading,
  onConfirm,
}: HandoverDialogProps) {
  const handleClose = (next: boolean) => {
    if (!loading) onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Machine rendue au client</DialogTitle>
        </DialogHeader>
        {open && (
          <HandoverForm
            key={String(open)}
            state={state}
            loading={loading}
            onCancel={() => handleClose(false)}
            onConfirm={onConfirm}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function HandoverForm({
  state,
  loading,
  onCancel,
  onConfirm,
}: {
  state: string | null;
  loading: boolean;
  onCancel: () => void;
  onConfirm: (exitDate: string) => Promise<void>;
}) {
  const [exitDate, setExitDate] = useState<Date>(() => dayjs().toDate());
  const isCompleted = state ? COMPLETED_STATES.has(state) : false;

  return (
    <div className="flex flex-col gap-4">
      {!isCompleted && (
        <Alert variant="destructive">
          <AlertDescription>
            La fiche est « {state || 'sans état'} » : rendre la machine quand
            même ?
          </AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="handover-exit-date"
          className="text-sm font-medium text-foreground"
        >
          Date de sortie
        </label>
        <DatePicker
          id="handover-exit-date"
          value={exitDate}
          onChange={(date) => date && setExitDate(date)}
          disabled={loading}
          displayFormat="dd/MM/yyyy"
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Annuler
        </Button>
        <Button
          type="button"
          onClick={() => void onConfirm(dayjs(exitDate).format('YYYY-MM-DD'))}
          disabled={loading}
        >
          {loading && <Spinner size="sm" />}
          {loading ? 'Remise en cours…' : 'Confirmer la remise'}
        </Button>
      </DialogFooter>
    </div>
  );
}
