import { Document, Image, Link, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { MachineRepair } from '@/lib/types';
import {
  getFormattedWorkingTime,
  getSuffixPrice,
  getTotalPrice,
  getTotalPriceParts,
  getWorkingTimePrice,
  replacedPartToString,
} from '@/lib/single-repair';

/**
 * PDF de la fiche réparation, porté de `Document.tsx` + `SingleRepairDocument.tsx`.
 *
 * `@react-pdf/renderer` a son propre reconciliateur : seuls `Page`, `Text`,
 * `View`, `Image`, `Link`… sont des primitives valides. L'ancien code
 * utilisait par endroits des `<div>` DOM, invalides ici — remplacés par
 * `View`, sans changement visuel voulu.
 */

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 20,
  },
  section: {
    flexDirection: 'row',
    gap: 10,
  },
  header: {
    fontSize: 12,
    marginTop: 10,
    fontWeight: 'bold',
    backgroundColor: '#a6a6a6',
    border: '1px solid black',
    padding: '5px 10px',
    textAlign: 'center',
  },
  textBox: {
    fontSize: 11,
    border: '1px solid black',
    padding: '5px 10px',
    width: '100%',
  },
  textBoxMultipleColumns: {
    flexDirection: 'row',
    width: '100%',
  },
  subHeaderLeftSection: {
    flexGrow: 1,
    maxWidth: '50%',
  },
  subHeaderRightSection: {
    flexGrow: 1,
    maxWidth: '50%',
    gap: 10,
  },
  subSingleSection: {
    flexGrow: 1,
  },
  issuerInfoBox: {
    marginTop: 4,
    padding: 10,
    color: '#000f6a',
    backgroundColor: '#e1e1e1',
    fontSize: 11,
    flexDirection: 'column',
  },
  subIssuerInfoBox: {
    fontSize: 11,
    flexDirection: 'column',
    marginBottom: 15,
  },
});

interface RepairPdfDocumentProps {
  repair: MachineRepair;
  hourlyRate: number;
  priceDevis: number;
  priceHivernage: number;
  conditions: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  pdfTitle: string;
}

export function RepairPdfDocument({
  repair,
  hourlyRate,
  priceDevis,
  priceHivernage,
  conditions,
  address,
  phone,
  email,
  website,
  pdfTitle,
}: RepairPdfDocumentProps) {
  const dateDuDepot = new Date(repair.createdAt).toLocaleDateString('fr-FR');
  const piecesRemplacees =
    repair.replaced_part_list.map(replacedPartToString).join(', ') ||
    'Aucune';
  const avecDevis = repair.devis
    ? `Oui${getSuffixPrice(repair.devis, priceDevis)}`
    : 'Non';
  const avecHivernage = repair.hivernage
    ? `Oui${getSuffixPrice(repair.hivernage, priceHivernage)}`
    : 'Non';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <View style={styles.subHeaderLeftSection}>
            {/* `Image` vient de `@react-pdf/renderer` (PDF, pas DOM) : pas d'`alt` possible. */}
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image style={{ width: '66%' }} src="/images/forestar_enhanced.png" />
            <View style={styles.issuerInfoBox}>
              <View style={styles.subIssuerInfoBox}>
                {address.split('\n').map((line, index) => (
                  <Text key={index}>{line}</Text>
                ))}
              </View>
              <View>
                <Text>{phone}</Text>
                <Link>{email}</Link>
                <Link>{website}</Link>
              </View>
            </View>
          </View>
          <View style={styles.subHeaderRightSection}>
            <Text style={styles.header}>{pdfTitle}</Text>
            <Text style={styles.textBox}>Date du dépôt : {dateDuDepot}</Text>
            <Text style={styles.textBox}>GSM Client : {repair.phone}</Text>
            <Text style={styles.textBox}>
              Nom : {repair.first_name} {repair.last_name}
            </Text>
            <Text style={styles.textBox}>
              Numéro de bon : {repair.id.toString()}
            </Text>
          </View>
        </View>
        <View style={styles.section}>
          <View style={styles.subSingleSection}>
            <Text style={styles.header}>Machine</Text>
            <View style={styles.textBoxMultipleColumns}>
              <Text
                style={{
                  ...styles.textBox,
                  borderRight: 'unset',
                  borderTop: 'unset',
                  borderBottom: 'unset',
                }}
              >
                Type: {repair.machine_type_name}
              </Text>
              <Text
                style={{
                  ...styles.textBox,
                  borderTop: 'unset',
                  borderBottom: 'unset',
                }}
              >
                Code robot: {repair.robot_code}
              </Text>
            </View>
            <Text style={styles.textBox}>Modèle: {repair.brand_name}</Text>
            <Text style={styles.header}>État</Text>
            <View style={styles.textBoxMultipleColumns}>
              <Text
                style={{
                  ...styles.textBox,
                  borderRight: 'unset',
                  borderTop: 'unset',
                }}
              >
                Type: {repair.repair_or_maintenance}
              </Text>
              <Text
                style={{
                  ...styles.textBox,
                  borderTop: 'unset',
                  borderRight: 'unset',
                }}
              >
                Garantie: {repair.warranty ? 'Oui' : 'Non'}
              </Text>
              <Text
                style={{
                  ...styles.textBox,
                  borderTop: 'unset',
                  borderRight: 'unset',
                }}
              >
                Devis: {avecDevis}
              </Text>
            </View>
            <Text style={styles.header}>Remarques</Text>
            <Text style={{ ...styles.textBox, borderTop: 'unset' }}>
              {repair.fault_description}
            </Text>
            <Text style={styles.header}>Travail</Text>
            <View style={styles.textBoxMultipleColumns}>
              <Text
                style={{
                  ...styles.textBox,
                  borderRight: 'unset',
                  borderTop: 'unset',
                  borderBottom: 'unset',
                }}
              >
                Temps passé: {getFormattedWorkingTime(repair.working_time_in_sec, false)}
              </Text>
              <Text
                style={{
                  ...styles.textBox,
                  borderTop: 'unset',
                  borderRight: 'unset',
                  borderBottom: 'unset',
                }}
              >
                Prix main d&apos;œuvre: {getWorkingTimePrice(repair, hourlyRate)}
              </Text>
              <Text
                style={{
                  ...styles.textBox,
                  borderTop: 'unset',
                  borderBottom: 'unset',
                }}
              >
                Hivernage: {avecHivernage}
              </Text>
            </View>
            <View style={styles.textBox}>
              <Text style={{ marginBottom: 5 }}>Travail effectué:</Text>
              <Text>{repair.remark ?? ''}</Text>
            </View>
            <View style={{ ...styles.textBox, borderTop: 'unset' }}>
              <Text style={{ marginBottom: 5 }}>
                Pièces remplacées: {piecesRemplacees}
              </Text>
            </View>
            <View style={{ ...styles.textBox, borderTop: 'unset' }}>
              <Text style={{ marginBottom: 5 }}>
                Prix des pièces: {getTotalPriceParts(repair)}
              </Text>
            </View>
            <View style={{ ...styles.textBox, borderTop: 'unset' }}>
              <Text style={{ marginBottom: 5 }}>
                Prix total: {getTotalPrice(repair, hourlyRate, priceHivernage)}
              </Text>
            </View>
            <Text style={styles.header}> Conditions générales de réparation</Text>
            <View style={styles.textBox}>
              {conditions.split('\n').map((line, index) => (
                <Text key={index}>{line}</Text>
              ))}
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
