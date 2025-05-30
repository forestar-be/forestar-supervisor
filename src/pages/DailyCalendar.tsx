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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Radio,
  RadioGroup,
  FormLabel,
  FormControl,
} from '@mui/material';
import { ToggleButtonGroup, ToggleButton } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PrintIcon from '@mui/icons-material/Print';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ScheduleIcon from '@mui/icons-material/Schedule';
import DescriptionIcon from '@mui/icons-material/Description';
import TableViewIcon from '@mui/icons-material/TableView';
import TimelineIcon from '@mui/icons-material/Timeline';
import SettingsIcon from '@mui/icons-material/Settings';
import PageLandscapeIcon from '@mui/icons-material/ViewDay';
import PagePortraitIcon from '@mui/icons-material/ViewArray';
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
window.Buffer = window.Buffer || require('buffer').Buffer;

// Flag to control location display
const WITH_LOCATION = true;

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
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [pdfOrientation, setPdfOrientation] = useState<
    'portrait' | 'landscape'
  >(() => {
    // Load from localStorage or default to 'portrait'
    const savedOrientation = localStorage.getItem('pdfOrientation');
    return savedOrientation === 'landscape' || savedOrientation === 'portrait'
      ? (savedOrientation as 'portrait' | 'landscape')
      : 'portrait';
  });
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  // Load calendars on component mount
  useEffect(() => {
    const loadCalendars = async () => {
      try {
        setLoading(true);
        const data = await fetchCalendars(auth.token);
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
        const data = await fetchCalendarEvents(
          auth.token,
          selectedCalendars,
          selectedDate.format('YYYY-MM-DD'),
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
          orientation={pdfOrientation}
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
    // Check for all-day events (dates without time or spanning multiple days)
    const startDate = dayjs(start);
    const endDate = dayjs(end);

    // Check if the event spans multiple days or if it's a date without time
    if (start.length <= 10 && end.length <= 10) {
      return 'Toute la journée';
    }

    return `${startDate.format('HH:mm')} - ${endDate.format('HH:mm')}`;
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setEventDialogOpen(true);
  };

  const handleCloseEventDialog = () => {
    setEventDialogOpen(false);
  };

  const handleOpenSettingsDialog = () => {
    setSettingsDialogOpen(true);
  };

  const handleCloseSettingsDialog = () => {
    setSettingsDialogOpen(false);
  };

  const handleOrientationChange = (orientation: 'portrait' | 'landscape') => {
    setPdfOrientation(orientation);
    localStorage.setItem('pdfOrientation', orientation);
    setSettingsDialogOpen(false);
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
              <ToggleButtonGroup
                color="primary"
                value={viewMode}
                exclusive
                onChange={(e, newValue) => {
                  if (newValue !== null) {
                    setViewMode(newValue);
                  }
                }}
                size="small"
                aria-label="mode d'affichage"
              >
                <Tooltip
                  arrow
                  title="Afficher les événements sous forme de tableau"
                >
                  <ToggleButton value="table" aria-label="vue tableau">
                    <TableViewIcon sx={{ mr: 0.5 }} /> Tableau
                  </ToggleButton>
                </Tooltip>
                <Tooltip
                  arrow
                  title="Afficher les événements dans une vue chronologique"
                >
                  <ToggleButton value="timeline" aria-label="vue chronologie">
                    <TimelineIcon sx={{ mr: 0.5 }} /> Chronologie
                  </ToggleButton>
                </Tooltip>
              </ToggleButtonGroup>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        {/* Calendar Selection */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>Calendriers</span>
              <Tooltip title="Paramètres PDF" arrow>
                <IconButton
                  size="small"
                  onClick={handleOpenSettingsDialog}
                  color="primary"
                >
                  <SettingsIcon fontSize="small" />
                </IconButton>
              </Tooltip>
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
                        orientation={pdfOrientation}
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

              <Box
                sx={{
                  mt: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Format PDF :{' '}
                  {pdfOrientation === 'portrait' ? 'Portrait' : 'Paysage'}
                  {pdfOrientation === 'portrait' ? (
                    <PagePortraitIcon
                      sx={{
                        ml: 0.5,
                        fontSize: '0.875rem',
                        verticalAlign: 'middle',
                      }}
                    />
                  ) : (
                    <PageLandscapeIcon
                      sx={{
                        ml: 0.5,
                        fontSize: '0.875rem',
                        verticalAlign: 'middle',
                      }}
                    />
                  )}
                </Typography>
              </Box>
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
                      {WITH_LOCATION && <TableCell>Lieu</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getEventsByTime().map((event) => {
                      const calendar = getCalendarById(event.calendarId);
                      return (
                        <TableRow
                          key={event.id}
                          onClick={() => handleEventClick(event)}
                          sx={{
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: theme.palette.action.hover,
                            },
                          }}
                        >
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
                          {WITH_LOCATION && (
                            <TableCell>{event.location || '-'}</TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ position: 'relative', mt: 2 }}>
                {/* All-day events section */}
                <Box
                  sx={{
                    mb: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                  }}
                >
                  {getEventsByTime()
                    .filter(
                      (event) =>
                        event.start.length <= 10 && event.end.length <= 10,
                    )
                    .map((event) => {
                      const calendar = getCalendarById(event.calendarId);
                      return (
                        <Box
                          key={event.id}
                          onClick={() => handleEventClick(event)}
                          sx={{
                            backgroundColor: calendar
                              ? `${calendar.color}22`
                              : '#eee',
                            borderLeft: `4px solid ${calendar?.color || '#ccc'}`,
                            padding: 1,
                            borderRadius: 1,
                            overflow: 'hidden',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                            cursor: 'pointer',
                            '&:hover': {
                              boxShadow: '0 3px 6px rgba(0,0,0,0.16)',
                              backgroundColor: theme.palette.action.hover,
                            },
                          }}
                        >
                          <Typography variant="body2" fontWeight="bold" noWrap>
                            {event.title}
                          </Typography>
                          {WITH_LOCATION && event.location && (
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
                    {getEventsByTime()
                      .filter(
                        (event) =>
                          !(event.start.length <= 10 && event.end.length <= 10),
                      )
                      .map((event) => {
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
                            onClick={() => handleEventClick(event)}
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
                              cursor: 'pointer',
                              '&:hover': {
                                boxShadow: '0 3px 6px rgba(0,0,0,0.16)',
                                backgroundColor: calendar
                                  ? `${calendar.color}33`
                                  : theme.palette.action.hover,
                              },
                            }}
                          >
                            <Typography
                              variant="body2"
                              fontWeight="bold"
                              noWrap
                            >
                              {event.title}
                            </Typography>
                            <Typography
                              variant="caption"
                              display="block"
                              noWrap
                            >
                              {formatEventTime(event.start, event.end)}
                            </Typography>
                            {WITH_LOCATION && event.location && (
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
                orientation={pdfOrientation}
              />
            </PDFViewer>
          </Box>
        </Box>
      </Dialog>

      {/* Event Detail Dialog */}
      <Dialog
        open={eventDialogOpen}
        onClose={handleCloseEventDialog}
        fullWidth
        maxWidth="sm"
      >
        {selectedEvent && (
          <>
            <Box
              sx={{
                position: 'relative',
                p: 3,
                pb: 0,
                backgroundColor: (() => {
                  const calendar = getCalendarById(selectedEvent.calendarId);
                  return calendar ? `${calendar.color}22` : undefined;
                })(),
                borderBottom: (() => {
                  const calendar = getCalendarById(selectedEvent.calendarId);
                  return `4px solid ${calendar?.color || theme.palette.primary.main}`;
                })(),
              }}
            >
              <DialogTitle sx={{ p: 0, fontSize: '1.5rem' }}>
                {selectedEvent.title}
              </DialogTitle>
              <Box sx={{ my: 1 }}>
                <Chip
                  size="small"
                  label={(() => {
                    const calendar = getCalendarById(selectedEvent.calendarId);
                    return calendar?.name || 'Calendrier';
                  })()}
                  sx={{
                    backgroundColor: (() => {
                      const calendar = getCalendarById(
                        selectedEvent.calendarId,
                      );
                      return calendar ? calendar.color : undefined;
                    })(),
                    color: '#fff',
                    mr: 1,
                  }}
                />
              </Box>
            </Box>
            <DialogContent sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box
                    sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}
                  >
                    <ScheduleIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2">
                      {selectedEvent.start.length <= 10 &&
                      selectedEvent.end.length <= 10
                        ? `Toute la journée - Du ${dayjs(selectedEvent.start).format('DD/MM/YYYY')} au ${dayjs(selectedEvent.end).format('DD/MM/YYYY')}`
                        : `${dayjs(selectedEvent.start).format('DD/MM/YYYY HH:mm')} - ${dayjs(selectedEvent.end).format('DD/MM/YYYY HH:mm')}`}
                    </Typography>
                  </Box>
                </Grid>

                {WITH_LOCATION && selectedEvent.location && (
                  <Grid item xs={12}>
                    <Box
                      sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}
                    >
                      <LocationOnIcon sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2">
                        {selectedEvent.location}
                      </Typography>
                    </Box>
                  </Grid>
                )}

                {selectedEvent.description && (
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                      <DescriptionIcon
                        sx={{ mr: 1, color: 'text.secondary' }}
                      />
                      <Box>
                        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                          Description
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            whiteSpace: 'pre-wrap',
                            backgroundColor: theme.palette.background.default,
                            p: 2,
                            borderRadius: 1,
                          }}
                        >
                          {selectedEvent.description}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseEventDialog}>Fermer</Button>
            </DialogActions>
          </>
        )}
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

      {/* PDF Settings Dialog */}
      <Dialog open={settingsDialogOpen} onClose={handleCloseSettingsDialog}>
        <DialogTitle>Paramètres du PDF</DialogTitle>
        <DialogContent>
          <FormControl component="fieldset" sx={{ mt: 1 }}>
            <FormLabel component="legend">Orientation</FormLabel>
            <RadioGroup
              value={pdfOrientation}
              onChange={(e) =>
                handleOrientationChange(
                  e.target.value as 'portrait' | 'landscape',
                )
              }
            >
              <FormControlLabel
                value="portrait"
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PagePortraitIcon sx={{ mr: 1 }} /> Portrait
                  </Box>
                }
              />
              <FormControlLabel
                value="landscape"
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PageLandscapeIcon sx={{ mr: 1 }} /> Paysage
                  </Box>
                }
              />
            </RadioGroup>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSettingsDialog}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DailyCalendar;
