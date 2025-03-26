import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFViewer,
} from '@react-pdf/renderer';
import { PurchaseOrder } from '../utils/types';

// Register fonts if needed
// Font.register({
//   family: 'Roboto',
//   fonts: [
//     { src: '/fonts/Roboto-Regular.ttf', fontWeight: 'normal' },
//     { src: '/fonts/Roboto-Bold.ttf', fontWeight: 'bold' },
//   ]
// });

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1pt solid #000000',
    paddingBottom: 10,
  },
  logo: {
    width: 150,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  title: {
    fontSize: 20,
    marginBottom: 15,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 15,
    backgroundColor: '#f0f0f0',
    padding: 5,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  column: {
    flexDirection: 'column',
    marginBottom: 10,
  },
  label: {
    width: '30%',
    fontSize: 12,
    fontWeight: 'bold',
  },
  value: {
    width: '70%',
    fontSize: 12,
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    width: 'auto',
    marginBottom: 15,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000000',
    breakInside: 'avoid',
    breakAfter: 'avoid',
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableRowHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
  },
  tableCol: {
    width: '33.33%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000000',
    padding: 5,
  },
  tableCell: {
    margin: 5,
    fontSize: 10,
  },
  tableCellHeader: {
    margin: 5,
    fontSize: 10,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    fontSize: 10,
    textAlign: 'center',
    borderTop: '1pt solid #000000',
    paddingTop: 10,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    fontSize: 10,
  },
  signature: {
    marginTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBox: {
    width: '45%',
    height: 100,
    border: '1pt solid #000000',
    padding: 10,
  },
  signatureLabel: {
    fontSize: 10,
    marginBottom: 70,
  },
  noteText: {
    fontSize: 12,
    marginTop: 10,
    marginBottom: 10,
    lineHeight: 1.5,
  },
});

// Format price to display Euros
const formatPrice = (price: number | null | undefined): string => {
  if (price === null || price === undefined) return '-';
  return `${price.toLocaleString('fr-FR')} €`;
};

// Format date to display in French format
const formatDate = (date: string | null | undefined): string => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('fr-FR');
};

interface PurchaseOrderPdfProps {
  purchaseOrder: PurchaseOrder;
}

// Component to display the PDF
export const PurchaseOrderPdfViewer: React.FC<PurchaseOrderPdfProps> = ({
  purchaseOrder,
}) => {
  return (
    <PDFViewer style={{ width: '100%', height: '100vh' }}>
      <PurchaseOrderPdfDocument purchaseOrder={purchaseOrder} />
    </PDFViewer>
  );
};

