'use client';

import { Calendar as CalendarIcon, Clock, MapPin, Text } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  StatusBadge,
} from '@forestar-be/ui';
import dayjs from '@/lib/dayjs';
import type { Calendar, CalendarEvent } from '@/lib/api';

interface EventDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent | null;
  calendar: Calendar | undefined;
}

/**
 * Détail d'un événement de l'agenda, porté de la boîte de dialogue de
 * `src/pages/DailyCalendar.tsx`.
 */
export function EventDetailDialog({
  open,
  onOpenChange,
  event,
  calendar,
}: EventDetailDialogProps) {
  if (!event) return null;
  const isAllDay = event.start.length <= 10 && event.end.length <= 10;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{event.title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {calendar && (
            <div>
              <StatusBadge tone="info">
                <span className="flex items-center gap-1">
                  <CalendarIcon className="size-3" />
                  {calendar.name}
                </span>
              </StatusBadge>
            </div>
          )}
          <div className="flex items-start gap-2 text-sm">
            <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>
              {isAllDay
                ? `Toute la journée - Du ${dayjs(event.start).format('DD/MM/YYYY')} au ${dayjs(event.end).format('DD/MM/YYYY')}`
                : `${dayjs(event.start).format('DD/MM/YYYY HH:mm')} - ${dayjs(event.end).format('DD/MM/YYYY HH:mm')}`}
            </span>
          </div>
          {event.location && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span>{event.location}</span>
            </div>
          )}
          {event.description && (
            <div className="flex items-start gap-2 text-sm">
              <Text className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <div className="mb-1 font-medium">Description</div>
                <p className="whitespace-pre-wrap rounded bg-muted p-2 text-muted-foreground">
                  {event.description}
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
