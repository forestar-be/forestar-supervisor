import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Typography,
  Paper,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Tooltip,
  Grid,
  Switch,
  IconButton,
  Dialog,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PrintIcon from '@mui/icons-material/Print';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/fr';
import { useAuth } from '../hooks/AuthProvider';
import {
  fetchCalendars,
  fetchCalendarEvents,
  Calendar,
  CalendarEvent,
} from '../utils/api';
import CalendarPdf from '../components/calendar/CalendarPdf';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import { pdf } from '@react-pdf/renderer';

// Mock data for development
const mockCalendars: Calendar[] = [
  { id: 'cal1', name: 'Bureau', color: '#4285F4' },
  { id: 'cal2', name: 'Personnel', color: '#0F9D58' },
  { id: 'cal3', name: 'Équipe technique', color: '#DB4437' },
  { id: 'cal4', name: 'Livraisons', color: '#F4B400' },
];

const mockEvents: CalendarEvent[] = [
  {
    id: 'evt1',
    calendarId: 'cal1',
    title: "Réunion d'équipe",
    start: '2023-06-15T09:00:00',
    end: '2023-06-15T10:30:00',
    location: 'Bureau principal',
  },
  {
    id: 'evt2',
    calendarId: 'cal1',
    title: 'Point commercial',
    start: '2023-06-15T14:00:00',
    end: '2023-06-15T15:00:00',
  },
  {
    id: 'evt3',
    calendarId: 'cal2',
    title: 'Déjeuner',
    start: '2023-06-15T12:00:00',
    end: '2023-06-15T13:30:00',
    location: 'Restaurant du coin',
  },
  {
    id: 'evt4',
    calendarId: 'cal3',
    title: 'Installation client A',
    start: '2023-06-15T08:00:00',
    end: '2023-06-15T12:00:00',
    location: 'Chez client A',
  },
  {
    id: 'evt5',
    calendarId: 'cal4',
    title: 'Livraison composants',
    start: '2023-06-15T16:00:00',
    end: '2023-06-15T16:30:00',
  },
];

