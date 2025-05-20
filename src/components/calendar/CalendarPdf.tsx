import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import { Calendar, CalendarEvent } from '../../utils/api';
import dayjs from 'dayjs';

// Define styles for the PDF document
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
  tableHeader: {
    backgroundColor: '#F5F5F5',
    fontWeight: 'bold',
  },
  tableCell: {
    padding: 5,
    fontSize: 10,
  },
  timeCell: {
    width: '15%',
  },
  eventCell: {
    width: '40%',
  },
  calendarCell: {
    width: '20%',
  },
  locationCell: {
    width: '25%',
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
});

interface CalendarPdfProps {
  date: string;
  calendars: Calendar[];
  events: CalendarEvent[];
  selectedCalendarIds: string[];
  isDarkMode?: boolean;
  title?: string;
}

// Format time from ISO string to HH:MM
const formatTime = (isoString: string) => {
  return dayjs(isoString).format('HH:mm');
};

// Format date from ISO string to full date
const formatDate = (isoString: string) => {
  return dayjs(isoString).format('dddd D MMMM YYYY');
};

const CalendarPdf: React.FC<CalendarPdfProps> = ({
  date,
  calendars,
  events,
  selectedCalendarIds,
  isDarkMode = false,
  title = 'FORESTAR',
}) => {
  // Filter calendars to only show selected ones
  const selectedCalendars = calendars.filter((cal) =>
    selectedCalendarIds.includes(cal.id),
  );

  // Sort events by start time
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );

  // Get the correct logo path based on isDarkMode
  const logoPath = isDarkMode
    ? '/images/logo/logo-dark-70x70.png'
    : '/images/logo/logo-70x70.png';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
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
              <Text style={[styles.tableCell, styles.timeCell]}>Horaire</Text>
              <Text style={[styles.tableCell, styles.eventCell]}>
                Événement
              </Text>
              <Text style={[styles.tableCell, styles.calendarCell]}>
                Calendrier
              </Text>
              <Text style={[styles.tableCell, styles.locationCell]}>Lieu</Text>
            </View>

            {sortedEvents.map((event) => {
              const calendar = calendars.find(
                (cal) => cal.id === event.calendarId,
              );
              return (
                <View style={styles.tableRow} key={event.id}>
                  <Text style={[styles.tableCell, styles.timeCell]}>
                    {formatTime(event.start)} - {formatTime(event.end)}
                  </Text>
                  <Text style={[styles.tableCell, styles.eventCell]}>
                    {event.title}
                  </Text>
                  <Text style={[styles.tableCell, styles.calendarCell]}>
                    {calendar?.name || '-'}
                  </Text>
                  <Text style={[styles.tableCell, styles.locationCell]}>
                    {event.location || '-'}
                  </Text>
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
};

export default CalendarPdf;
