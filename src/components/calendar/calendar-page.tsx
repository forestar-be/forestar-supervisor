'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Download,
  ExternalLink,
  Printer,
  Settings,
  Table as TableIcon,
  GanttChartSquare,
} from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Button,
  Checkbox,
  DataTable,
  type ColumnDef,
  DatePicker,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  PageHeader,
  RadioGroup,
  RadioGroupItem,
  Spinner,
  ToggleGroup,
  ToggleGroupItem,
} from '@forestar-be/ui';
import { useAuth } from '@/lib/auth';
import { fetchCalendarEvents, fetchCalendars, type Calendar, type CalendarEvent } from '@/lib/api';
import { notifyError } from '@/lib/notifications';
import { usePersistedState } from '@/lib/use-persisted-state';
import dayjs from '@/lib/dayjs';
import { EventDetailDialog } from './event-detail-dialog';

const WITH_LOCATION = true;
type ViewMode = 'table' | 'timeline';
type PdfOrientation = 'portrait' | 'landscape';

function formatEventTime(start: string, end: string): string {
  if (start.length <= 10 && end.length <= 10) return 'Toute la journée';
  return `${dayjs(start).format('HH:mm')} - ${dayjs(end).format('HH:mm')}`;
}

/**
 * Calendrier du jour, porté de `src/pages/DailyCalendar.tsx` (MUI + AG-style
 * table maison) vers `DataTable` + une vue chronologie en Tailwind.
 * L'impression et le téléchargement du PDF chargent `@react-pdf/renderer`
 * par `import()` dans leurs gestionnaires de clic, jamais au niveau module.
 */
