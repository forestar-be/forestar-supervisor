import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Box,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/fr';
import { MachineRepair } from '../../utils/types';

dayjs.locale('fr');

interface CalendarEventModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (eventData: CalendarEventData) => Promise<void>;
  repair: MachineRepair;
  loading?: boolean;
  error?: string | null;
}

export interface CalendarEventData {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  isFullDay: boolean;
}

const CalendarEventModal: React.FC<CalendarEventModalProps> = ({
  open,
  onClose,
  onConfirm,
  repair,
  loading = false,
  error = null,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [startTime, setStartTime] = useState<Dayjs>(dayjs().hour(9).minute(0));
  const [endTime, setEndTime] = useState<Dayjs>(dayjs().hour(17).minute(0));
  const [isFullDay, setIsFullDay] = useState(true);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  // Initialize form when modal opens
  useEffect(() => {
    if (open && repair) {
      setTitle(
        `${repair.repair_or_maintenance} #${repair.id} - ${repair.first_name} ${repair.last_name}`,
      );
      setDescription(
        `${repair.repair_or_maintenance} - ${repair.machine_type_name || 'Machine'}\n` +
          `Client: ${repair.first_name} ${repair.last_name}\n` +
          `Téléphone: ${repair.phone}\n` +
          `Description: ${repair.fault_description || 'Non spécifiée'}`,
      );
      setSelectedDate(dayjs());
      setStartTime(dayjs().hour(9).minute(0));
      setEndTime(dayjs().hour(17).minute(0));
      setIsFullDay(true);
      setFormErrors({});
    }
  }, [open, repair]);

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!title.trim()) {
      errors.title = 'Le titre est requis';
    }

    if (!selectedDate) {
      errors.date = 'La date est requise';
    }

    if (!isFullDay) {
      if (!startTime) {
        errors.startTime = "L'heure de début est requise";
      }
      if (!endTime) {
        errors.endTime = "L'heure de fin est requise";
      }
      if (startTime && endTime && endTime.isBefore(startTime)) {
        errors.endTime = "L'heure de fin doit être après l'heure de début";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleConfirm = async () => {
    if (!validateForm()) {
      return;
    }

    let startDate: Date;
    let endDate: Date;

    if (isFullDay) {
      startDate = selectedDate.startOf('day').toDate();
      endDate = selectedDate.endOf('day').toDate();
    } else {
      startDate = selectedDate
        .hour(startTime.hour())
        .minute(startTime.minute())
        .second(0)
        .toDate();
      endDate = selectedDate
        .hour(endTime.hour())
        .minute(endTime.minute())
        .second(0)
        .toDate();
    }

    const eventData: CalendarEventData = {
      title: title.trim(),
      description: description.trim(),
      startDate,
      endDate,
      isFullDay,
    };

    try {
      await onConfirm(eventData);
      onClose();
    } catch (error) {
      // Error handling is done by parent component
      console.error('Error creating calendar event:', error);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Ajouter à l'agenda</DialogTitle>

        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <TextField
              label="Titre de l'événement"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              error={!!formErrors.title}
              helperText={formErrors.title}
              fullWidth
              required
              disabled={loading}
            />

            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={4}
              fullWidth
              disabled={loading}
            />

            <DatePicker
              label="Date"
              value={selectedDate}
              onChange={(newDate) => setSelectedDate(newDate || dayjs())}
              slotProps={{
                textField: {
                  error: !!formErrors.date,
                  helperText: formErrors.date,
                  fullWidth: true,
                  required: true,
                  disabled: loading,
                },
              }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={isFullDay}
                  onChange={(e) => setIsFullDay(e.target.checked)}
                  disabled={loading}
                />
              }
              label="Journée entière"
            />

            {!isFullDay && (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TimePicker
                  label="Heure de début"
                  value={startTime}
                  onChange={(newTime) => setStartTime(newTime || dayjs())}
                  slotProps={{
                    textField: {
                      error: !!formErrors.startTime,
                      helperText: formErrors.startTime,
                      fullWidth: true,
                      disabled: loading,
                    },
                  }}
                />
                <TimePicker
                  label="Heure de fin"
                  value={endTime}
                  onChange={(newTime) => setEndTime(newTime || dayjs())}
                  slotProps={{
                    textField: {
                      error: !!formErrors.endTime,
                      helperText: formErrors.endTime,
                      fullWidth: true,
                      disabled: loading,
                    },
                  }}
                />
              </Box>
            )}

            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              L'événement sera ajouté au calendrier des réparations.
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Création...' : "Ajouter à l'agenda"}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default CalendarEventModal;