// Document component for the PDF
export const PurchaseOrderPdfDocument: React.FC<PurchaseOrderPdfProps> = ({
  purchaseOrder,
}) => {
  // Check if we need a second page for installation notes
  const hasInstallationNotes = !!purchaseOrder.installationNotes;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {/* Replace with actual logo */}
          {/* <Image style={styles.logo} src="/logo.png" /> */}
          <Text style={styles.headerText}>FORESTAR</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>BON DE COMMANDE</Text>
        <Text>Date: {formatDate(purchaseOrder.createdAt)}</Text>

        {/* Client Information */}
        <View style={styles.sectionTitle}>
          <Text>INFORMATIONS CLIENT</Text>
        </View>
        <View style={styles.column}>
          <View style={styles.row}>
            <Text style={styles.label}>Nom:</Text>
            <Text style={styles.value}>
              {purchaseOrder.clientFirstName} {purchaseOrder.clientLastName}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Adresse:</Text>
            <Text style={styles.value}>{purchaseOrder.clientAddress}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Ville:</Text>
            <Text style={styles.value}>{purchaseOrder.clientCity}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Téléphone:</Text>
            <Text style={styles.value}>{purchaseOrder.clientPhone}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Acompte:</Text>
            <Text style={styles.value}>
              {formatPrice(purchaseOrder.deposit)}
            </Text>
          </View>
        </View>

        {/* Robot Details */}
        <View style={styles.sectionTitle}>
          <Text>DÉTAILS DU ROBOT ET ACCESSOIRES</Text>
        </View>
        <View style={styles.column}>
          <View style={styles.row}>
            <Text style={styles.label}>Robot:</Text>
            <Text style={styles.value}>
              {purchaseOrder.robotInventory?.name}{' '}
              {purchaseOrder.robotInventory?.reference
                ? `(${purchaseOrder.robotInventory.reference})`
                : ''}
            </Text>
          </View>
          {purchaseOrder.pluginType && (
            <View style={styles.row}>
              <Text style={styles.label}>Plugin:</Text>
              <Text style={styles.value}>{purchaseOrder.pluginType}</Text>
            </View>
          )}
          {purchaseOrder.antennaType && (
            <View style={styles.row}>
              <Text style={styles.label}>Antenne:</Text>
              <Text style={styles.value}>{purchaseOrder.antennaType}</Text>
            </View>
          )}
          {purchaseOrder.hasWire && (
            <View style={styles.row}>
              <Text style={styles.label}>Filaire:</Text>
              <Text style={styles.value}>
                Oui{' '}
                {purchaseOrder.wireLength
                  ? `(${purchaseOrder.wireLength} mètres)`
                  : ''}
              </Text>
            </View>
          )}
          {purchaseOrder.hasAntennaSupport && (
            <View style={styles.row}>
              <Text style={styles.label}>Support antenne:</Text>
              <Text style={styles.value}>Oui (+50€)</Text>
            </View>
          )}
          {purchaseOrder.shelterType && (
            <View style={styles.row}>
              <Text style={styles.label}>Type d'abri:</Text>
              <Text style={styles.value}>{purchaseOrder.shelterType}</Text>
            </View>
          )}
          {purchaseOrder.shelterPrice && purchaseOrder.shelterPrice > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Prix abri:</Text>
              <Text style={styles.value}>
                {formatPrice(purchaseOrder.shelterPrice)}
              </Text>
            </View>
          )}
        </View>

        {/* Installation */}
        <View style={styles.sectionTitle}>
          <Text>INSTALLATION</Text>
        </View>
        <View style={styles.column}>
          <View style={styles.row}>
            <Text style={styles.label}>Date d'installation:</Text>
            <Text style={styles.value}>
              {formatDate(purchaseOrder.installationDate)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Installateur:</Text>
            <Text style={styles.value}>
              {purchaseOrder.needsInstaller ? 'Oui' : 'Non'}
            </Text>
          </View>
          {hasInstallationNotes && (
            <View style={styles.row}>
              <Text style={styles.label}>Notes:</Text>
              <Text style={styles.value}>Voir page suivante</Text>
            </View>
          )}
        </View>

        {/* Summary */}
        <View style={styles.sectionTitle}>
          <Text>RÉCAPITULATIF</Text>
        </View>
        <View style={styles.table}>
          <View style={styles.tableRowHeader}>
            <View style={styles.tableCol}>
              <Text style={styles.tableCellHeader}>Description</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCellHeader}>Quantité</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCellHeader}>Prix</Text>
            </View>
          </View>
          <View style={styles.tableRow}>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>
                {purchaseOrder.robotInventory?.name}
              </Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>1</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>
                {formatPrice(purchaseOrder.robotInventory?.sellingPrice)}
              </Text>
            </View>
          </View>
          {purchaseOrder.antennaType && (
            <View style={styles.tableRow}>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  Antenne {purchaseOrder.antennaType}
                </Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>1</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>-</Text>
              </View>
            </View>
          )}
          {purchaseOrder.pluginType && (
            <View style={styles.tableRow}>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  Plugin {purchaseOrder.pluginType}
                </Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>1</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>-</Text>
              </View>
            </View>
          )}
          {purchaseOrder.hasWire && (
            <View style={styles.tableRow}>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  Filaire{' '}
                  {purchaseOrder.wireLength
                    ? `(${purchaseOrder.wireLength} mètres)`
                    : ''}
                </Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>1</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>-</Text>
              </View>
            </View>
          )}
          {purchaseOrder.hasAntennaSupport && (
            <View style={styles.tableRow}>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>Support antenne</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>1</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>50 €</Text>
              </View>
            </View>
          )}
          {purchaseOrder.shelterPrice && purchaseOrder.shelterPrice > 0 && (
            <View style={styles.tableRow}>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  Abri{' '}
                  {purchaseOrder.shelterType &&
                    `(${purchaseOrder.shelterType})`}
                </Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>1</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  {formatPrice(purchaseOrder.shelterPrice)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Second page for installation notes if they exist */}
        {hasInstallationNotes && (
          <>
            <View style={styles.sectionTitle}>
              <Text>NOTES D'INSTALLATION</Text>
            </View>
            <View style={styles.column}>
              <Text style={styles.noteText}>
                {purchaseOrder.installationNotes}
              </Text>
            </View>
          </>
        )}
      </Page>
    </Document>
  );
};

export default PurchaseOrderPdfViewer;