export function CalendarPageClient() {
  const auth = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>([]);
  // Vrai dès le départ : ni cet état ni celui des événements ne sont
  // repassés à vrai depuis un effet (voir la note plus bas sur la règle de
  // lint `set-state-in-effect`).
  const [loadingCalendars, setLoadingCalendars] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [pdfOrientation, setPdfOrientation] = usePersistedState<PdfOrientation>(
    'atelier.calendarPdfOrientation',
    'portrait',
  );
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const selectedDateKey = dayjs(selectedDate).format('YYYY-MM-DD');

  // Calendriers disponibles.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchCalendars(auth.token);
        if (cancelled) return;
        setCalendars(data);
        setSelectedCalendars(data.map((cal) => cal.id));
      } catch (err) {
        if (cancelled) return;
        console.error('Error fetching calendars:', err);
        setError('Impossible de récupérer les calendriers.');
      } finally {
        if (!cancelled) setLoadingCalendars(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth.token]);

  // Événements du jour sélectionné, pour les calendriers cochés.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (selectedCalendars.length === 0) {
        if (!cancelled) {
          setEvents([]);
          setLoadingEvents(false);
        }
        return;
      }
      try {
        const data = await fetchCalendarEvents(
          auth.token,
          selectedCalendars,
          selectedDateKey,
        );
        if (cancelled) return;
        setEvents(data);
      } catch (err) {
        if (cancelled) return;
        console.error('Error fetching events:', err);
        setError('Impossible de récupérer les événements.');
      } finally {
        if (!cancelled) setLoadingEvents(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth.token, selectedCalendars, selectedDateKey]);

  const loading = loadingCalendars || loadingEvents;

  const handleCalendarToggle = (calendarId: string) => {
    setSelectedCalendars((prev) =>
      prev.includes(calendarId)
        ? prev.filter((id) => id !== calendarId)
        : [...prev, calendarId],
    );
  };

  const openInGoogleCalendar = (calendarId: string) => {
    window.open(
      `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(calendarId)}`,
      '_blank',
    );
  };

  const sortedEvents = useMemo(
    () =>
      [...events].sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
      ),
    [events],
  );

  const getCalendarById = (calendarId: string) =>
    calendars.find((cal) => cal.id === calendarId);

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setEventDialogOpen(true);
  };

  const buildPdfProps = () => ({
    date: selectedDateKey,
    calendars,
    events,
    selectedCalendarIds: selectedCalendars,
    orientation: pdfOrientation,
  });

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const [{ pdf }, { CalendarPdf }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./calendar-pdf'),
      ]);
      const blob = await pdf(<CalendarPdf {...buildPdfProps()} />).toBlob();
      const blobUrl = URL.createObjectURL(blob);
      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = 'none';
      printFrame.src = blobUrl;
      printFrame.onload = () => {
        try {
          printFrame.contentWindow?.print();
        } catch (err) {
          console.error('Error printing PDF:', err);
          notifyError("Erreur lors de l'impression");
          document.body.removeChild(printFrame);
          URL.revokeObjectURL(blobUrl);
        }
      };
      document.body.appendChild(printFrame);
    } catch (err) {
      console.error('Error generating PDF:', err);
      notifyError("Impossible de générer le PDF pour l'impression.");
    } finally {
      setPrinting(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const [{ pdf }, { CalendarPdf }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./calendar-pdf'),
      ]);
      const blob = await pdf(<CalendarPdf {...buildPdfProps()} />).toBlob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Calendrier-${selectedDateKey}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating PDF:', err);
      notifyError('Impossible de générer le PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const columns = useMemo<ColumnDef<CalendarEvent>[]>(
    () => [
      {
        id: 'time',
        header: 'Horaire',
        cell: ({ row }) => formatEventTime(row.original.start, row.original.end),
      },
      {
        accessorKey: 'title',
        header: 'Événement',
      },
      {
        id: 'calendar',
        header: 'Calendrier',
        cell: ({ row }) => {
          const calendar = getCalendarById(row.original.calendarId);
          return (
            <span className="flex items-center gap-2">
              <span
                className="inline-block size-2.5 rounded-full"
                style={{ backgroundColor: calendar?.color || '#ccc' }}
              />
              {calendar?.name ?? '-'}
            </span>
          );
        },
      },
      ...(WITH_LOCATION
        ? [
            {
              accessorKey: 'location',
              header: 'Lieu',
              cell: ({ getValue }: { getValue: () => string | undefined }) =>
                getValue() || '-',
            } as ColumnDef<CalendarEvent>,
          ]
        : []),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [calendars],
  );

  const allDayEvents = sortedEvents.filter(
    (event) => event.start.length <= 10 && event.end.length <= 10,
  );
  const timedEvents = sortedEvents.filter(
    (event) => !(event.start.length <= 10 && event.end.length <= 10),
  );
  const HOURS = Array.from({ length: 17 }, (_, i) => i + 7);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Agenda"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DatePicker
              value={selectedDate}
              onChange={(date) => date && setSelectedDate(date)}
            />
            <ToggleGroup
              value={[viewMode]}
              onValueChange={(values) => {
                const next = values[values.length - 1] as ViewMode | undefined;
                if (next) setViewMode(next);
              }}
              aria-label="Mode d'affichage"
            >
              <ToggleGroupItem value="table" aria-label="Vue tableau">
                <TableIcon className="size-4" />
                Tableau
              </ToggleGroupItem>
              <ToggleGroupItem value="timeline" aria-label="Vue chronologie">
                <GanttChartSquare className="size-4" />
                Chronologie
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        {/* Calendriers */}
        <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Calendriers</h2>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Paramètres PDF"
              onClick={() => setSettingsDialogOpen(true)}
            >
              <Settings className="size-4" />
            </Button>
          </div>
          <div className="flex justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCalendars(calendars.map((cal) => cal.id))}
            >
              Tout sélectionner
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCalendars([])}
            >
              Tout désélectionner
            </Button>
          </div>

          {loadingCalendars && calendars.length === 0 ? (
            <div className="flex justify-center p-2">
              <Spinner />
            </div>
          ) : (
            <ul className="flex flex-col gap-1">
              {calendars.map((calendar, index) => (
                // L'API de test sert parfois deux agendas avec le même id
                // (données de seed) : l'index dans la clé évite la collision
                // React sans changer le comportement (sélection par id).
                <li
                  key={`${calendar.id}-${index}`}
                  className="flex items-center justify-between gap-2"
                >
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedCalendars.includes(calendar.id)}
                      onCheckedChange={() => handleCalendarToggle(calendar.id)}
                      style={{ accentColor: calendar.color }}
                    />
                    {calendar.name}
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Ouvrir ${calendar.name} dans Google Calendar`}
                    onClick={() => openInGoogleCalendar(calendar.id)}
                  >
                    <ExternalLink className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
            <Button
              type="button"
              onClick={() => void handlePrint()}
              disabled={printing || loading || selectedCalendars.length === 0}
            >
              {printing ? <Spinner size="sm" /> : <Printer className="size-4" />}
              Imprimer le planning
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleDownload()}
              disabled={downloading || loading || selectedCalendars.length === 0}
            >
              {downloading ? <Spinner size="sm" /> : <Download className="size-4" />}
              Télécharger le PDF
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Format PDF : {pdfOrientation === 'portrait' ? 'Portrait' : 'Paysage'}
            </p>
          </div>
        </div>

        {/* Événements */}
        <div className="rounded-md border border-border bg-card p-4">
          <h2 className="mb-3 text-base font-semibold">
            Programme du {dayjs(selectedDate).format('dddd D MMMM YYYY')}
          </h2>

          {loading ? (
            <div className="flex justify-center p-6">
              <Spinner size="lg" />
            </div>
          ) : events.length === 0 ? (
            <Alert>
              <AlertDescription>
                {selectedCalendars.length === 0
                  ? 'Veuillez sélectionner au moins un calendrier.'
                  : 'Aucun événement pour cette journée.'}
              </AlertDescription>
            </Alert>
          ) : viewMode === 'table' ? (
            <DataTable
              columns={columns}
              data={sortedEvents}
              pageSize={100}
              onRowClick={handleEventClick}
              getRowId={(row) => row.id}
              emptyMessage="Aucun événement pour cette journée."
            />
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1.5">
                {allDayEvents.map((event) => {
                  const calendar = getCalendarById(event.calendarId);
                  return (
                    <button
                      type="button"
                      key={event.id}
                      onClick={() => handleEventClick(event)}
                      className="rounded p-2 text-left shadow-sm hover:shadow-md"
                      style={{
                        backgroundColor: calendar ? `${calendar.color}22` : '#eee',
                        borderLeft: `4px solid ${calendar?.color || '#ccc'}`,
                      }}
                    >
                      <p className="truncate text-sm font-semibold">{event.title}</p>
                      {WITH_LOCATION && event.location && (
                        <p className="truncate text-xs text-muted-foreground">
                          {event.location}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="relative mt-2 flex" style={{ height: '800px' }}>
                <div className="relative w-14 border-r border-border py-1">
                  {HOURS.map((hour) => (
                    <span
                      key={hour}
                      className="absolute text-xs font-semibold"
                      style={{ top: `${(hour - 7) * 50}px`, right: 'calc(100% - 55px)' }}
                    >
                      {hour}:00
                    </span>
                  ))}
                </div>
                <div className="relative ml-2 flex-1">
                  {timedEvents.map((event) => {
                    const calendar = getCalendarById(event.calendarId);
                    const startHour =
                      dayjs(event.start).hour() + dayjs(event.start).minute() / 60;
                    const endHour =
                      dayjs(event.end).hour() + dayjs(event.end).minute() / 60;
                    const top = (startHour - 7) * 50;
                    const height = (endHour - startHour) * 50;
                    return (
                      <button
                        type="button"
                        key={event.id}
                        onClick={() => handleEventClick(event)}
                        className="absolute left-1 overflow-hidden rounded p-1 text-left shadow-sm hover:shadow-md"
                        style={{
                          top: `${top}px`,
                          width: 'calc(100% - 8px)',
                          height: `${height}px`,
                          backgroundColor: calendar ? `${calendar.color}22` : '#eee',
                          borderLeft: `4px solid ${calendar?.color || '#ccc'}`,
                        }}
                      >
                        <p className="truncate text-sm font-semibold">{event.title}</p>
                        <p className="truncate text-xs">
                          {formatEventTime(event.start, event.end)}
                        </p>
                        {WITH_LOCATION && event.location && (
                          <p className="truncate text-xs text-muted-foreground">
                            {event.location}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <EventDetailDialog
        open={eventDialogOpen}
        onOpenChange={setEventDialogOpen}
        event={selectedEvent}
        calendar={
          selectedEvent ? getCalendarById(selectedEvent.calendarId) : undefined
        }
      />

      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Paramètres du PDF</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Orientation</span>
            <RadioGroup
              value={pdfOrientation}
              onValueChange={(value) => setPdfOrientation(value as PdfOrientation)}
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="portrait" />
                Portrait
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="landscape" />
                Paysage
              </label>
            </RadioGroup>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setSettingsDialogOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
