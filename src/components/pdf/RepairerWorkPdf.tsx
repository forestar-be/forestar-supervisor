import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import { MachineRepair } from '../../utils/types';
import {
  formatWorkTime,
  getDaysSinceCreation,
} from '../../utils/repairerWorkUtils';
import dayjs from 'dayjs';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 10,
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
  subtitle: {
    fontSize: 14,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 10,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
  },
  statBox: {
    flex: 1,
    marginRight: 10,
  },
  statLabel: {
    fontSize: 8,
    color: '#666',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 700,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    marginTop: 15,
    marginBottom: 10,
    color: '#333',
  },
  repairCard: {
    marginBottom: 15,
    padding: 12,
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: 5,
  },
  repairHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 5,
    borderBottom: '1px solid #eee',
  },
  repairNumber: {
    fontSize: 14,
    fontWeight: 700,
  },
  repairState: {
    fontSize: 9,
    backgroundColor: '#e0e0e0',
    padding: '3px 8px',
    borderRadius: 3,
  },
  repairRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  repairLabel: {
    width: 80,
    fontSize: 9,
    color: '#666',
  },
  repairValue: {
    flex: 1,
    fontSize: 9,
    fontWeight: 500,
  },
  repairDescription: {
    marginTop: 6,
    padding: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 3,
    fontSize: 9,
    fontStyle: 'italic',
    color: '#555',
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
  warningBadge: {
    fontSize: 8,
    backgroundColor: '#ff9800',
    color: '#fff',
    padding: '2px 6px',
    borderRadius: 3,
    marginLeft: 5,
  },
  delayedBadge: {
    fontSize: 8,
    backgroundColor: '#f44336',
    color: '#fff',
    padding: '2px 6px',
    borderRadius: 3,
    marginLeft: 5,
  },
});

interface RepairerWorkPdfProps {
  repairerName: string;
  repairs: MachineRepair[];
  date: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  siteWeb?: string;
  isDarkMode?: boolean;
  title?: string;
}

/**
 * Document PDF pour imprimer le planning d'un ouvrier
 */
const RepairerWorkPdf: React.FC<RepairerWorkPdfProps> = ({
  repairerName,
  repairs,
  date,
  adresse,
  telephone,
  email,
  siteWeb,
  isDarkMode = false,
  title = 'FORESTAR',
}) => {
  // Get the correct logo path based on isDarkMode
  const logoPath = isDarkMode
    ? '/images/logo/logo-dark-70x70.png'
    : '/images/logo/logo-70x70.png';
  // Calculate statistics
  const notStarted = repairs.filter(
    (r) => !r.state || r.state === 'Non commencé',
  ).length;
  const inProgress = repairs.filter((r) => r.state === 'En cours').length;
  const waiting = repairs.filter(
    (r) =>
      r.state &&
      (r.state.includes('attente') ||
        r.state === 'À rappeler' ||
        r.state.includes('Devis')),
  ).length;
  const totalSeconds = repairs.reduce(
    (sum, r) => sum + (r.working_time_in_sec || 0),
    0,
  );
  const totalHours = Math.round((totalSeconds / 3600) * 10) / 10;

  // Group repairs by state
  const groupedRepairs: Record<string, MachineRepair[]> = {};
  repairs.forEach((repair) => {
    const state = repair.state || 'Non commencé';
    if (!groupedRepairs[state]) {
      groupedRepairs[state] = [];
    }
    groupedRepairs[state].push(repair);
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Image style={styles.logo} src={logoPath} />
            <Text style={styles.headerTitleLogo}>{title}</Text>
          </View>
          <Text style={styles.headerTitle}>Planning Ouvrier</Text>
          <Text style={styles.subtitle}>{repairerName}</Text>
          <Text style={styles.infoText}>{date}</Text>
        </View>

        {/* Statistics */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={styles.statValue}>{repairs.length}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Non commencées</Text>
            <Text style={styles.statValue}>{notStarted}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>En cours</Text>
            <Text style={styles.statValue}>{inProgress}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>En attente</Text>
            <Text style={styles.statValue}>{waiting}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Temps total</Text>
            <Text style={styles.statValue}>{totalHours}h</Text>
          </View>
        </View>

        {/* Repairs grouped by state */}
        {Object.entries(groupedRepairs).map(([state, stateRepairs]) => (
          <View key={state}>
            <Text style={styles.sectionTitle}>
              {state} ({stateRepairs.length})
            </Text>

            {stateRepairs.map((repair) => {
              const daysSince = getDaysSinceCreation(repair.createdAt);
              const delayed =
                (!repair.state || repair.state === 'Non commencé') &&
                daysSince > 7;
              const needsAttention =
                daysSince > 3 && (!repair.state || repair.state !== 'En cours');

              return (
                <View key={repair.id} style={styles.repairCard}>
                  {/* Header */}
                  <View style={styles.repairHeader}>
                    <Text style={styles.repairNumber}>
                      #{repair.id} - {repair.machine_type_name}
                      {delayed && (
                        <Text style={styles.delayedBadge}> EN RETARD </Text>
                      )}
                      {!delayed && needsAttention && (
                        <Text style={styles.warningBadge}> ATTENTION </Text>
                      )}
                    </Text>
                    <Text style={styles.repairState}>{state}</Text>
                  </View>

                  {/* Details */}
                  <View style={styles.repairRow}>
                    <Text style={styles.repairLabel}>Client:</Text>
                    <Text style={styles.repairValue}>
                      {repair.first_name} {repair.last_name}
                    </Text>
                  </View>

                  {repair.phone && (
                    <View style={styles.repairRow}>
                      <Text style={styles.repairLabel}>Téléphone:</Text>
                      <Text style={styles.repairValue}>{repair.phone}</Text>
                    </View>
                  )}

                  <View style={styles.repairRow}>
                    <Text style={styles.repairLabel}>Machine:</Text>
                    <Text style={styles.repairValue}>
                      {repair.brand_name}
                      {repair.robot_type_name && ` - ${repair.robot_type_name}`}
                    </Text>
                  </View>

                  {repair.robot_code && (
                    <View style={styles.repairRow}>
                      <Text style={styles.repairLabel}>Code robot:</Text>
                      <Text style={styles.repairValue}>
                        {repair.robot_code}
                      </Text>
                    </View>
                  )}

                  <View style={styles.repairRow}>
                    <Text style={styles.repairLabel}>Créé il y a:</Text>
                    <Text style={styles.repairValue}>
                      {daysSince} jour{daysSince > 1 ? 's' : ''}
                    </Text>
                  </View>

                  {repair.working_time_in_sec > 0 && (
                    <View style={styles.repairRow}>
                      <Text style={styles.repairLabel}>Temps passé:</Text>
                      <Text style={styles.repairValue}>
                        {formatWorkTime(repair.working_time_in_sec)}
                      </Text>
                    </View>
                  )}

                  {repair.fault_description && (
                    <View style={styles.repairDescription}>
                      <Text>{repair.fault_description}</Text>
                    </View>
                  )}

                  {repair.remark && (
                    <View style={styles.repairDescription}>
                      <Text>Remarque: {repair.remark}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ))}

        {/* Footer */}
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

export default RepairerWorkPdf;
