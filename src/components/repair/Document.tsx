import React from 'react';
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image,
  Link,
} from '@react-pdf/renderer';

interface MyDocumentProps {
  dateDuDepot: string;
  gSMClient: string;
  nom: string;
  code: string;
  type: string;
  codeRobot: string;
  modele: string;
  typeReparation: string;
  avecGarantie: string;
  avecDevis: string;
  avecHivernage: string;
  remarques: string;
  prix: string;
  tempsPasse: string;
  piecesRemplacees: string;
  travailEffectue: string;
  prixPieces: string;
  prixTotal: string;
  conditions: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  pdfTitle: string;
}

// Create styles
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

const MyDocument = ({
  dateDuDepot,
  gSMClient,
  nom,
  code,
  type,
  codeRobot,
  modele,
  typeReparation,
  avecGarantie,
  avecDevis,
  avecHivernage,
  remarques,
  prix,
  tempsPasse,
  piecesRemplacees,
  prixPieces,
  travailEffectue,
  prixTotal,
  conditions,
  address,
  phone,
  email,
  website,
  pdfTitle,
}: MyDocumentProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.section}>
        <View style={styles.subHeaderLeftSection}>
          <Image style={{ width: '66%' }} src="/images/forestar_enhanced.png" />
          <div style={styles.issuerInfoBox}>
            <div style={styles.subIssuerInfoBox}>
              {address.split('\n').map((line, index) => (
                <Text key={index}>{line}</Text>
              ))}
            </div>
            <div>
              <Text>{phone}</Text>
              <Link>{email}</Link>
              <Link>{website}</Link>
            </div>
          </div>
        </View>
        <View style={styles.subHeaderRightSection}>
          <Text style={styles.header}>{pdfTitle}</Text>
          <Text style={styles.textBox}>Date du dépôt : {dateDuDepot}</Text>
          <Text style={styles.textBox}>GSM Client : {gSMClient}</Text>
          <Text style={styles.textBox}>Nom : {nom}</Text>
          <Text style={styles.textBox}>Numéro de bon : {code}</Text>
        </View>
      </View>
      <View style={styles.section}>
        <View style={styles.subSingleSection}>
          <Text style={styles.header}>Machine</Text>
          <div style={styles.textBoxMultipleColumns}>
            <Text
              style={{
                ...styles.textBox,
                borderRight: 'unset',
                borderTop: 'unset',
                borderBottom: 'unset',
              }}
            >
              Type: {type}
            </Text>
            <Text
              style={{
                ...styles.textBox,
                borderTop: 'unset',
                borderBottom: 'unset',
              }}
            >
              Code robot: {codeRobot}
            </Text>
          </div>
          <Text style={styles.textBox}>Modèle: {modele}</Text>
          <Text style={styles.header}>État</Text>
          <div style={styles.textBoxMultipleColumns}>
            <Text
              style={{
                ...styles.textBox,
                borderRight: 'unset',
                borderTop: 'unset',
              }}
            >
              Type: {typeReparation}
            </Text>
            <Text
              style={{
                ...styles.textBox,
                borderTop: 'unset',
                borderRight: 'unset',
              }}
            >
              Garantie: {avecGarantie}
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
          </div>
          <Text style={styles.header}>Remarques</Text>
          <Text style={{ ...styles.textBox, borderTop: 'unset' }}>
            {remarques}
          </Text>
          <Text style={styles.header}>Travail</Text>
          <div style={styles.textBoxMultipleColumns}>
            <Text
              style={{
                ...styles.textBox,
                borderRight: 'unset',
                borderTop: 'unset',
                borderBottom: 'unset',
              }}
            >
              Temps passé: {tempsPasse}
            </Text>
            <Text
              style={{
                ...styles.textBox,
                borderTop: 'unset',
                borderRight: 'unset',
                borderBottom: 'unset',
              }}
            >
              Prix main d'œuvre: {prix}
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
          </div>
          <div style={styles.textBox}>
            <Text style={{ marginBottom: 5 }}>Travail effectué:</Text>
            <Text>{travailEffectue}</Text>
          </div>
          <div style={{ ...styles.textBox, borderTop: 'unset' }}>
            <Text style={{ marginBottom: 5 }}>
              Pièces remplacées: {piecesRemplacees}
            </Text>
          </div>
          <div style={{ ...styles.textBox, borderTop: 'unset' }}>
            <Text style={{ marginBottom: 5 }}>
              Prix des pièces: {prixPieces}
            </Text>
          </div>
          <div style={{ ...styles.textBox, borderTop: 'unset' }}>
            <Text style={{ marginBottom: 5 }}>Prix total: {prixTotal}</Text>
          </div>
          <Text style={styles.header}> Conditions générales de réparation</Text>
          <div style={styles.textBox}>
            {conditions.split('\n').map((line, index) => (
              <Text key={index}>{line}</Text>
            ))}
          </div>
        </View>
      </View>
    </Page>
  </Document>
);

export default MyDocument;
