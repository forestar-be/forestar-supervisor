import React, { useState } from 'react';
import { Button } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import { PDFDownloadLink } from '@react-pdf/renderer';
import RepairerWorkPdf from '../pdf/RepairerWorkPdf';
import { MachineRepair } from '../../utils/types';

interface LazyPdfDownloadLinkProps {
  repairerName: string;
  repairs: MachineRepair[];
  adresse: string;
  telephone: string;
  email: string;
  siteWeb: string;
}

/**
 * Composant qui charge PDFDownloadLink seulement au premier hover/focus
 * pour éviter de générer le PDF à chaque render
 */
const LazyPdfDownloadLink: React.FC<LazyPdfDownloadLinkProps> = ({
  repairerName,
  repairs,
  adresse,
  telephone,
  email,
  siteWeb,
}) => {
  const [shouldLoad, setShouldLoad] = useState(false);

  // Preload on hover or focus
  const handleInteraction = () => {
    if (!shouldLoad) {
      setShouldLoad(true);
    }
  };

  if (!shouldLoad) {
    return (
      <Button
        variant="contained"
        startIcon={<PrintIcon />}
        onMouseEnter={handleInteraction}
        onFocus={handleInteraction}
        onClick={handleInteraction}
      >
        Télécharger PDF
      </Button>
    );
  }

  return (
    <PDFDownloadLink
      document={
        <RepairerWorkPdf
          repairerName={repairerName}
          repairs={repairs}
          date={new Date().toLocaleDateString('fr-FR')}
          adresse={adresse}
          telephone={telephone}
          email={email}
          siteWeb={siteWeb}
        />
      }
      fileName={`Planning-${repairerName}-${new Date().toISOString().split('T')[0]}.pdf`}
      style={{ textDecoration: 'none' }}
    >
      {({ loading: pdfLoading }) => (
        <Button
          variant="contained"
          startIcon={<PrintIcon />}
          disabled={pdfLoading}
        >
          {pdfLoading ? 'Génération...' : 'Télécharger PDF'}
        </Button>
      )}
    </PDFDownloadLink>
  );
};

export default LazyPdfDownloadLink;
