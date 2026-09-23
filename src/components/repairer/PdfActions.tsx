'use client';

import { useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { Button } from '@forestar-be/ui';
import { notifyError } from '@/lib/notifications';
import type { MachineRepairListItem } from '@/lib/types';
import type RepairerWorkPdfComponent from './RepairerWorkPdf';
import type { PDFDownloadLink as PDFDownloadLinkComponent } from '@react-pdf/renderer';

interface PdfActionsProps {
  repairerName: string;
  repairs: MachineRepairListItem[];
  adresse: string;
  telephone: string;
  email: string;
  siteWeb: string;
}

/**
 * Actions PDF de la vue ouvrier : impression directe et téléchargement.
 *
 * `@react-pdf/renderer` n'est jamais importé de façon statique — uniquement
 * via `import()` déclenché par une interaction utilisateur (clic, survol,
 * focus), pour qu'il ne s'exécute jamais côté serveur.
 */
export default function PdfActions({
  repairerName,
  repairs,
  adresse,
  telephone,
  email,
  siteWeb,
}: PdfActionsProps) {
  const [printing, setPrinting] = useState(false);
  const [downloadReady, setDownloadReady] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  // Chargés paresseusement au premier survol/focus/clic sur « Télécharger PDF ».
  const [modules, setModules] = useState<{
    PDFDownloadLink: typeof PDFDownloadLinkComponent;
    RepairerWorkPdf: typeof RepairerWorkPdfComponent;
  } | null>(null);

  const date = new Date().toLocaleDateString('fr-FR');
  const fileName = `Planning-${repairerName}-${new Date().toISOString().split('T')[0]}.pdf`;

  const loadPdfModules = () =>
    Promise.all([
      import('@react-pdf/renderer'),
      import('./RepairerWorkPdf'),
    ]).then(([pdfModule, docModule]) => ({
      pdf: pdfModule.pdf,
      PDFDownloadLink: pdfModule.PDFDownloadLink,
      RepairerWorkPdf: docModule.default,
    }));

  const handlePrint = () => {
    setPrinting(true);
    loadPdfModules()
      .then(({ pdf, RepairerWorkPdf }) =>
        pdf(
          <RepairerWorkPdf
            repairerName={repairerName}
            repairs={repairs}
            date={date}
            adresse={adresse}
            telephone={telephone}
            email={email}
            siteWeb={siteWeb}
          />,
        ).toBlob(),
      )
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        const printFrame = document.createElement('iframe');
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = 'none';
        printFrame.src = blobUrl;
        printFrame.onload = () => {
          try {
            printFrame.contentWindow?.print();
          } catch (error) {
            console.error('Error printing PDF:', error);
            notifyError("Erreur lors de l'impression");
          } finally {
            window.setTimeout(() => {
              document.body.removeChild(printFrame);
              URL.revokeObjectURL(blobUrl);
            }, 1000);
          }
        };
        document.body.appendChild(printFrame);
      })
      .catch((error: unknown) => {
        console.error('Error generating PDF:', error);
        notifyError("Impossible de générer le PDF pour l'impression.");
      })
      .finally(() => setPrinting(false));
  };

  const preloadDownload = () => {
    if (downloadReady || downloadLoading) return;
    setDownloadLoading(true);
    loadPdfModules()
      .then(({ PDFDownloadLink, RepairerWorkPdf }) => {
        setModules({ PDFDownloadLink, RepairerWorkPdf });
        setDownloadReady(true);
      })
      .catch((error: unknown) => {
        console.error('Error loading PDF module:', error);
        notifyError('Impossible de préparer le téléchargement du PDF.');
      })
      .finally(() => setDownloadLoading(false));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={handlePrint} disabled={printing}>
        <Printer />
        Imprimer
      </Button>

      {modules ? (
        <modules.PDFDownloadLink
          document={
            <modules.RepairerWorkPdf
              repairerName={repairerName}
              repairs={repairs}
              date={date}
              adresse={adresse}
              telephone={telephone}
              email={email}
              siteWeb={siteWeb}
            />
          }
          fileName={fileName}
        >
          {({ loading }) => (
            <Button size="sm" disabled={loading}>
              <Download />
              {loading ? 'Génération...' : 'Télécharger PDF'}
            </Button>
          )}
        </modules.PDFDownloadLink>
      ) : (
        <Button
          size="sm"
          onMouseEnter={preloadDownload}
          onFocus={preloadDownload}
          onClick={preloadDownload}
          disabled={downloadLoading}
        >
          <Download />
          {downloadLoading ? 'Préparation...' : 'Télécharger PDF'}
        </Button>
      )}
    </div>
  );
}