const DailyCalendar: React.FC = () => {
  const theme = useTheme();
  const auth = useAuth();
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);

  // Load calendars on component mount
  useEffect(() => {
    const loadCalendars = async () => {
      try {
        setLoading(true);
        // For development, use mock data
        // const data = await fetchCalendars(auth.token);
        const data = mockCalendars;
        setCalendars(data);
        // Select all calendars by default
        setSelectedCalendars(data.map((cal) => cal.id));
      } catch (err) {
        console.error('Error fetching calendars:', err);
        setError('Impossible de récupérer les calendriers.');
      } finally {
        setLoading(false);
      }
    };

    loadCalendars();
  }, [auth.token]);

  // Load events when selected calendars or date changes
  useEffect(() => {
    const loadEvents = async () => {
      if (selectedCalendars.length === 0) {
        setEvents([]);
        return;
      }

      try {
        setLoading(true);
        // For development, use mock data
        // const data = await fetchCalendarEvents(auth.token, selectedCalendars, selectedDate.format('YYYY-MM-DD'));
        // Filter mock events by selected calendars
        const data = mockEvents.filter((event) =>
          selectedCalendars.includes(event.calendarId),
        );
        setEvents(data);
      } catch (err) {
        console.error('Error fetching events:', err);
        setError('Impossible de récupérer les événements.');
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [auth.token, selectedCalendars, selectedDate]);

  const handleCalendarToggle = (calendarId: string) => {
    setSelectedCalendars((prev) =>
      prev.includes(calendarId)
        ? prev.filter((id) => id !== calendarId)
        : [...prev, calendarId],
    );
  };

  const handleSelectAll = () => {
    setSelectedCalendars(calendars.map((cal) => cal.id));
  };

  const handleUnselectAll = () => {
    setSelectedCalendars([]);
  };

  const handlePrint = async () => {
    try {
      setLoading(true);

      // Generate PDF blob using the pdf function
      const blob = await pdf(
        <CalendarPdf
          date={selectedDate.format('YYYY-MM-DD')}
          calendars={calendars}
          events={events}
          selectedCalendarIds={selectedCalendars}
        />,
      ).toBlob();

      // Create a URL for the blob
      const blobUrl = URL.createObjectURL(blob);

      // Create an invisible iframe for printing
      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = 'none';
      printFrame.src = blobUrl;

      // When iframe is loaded, trigger print
      printFrame.onload = () => {
        try {
          printFrame.contentWindow?.print();
        } catch (err) {
          console.error('Error printing PDF:', err);
          setError("Erreur lors de l'impression");
          document.body.removeChild(printFrame);
          URL.revokeObjectURL(blobUrl);
        }
      };

      document.body.appendChild(printFrame);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError("Impossible de générer le PDF pour l'impression.");
    } finally {
      setLoading(false);
    }
  };

  const handleClosePdfPreview = () => {
    setPdfPreviewOpen(false);
  };

  const openInGoogleCalendar = (calendarId: string) => {
    const calendarUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(calendarId)}`;
    window.open(calendarUrl, '_blank');
  };

  const getEventsByTime = () => {
    return events.sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
    );
  };

  const getCalendarById = (calendarId: string): Calendar | undefined => {
    return calendars.find((cal) => cal.id === calendarId);
  };

  const formatEventTime = (start: string, end: string): string => {
    const startDate = dayjs(start);
    const endDate = dayjs(end);
    return `${startDate.format('HH:mm')} - ${endDate.format('HH:mm')}`;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid
            item
            xs={12}
            md={6}
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <Typography variant="h4" component="h1" sx={{ mr: 2, mb: 0 }}>
              Agenda
            </Typography>
            <DatePicker
              label="Date"
              value={selectedDate}
              onChange={(newValue) => newValue && setSelectedDate(newValue)}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            />
          </Grid>
          <Grid
            item
            xs={12}
            md={6}
            sx={{
              display: 'flex',
              justifyContent: { xs: 'flex-start', md: 'flex-end' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography component="span" sx={{ mr: 1 }}>
                Vue:
              </Typography>
              <Switch
                checked={viewMode === 'timeline'}
                onChange={() =>
                  setViewMode(viewMode === 'table' ? 'timeline' : 'table')
                }
              />
              <Typography component="span" sx={{ ml: 1 }}>
                {viewMode === 'table' ? 'Tableau' : 'Timeline'}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        {/* Calendar Selection */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Calendriers
            </Typography>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}
            >
              <Button size="small" onClick={handleSelectAll}>
                Tout sélectionner
              </Button>
              <Button size="small" onClick={handleUnselectAll}>
                Tout désélectionner
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />

            {loading && !calendars.length ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <FormGroup>
                {calendars.map((calendar) => (
                  <Box
                    key={calendar.id}
                    sx={{
                      mb: 1,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedCalendars.includes(calendar.id)}
                          onChange={() => handleCalendarToggle(calendar.id)}
                          sx={{
                            color: calendar.color,
                            '&.Mui-checked': {
                              color: calendar.color,
                            },
                          }}
                        />
                      }
                      label={calendar.name}
                    />
                    <Tooltip
                      title={`Ouvrir ${calendar.name} dans Google Calendar`}
                    >
                      <IconButton
                        size="small"
                        onClick={() => openInGoogleCalendar(calendar.id)}
                        color="primary"
                      >
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ))}
              </FormGroup>
            )}

            <Box
              sx={{
                mt: 3,
                pt: 2,
                borderTop: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Button
                variant="contained"
                startIcon={<PrintIcon />}
                onClick={handlePrint}
                fullWidth
                disabled={loading || selectedCalendars.length === 0}
              >
                Imprimer le planning
              </Button>

              {selectedCalendars.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <PDFDownloadLink
                    document={
                      <CalendarPdf
                        date={selectedDate.format('YYYY-MM-DD')}
                        calendars={calendars}
                        events={events}
                        selectedCalendarIds={selectedCalendars}
                      />
                    }
                    fileName={`Calendrier-${selectedDate.format('YYYY-MM-DD')}.pdf`}
                    style={{
                      textDecoration: 'none',
                      width: '100%',
                      display: 'block',
                    }}
                  >
                    {({ blob, url, loading, error }) => (
                      <Button
                        variant="outlined"
                        fullWidth
                        disabled={loading}
                        sx={{ mt: 1 }}
                      >
                        {loading
                          ? 'Préparation du PDF...'
                          : 'Télécharger le PDF'}
                      </Button>
                    )}
                  </PDFDownloadLink>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Events Display */}
        <Grid item xs={12} md={9}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center' }}
            >
              <CalendarMonthIcon sx={{ mr: 1 }} />
              Programme du {selectedDate.format('dddd D MMMM YYYY')}
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : events.length === 0 ? (
              <Alert severity="info">
                {selectedCalendars.length === 0
                  ? 'Veuillez sélectionner au moins un calendrier.'
                  : 'Aucun événement pour cette journée.'}
              </Alert>
            ) : viewMode === 'table' ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Horaire</TableCell>
                      <TableCell>Événement</TableCell>
                      <TableCell>Calendrier</TableCell>
                      <TableCell>Lieu</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getEventsByTime().map((event) => {
                      const calendar = getCalendarById(event.calendarId);
                      return (
                        <TableRow key={event.id}>
                          <TableCell>
                            {formatEventTime(event.start, event.end)}
                          </TableCell>
                          <TableCell>{event.title}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Box
                                sx={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  bgcolor: calendar?.color || '#ccc',
                                  mr: 1,
                                }}
                              />
                              {calendar?.name}
                            </Box>
                          </TableCell>
                          <TableCell>{event.location || '-'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ position: 'relative', mt: 2 }}>
                {/* Timeline View */}
                <Box
                  sx={{
                    display: 'flex',
                    height: '800px',
                    position: 'relative',
                  }}
                >
                  <Box
                    sx={{
                      width: '60px',
                      borderRight: `1px solid ${theme.palette.divider}`,
                      py: 1,
                    }}
                  >
                    {Array.from({ length: 17 }, (_, i) => i + 7).map((hour) => (
                      <Typography
                        key={hour}
                        variant="caption"
                        sx={{
                          position: 'absolute',
                          top: `${(hour - 7) * 50}px`,
                          right: 'calc(100% - 55px)',
                          fontWeight: 'bold',
                        }}
                      >
                        {`${hour}:00`}
                      </Typography>
                    ))}
                  </Box>
                  <Box sx={{ flexGrow: 1, position: 'relative', ml: 1 }}>
                    {getEventsByTime().map((event) => {
                      const calendar = getCalendarById(event.calendarId);

                      // Calculate position
                      const startHour =
                        dayjs(event.start).hour() +
                        dayjs(event.start).minute() / 60;
                      const endHour =
                        dayjs(event.end).hour() +
                        dayjs(event.end).minute() / 60;
                      const top = (startHour - 7) * 50; // Start at 7:00
                      const height = (endHour - startHour) * 50;

                      return (
                        <Box
                          key={event.id}
                          sx={{
                            position: 'absolute',
                            top: `${top}px`,
                            left: '5px',
                            width: 'calc(100% - 10px)',
                            height: `${height}px`,
                            backgroundColor: calendar
                              ? `${calendar.color}22`
                              : '#eee',
                            borderLeft: `4px solid ${calendar?.color || '#ccc'}`,
                            padding: 1,
                            borderRadius: 1,
                            overflow: 'hidden',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                            '&:hover': {
                              boxShadow: '0 3px 6px rgba(0,0,0,0.16)',
                            },
                          }}
                        >
                          <Typography variant="body2" fontWeight="bold" noWrap>
                            {event.title}
                          </Typography>
                          <Typography variant="caption" display="block" noWrap>
                            {formatEventTime(event.start, event.end)}
                          </Typography>
                          {event.location && (
                            <Typography
                              variant="caption"
                              display="block"
                              color="text.secondary"
                              noWrap
                            >
                              {event.location}
                            </Typography>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* PDF Preview Dialog */}
      <Dialog fullScreen open={pdfPreviewOpen} onClose={handleClosePdfPreview}>
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={handleClosePdfPreview} variant="contained">
              Fermer
            </Button>
          </Box>
          <Box sx={{ flexGrow: 1, height: 'calc(100% - 64px)' }}>
            <PDFViewer width="100%" height="100%" style={{ border: 'none' }}>
              <CalendarPdf
                date={selectedDate.format('YYYY-MM-DD')}
                calendars={calendars}
                events={events}
                selectedCalendarIds={selectedCalendars}
              />
            </PDFViewer>
          </Box>
        </Box>
      </Dialog>

      {/* Print-only styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-section, #print-section * {
            visibility: visible;
          }
          #print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </Box>
  );
};

export default DailyCalendar;
