import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFViewer,
} from '@react-pdf/renderer';
import {
  PurchaseOrder,
  InstallationPreparationText,
  InstallationTextType,
} from '../utils/types';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

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

// Format date to display in French format
const formatDate = (date: string | null | undefined): string => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('fr-FR');
};

// Custom formatter for PDF prices to avoid issues with non-breaking spaces
const formatPriceForPdf = (price: number | null | undefined): string => {
  if (price === null || price === undefined) return '-';
  // Format with standard method but replace non-breaking spaces with regular spaces
  const formatted = price.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatted.replace(/\s/g, ' ') + ' €';
};

// Define constant for antenna support price
const ANTENNA_SUPPORT_PRICE = 50;
// Define constant for placement price
const PLACEMENT_PRICE = 200;

interface PurchaseOrderPdfProps {
  purchaseOrder: PurchaseOrder;
}

// Component to display the PDF
export const PurchaseOrderPdfViewer: React.FC<PurchaseOrderPdfProps> = ({
  purchaseOrder,
}) => {
  const { texts } = useSelector((state: RootState) => state.installationTexts);

  return (
    <PDFViewer style={{ width: '100%', height: '100vh' }}>
      <PurchaseOrderPdfDocument
        purchaseOrder={purchaseOrder}
        installationTexts={texts}
      />
    </PDFViewer>
  );
};

