import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { Calendar, CalendarEvent } from '@/lib/api';
import dayjs from '@/lib/dayjs';

/**
 * PDF du planning du jour, porté de `src/components/calendar/CalendarPdf.tsx`.
 * Seuls `Document`, `Page`, `Text`, `View`, `Image`… de `@react-pdf/renderer`
 * sont des primitives valides ici (pas de DOM) : ce module n'est chargé que
 * dynamiquement, côté client, par `calendar-page.tsx`.
 */

const WITH_LOCATION = true;

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  logo: {
    width: 40,
    height: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  headerTitleLogo: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    marginLeft: 10,
  },
  headerDate: {
    fontSize: 14,
    marginBottom: 10,
  },
  calendarsList: {
    fontSize: 10,
    marginBottom: 20,
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    marginVertical: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    minHeight: 30,
    display: 'flex',
    alignItems: 'center',
  },
  eventRow: {
    flexDirection: 'column',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingVertical: 8,
  },
  tableHeader: {
    backgroundColor: '#F5F5F5',
    fontWeight: 'bold',
  },
  tableCell: {
    padding: 5,
    fontSize: 10,
  },
  timeCell: { width: '15%' },
  eventCell: { width: WITH_LOCATION ? '40%' : '50%' },
  calendarCell: { width: WITH_LOCATION ? '20%' : '35%' },
  locationCell: { width: '25%', display: WITH_LOCATION ? 'flex' : 'none' },
  tableCellLandscape: { padding: 5, fontSize: 11 },
  timeCellLandscape: { width: '12%' },
  eventCellLandscape: { width: WITH_LOCATION ? '45%' : '58%' },
  calendarCellLandscape: { width: WITH_LOCATION ? '18%' : '30%' },
  locationCellLandscape: {
    width: '25%',
    display: WITH_LOCATION ? 'flex' : 'none',
  },
  noEvents: {
    fontSize: 12,
    marginTop: 20,
    fontStyle: 'italic',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 10,
    color: '#666666',
  },
  colorIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  calendarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  eventMainInfo: {
    flexDirection: 'row',
    width: '100%',
  },
  descriptionContainer: {
    marginTop: 4,
    marginLeft: 15,
    paddingLeft: 5,
    borderLeftWidth: 1,
    borderLeftColor: '#CCCCCC',
  },
  descriptionText: {
    fontSize: 9,
    color: '#444444',
    fontStyle: 'italic',
  },
  eventLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 2,
  },
});

interface CalendarPdfProps {
  date: string;
  calendars: Calendar[];
  events: CalendarEvent[];
  selectedCalendarIds: string[];
  isDarkMode?: boolean;
  title?: string;
  orientation?: 'portrait' | 'landscape';
}

const formatTime = (isoString: string) => dayjs(isoString).format('HH:mm');
const formatDate = (isoString: string) => dayjs(isoString).format('dddd D MMMM YYYY');
const isAllDayEvent = (start: string, end: string) =>
  start.length <= 10 && end.length <= 10;
const formatEventTime = (start: string, end: string) =>
  isAllDayEvent(start, end)
    ? 'Toute la journée'
    : `${formatTime(start)} - ${formatTime(end)}`;

export function CalendarPdf({
  date,
  calendars,
  events,
  selectedCalendarIds,
  isDarkMode = false,
  title = 'FORESTAR',
  orientation = 'portrait',
}: CalendarPdfProps) {
  const selectedCalendars = calendars.filter((cal) =>
    selectedCalendarIds.includes(cal.id),
  );
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );
  const logoPath = isDarkMode
    ? '/images/logo/logo-dark-70x70.png'
    : '/images/logo/logo-70x70.png';
  const pageStyles = {
    ...styles.page,
    ...(orientation === 'landscape'
      ? { paddingTop: 20, paddingBottom: 20 }
      : {}),
  };
  const cellStyle = orientation === 'landscape' ? styles.tableCellLandscape : styles.tableCell;
  const timeCellStyle = orientation === 'landscape' ? styles.timeCellLandscape : styles.timeCell;
  const eventCellStyle = orientation === 'landscape' ? styles.eventCellLandscape : styles.eventCell;
  const calendarCellStyle = orientation === 'landscape' ? styles.calendarCellLandscape : styles.calendarCell;
  const locationCellStyle = orientation === 'landscape' ? styles.locationCellLandscape : styles.locationCell;

  return (
    <Document>
      <Page size="A4" orientation={orientation} style={pageStyles}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image style={styles.logo} src={logoPath} />
            <Text style={styles.headerTitleLogo}>{title}</Text>
          </View>
          <Text style={styles.headerTitle}>Agenda</Text>
          <Text style={styles.headerDate}>{formatDate(date)}</Text>

          <View style={styles.calendarsList}>
            <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>
              Calendriers inclus :
            </Text>
            {selectedCalendars.map((calendar) => (
              <View style={styles.calendarItem} key={calendar.id}>
                <View
                  style={[
                    styles.colorIndicator,
                    { backgroundColor: calendar.color },
                  ]}
                />
                <Text>{calendar.name}</Text>
              </View>
            ))}
          </View>
        </View>
        {sortedEvents.length > 0 ? (
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[cellStyle, timeCellStyle]}>Horaire</Text>
              <Text style={[cellStyle, eventCellStyle]}>Événement</Text>
              <Text style={[cellStyle, calendarCellStyle]}>Calendrier</Text>
              {WITH_LOCATION && (
                <Text style={[cellStyle, locationCellStyle]}>Lieu</Text>
              )}
            </View>

            {sortedEvents.map((event) => {
              const calendar = calendars.find((cal) => cal.id === event.calendarId);
              return (
                <View style={styles.eventRow} key={event.id}>
                  <View style={styles.eventMainInfo}>
                    <Text style={[cellStyle, timeCellStyle]}>
                      {formatEventTime(event.start, event.end)}
                    </Text>
                    <Text style={[cellStyle, eventCellStyle]}>{event.title}</Text>
                    <Text style={[cellStyle, calendarCellStyle]}>
                      {calendar?.name || '-'}
                    </Text>
                    <Text style={[cellStyle, locationCellStyle]}>
                      {WITH_LOCATION ? event.location || '-' : '-'}
                    </Text>
                  </View>

                  {event.description && (
                    <View style={styles.descriptionContainer}>
                      <Text style={styles.eventLabel}>Description:</Text>
                      <Text style={styles.descriptionText}>
                        {event.description}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.noEvents}>
            Aucun événement pour cette journée.
          </Text>
        )}
        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `Généré le ${dayjs().format('DD/MM/YYYY')} à ${dayjs().format('HH:mm')} - Page ${pageNumber} / ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
