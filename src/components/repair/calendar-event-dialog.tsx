'use client';

import { useState } from 'react';
import {
  Alert,
  AlertDescription,
  Button,
  Checkbox,
  DateTimePicker,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Spinner,
  Textarea,
} from '@forestar-be/ui';
import dayjs from '@/lib/dayjs';
import type { MachineRepair } from '@/lib/types';

export interface CalendarEventData {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  isFullDay: boolean;
}

interface CalendarEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (eventData: CalendarEventData) => Promise<void>;
  repair: MachineRepair | null;
  loading?: boolean;
  error?: string | null;
}

const defaultStart = () => dayjs().hour(9).minute(0).second(0).toDate();
const defaultEnd = () => dayjs().hour(17).minute(0).second(0).toDate();

/**
 * Ajout à l'agenda depuis la fiche réparation, porté de
 * `components/repair/CalendarEventModal.tsx`. Le `DatePicker` + `TimePicker`
 * distincts de l'ancien code deviennent deux `DateTimePicker` (début, fin) du
 * design system ; « Journée entière » masque celui de fin et ne garde que la
 * date de celui de début pour calculer les bornes du jour.
 *
 * Le formulaire se réinitialise à chaque ouverture via un remontage
 * (`key`) plutôt qu'un effet qui poserait de l'état : la règle de lint du
 * projet interdit d'appeler un `setState` local depuis un effet.
 */
export function CalendarEventDialog({
  open,
  onOpenChange,
  onConfirm,
  repair,
  loading = false,
  error = null,
}: CalendarEventDialogProps) {
  const handleClose = (next: boolean) => {
    if (!loading) onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter à l&apos;agenda</DialogTitle>
        </DialogHeader>
        {open && repair && (
          <CalendarEventForm
            key={repair.id}
            repair={repair}
            loading={loading}
            error={error}
            onCancel={() => handleClose(false)}
            onConfirm={async (eventData) => {
              await onConfirm(eventData);
              // `onConfirm` avale ses propres erreurs (toast + `error` affiché
              // ici) : comme l'ancienne modale, la fermeture n'est donc pas
              // conditionnée à la réussite de la création côté serveur.
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface CalendarEventFormProps {
  repair: MachineRepair;
  loading: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (eventData: CalendarEventData) => Promise<void>;
}

function CalendarEventForm({
  repair,
  loading,
  error,
  onCancel,
  onConfirm,
}: CalendarEventFormProps) {
  const [title, setTitle] = useState(
    `${repair.repair_or_maintenance} #${repair.id} - ${repair.client.firstName} ${repair.client.lastName}`,
  );
  const [description, setDescription] = useState(
    `${repair.repair_or_maintenance} - ${repair.machine_type_name || 'Machine'}\n` +
      `Client: ${repair.client.firstName} ${repair.client.lastName}\n` +
      `Téléphone: ${repair.client.phone}\n` +
      `Description: ${repair.fault_description || 'Non spécifiée'}`,
  );
  const [startDate, setStartDate] = useState<Date>(defaultStart);
  const [endDate, setEndDate] = useState<Date>(defaultEnd);
  const [isFullDay, setIsFullDay] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!title.trim()) {
      setFormError('Le titre est requis');
      return;
    }
    if (!isFullDay && dayjs(endDate).isBefore(dayjs(startDate))) {
      setFormError("L'heure de fin doit être après l'heure de début");
      return;
    }
    setFormError(null);

    const eventData: CalendarEventData = isFullDay
      ? {
          title: title.trim(),
          description: description.trim(),
          startDate: dayjs(startDate).startOf('day').toDate(),
          endDate: dayjs(startDate).endOf('day').toDate(),
          isFullDay: true,
        }
      : {
          title: title.trim(),
          description: description.trim(),
          startDate,
          endDate,
          isFullDay: false,
        };

    try {
      await onConfirm(eventData);
    } catch (err) {
      console.error('Error creating calendar event:', err);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {(error || formError) && (
        <Alert variant="destructive">
          <AlertDescription>{error ?? formError}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-1">
        <label htmlFor="event-title" className="text-sm font-medium">
          Titre de l&apos;événement
        </label>
        <Input
          id="event-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={loading}
          required
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="event-description" className="text-sm font-medium">
          Description
        </label>
        <Textarea
          id="event-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          disabled={loading}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={isFullDay}
          onCheckedChange={(checked) => setIsFullDay(checked === true)}
          disabled={loading}
        />
        Journée entière
      </label>
      {isFullDay ? (
        <div className="flex flex-col gap-1">
          <label htmlFor="event-date" className="text-sm font-medium">
            Date
          </label>
          <DateTimePicker
            id="event-date"
            value={startDate}
            onChange={(date) => date && setStartDate(date)}
            disabled={loading}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="event-start" className="text-sm font-medium">
              Début
            </label>
            <DateTimePicker
              id="event-start"
              value={startDate}
              onChange={(date) => date && setStartDate(date)}
              disabled={loading}
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="event-end" className="text-sm font-medium">
              Fin
            </label>
            <DateTimePicker
              id="event-end"
              value={endDate}
              onChange={(date) => date && setEndDate(date)}
              disabled={loading}
            />
          </div>
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        L&apos;événement sera ajouté au calendrier des réparations.
      </p>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Annuler
        </Button>
        <Button type="button" onClick={() => void handleConfirm()} disabled={loading}>
          {loading && <Spinner size="sm" />}
          {loading ? 'Création...' : "Ajouter à l'agenda"}
        </Button>
      </DialogFooter>
    </div>
  );
}