// Document component for the PDF
export const PurchaseOrderPdfDocument: React.FC<{
  purchaseOrder: PurchaseOrder;
  installationTexts?: InstallationPreparationText[];
}> = ({ purchaseOrder, installationTexts }) => {
  // Check if we need a third page for installation notes
  const hasInstallationNotes = !!purchaseOrder.installationNotes;
  const hasInstallationTexts =
    installationTexts && installationTexts.length > 0;

  // Calculate total price
  const calculateTotalPrice = () => {
    let total = purchaseOrder.robotInventory?.sellingPrice || 0;

    if (purchaseOrder.plugin?.sellingPrice) {
      total += purchaseOrder.plugin?.sellingPrice;
    }

    if (purchaseOrder.antenna?.sellingPrice) {
      total += purchaseOrder.antenna?.sellingPrice;
    }

    if (purchaseOrder.shelter?.sellingPrice) {
      total += purchaseOrder.shelter?.sellingPrice;
    }

    if (purchaseOrder.hasAntennaSupport) {
      total += ANTENNA_SUPPORT_PRICE;
    }

    if (purchaseOrder.hasPlacement) {
      total += PLACEMENT_PRICE;
    }

    return total;
  };

  // Function to render installation preparation text based on its type
  const renderInstallationText = (text: InstallationPreparationText) => {
    switch (text.type) {
      case InstallationTextType.TITLE:
        return (
          <Text
            key={text.id}
            style={{
              fontSize: 16,
              fontWeight: 'bold',
              marginTop: 15,
              marginBottom: 10,
            }}
          >
            {text.content}
          </Text>
        );
      case InstallationTextType.SUBTITLE:
        return (
          <Text
            key={text.id}
            style={{
              fontSize: 14,
              fontWeight: 'bold',
              marginTop: 12,
              marginBottom: 8,
            }}
          >
            {text.content}
          </Text>
        );
      case InstallationTextType.SUBTITLE2:
        return (
          <Text
            key={text.id}
            style={{
              fontSize: 12,
              fontWeight: 'bold',
              marginTop: 10,
              marginBottom: 6,
            }}
          >
            {text.content}
          </Text>
        );
      case InstallationTextType.PARAGRAPH:
      default:
        return (
          <Text
            key={text.id}
            style={{ fontSize: 10, marginBottom: 10, lineHeight: 1.5 }}
          >
            {text.content}
          </Text>
        );
    }
  };

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
              {formatPriceForPdf(purchaseOrder.deposit)}
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
          {purchaseOrder.plugin && (
            <View style={styles.row}>
              <Text style={styles.label}>Plugin:</Text>
              <Text style={styles.value}>{purchaseOrder.plugin.name}</Text>
            </View>
          )}
          {purchaseOrder.antenna && (
            <View style={styles.row}>
              <Text style={styles.label}>Antenne:</Text>
              <Text style={styles.value}>{purchaseOrder.antenna.name}</Text>
            </View>
          )}
          {purchaseOrder.shelter && (
            <View style={styles.row}>
              <Text style={styles.label}>Abri:</Text>
              <Text style={styles.value}>{purchaseOrder.shelter.name}</Text>
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
          {purchaseOrder.hasPlacement && (
            <View style={styles.row}>
              <Text style={styles.label}>Placement:</Text>
              <Text style={styles.value}>Oui (+200€)</Text>
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
              <Text style={styles.value}>
                {purchaseOrder.installationNotes}
              </Text>
            </View>
          )}
        </View>
      </Page>

      {/* Second page with summary */}
      <Page size="A4" style={styles.page}>
        {/* Header for consistency */}
        <View style={styles.header}>
          <Text style={styles.headerText}>FORESTAR</Text>
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
                {formatPriceForPdf(
                  purchaseOrder.robotInventory?.sellingPrice || 0,
                )}
              </Text>
            </View>
          </View>
          {purchaseOrder.antenna && (
            <View style={styles.tableRow}>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  Antenne {purchaseOrder.antenna.name}
                </Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>1</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  {formatPriceForPdf(purchaseOrder.antenna?.sellingPrice || 0)}
                </Text>
              </View>
            </View>
          )}
          {purchaseOrder.plugin && (
            <View style={styles.tableRow}>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  Plugin {purchaseOrder.plugin.name}
                </Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>1</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  {formatPriceForPdf(purchaseOrder.plugin?.sellingPrice || 0)}
                </Text>
              </View>
            </View>
          )}
          {purchaseOrder.shelter && (
            <View style={styles.tableRow}>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  Abri {purchaseOrder.shelter.name}
                </Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>1</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  {formatPriceForPdf(purchaseOrder.shelter?.sellingPrice || 0)}
                </Text>
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
                <Text style={styles.tableCell}>
                  {formatPriceForPdf(ANTENNA_SUPPORT_PRICE)}
                </Text>
              </View>
            </View>
          )}
          {purchaseOrder.hasPlacement && (
            <View style={styles.tableRow}>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>Placement</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>1</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  {formatPriceForPdf(PLACEMENT_PRICE)}
                </Text>
              </View>
            </View>
          )}
          <View style={[styles.tableRow, { backgroundColor: '#f0f0f0' }]}>
            <View style={styles.tableCol}>
              <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>
                TOTAL
              </Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}></Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>
                {formatPriceForPdf(calculateTotalPrice())}
              </Text>
            </View>
          </View>
          <View style={[styles.tableRow]}>
            <View style={styles.tableCol}>
              <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>
                ACOMPTE
              </Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}></Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={[styles.tableCell]}>
                {formatPriceForPdf(purchaseOrder.deposit)}
              </Text>
            </View>
          </View>
          <View style={[styles.tableRow, { backgroundColor: '#f0f0f0' }]}>
            <View style={styles.tableCol}>
              <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>
                RESTE À PAYER
              </Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}></Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>
                {formatPriceForPdf(
                  (calculateTotalPrice() || 0) - (purchaseOrder.deposit || 0),
                )}
              </Text>
            </View>
          </View>
        </View>
      </Page>

      {/* Third page with installation preparation instructions */}
      {hasInstallationTexts && (
        <Page size="A4" style={styles.page}>
          {/* Header for consistency */}
          <View style={styles.header}>
            <Text style={styles.headerText}>FORESTAR</Text>
          </View>

          {/* Installation preparation texts */}
          <View style={styles.column}>
            {installationTexts?.map((text) => renderInstallationText(text))}
          </View>
        </Page>
      )}
    </Document>
  );
};

export default PurchaseOrderPdfViewer;
