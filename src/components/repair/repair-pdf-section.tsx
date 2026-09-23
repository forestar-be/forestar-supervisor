'use client';

import { useEffect } from 'react';
import { usePDF, type UsePDFInstance } from '@react-pdf/renderer';
import type { MachineRepair } from '@/lib/types';
import { RepairPdfDocument } from './repair-pdf-document';

/**
 * Génère le PDF de la fiche côté client, via `usePDF`.
 *
 * `@react-pdf/renderer` ne s'exécute jamais côté serveur : ce composant n'est
 * chargé que par `next/dynamic(..., { ssr: false })` depuis la page. Le
 * rendu se fait par prop-callback plutôt que par contexte, pour rester un
 * composant unique et simple à charger dynamiquement.
 */
export interface RepairPdfConfig {
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

interface RepairPdfSectionProps extends RepairPdfConfig {
  repair: MachineRepair | null;
  children: (instance: UsePDFInstance) => React.ReactNode;
}

export default function RepairPdfSection({
  repair,
  children,
  ...config
}: RepairPdfSectionProps) {
  const [instance, updateInstance] = usePDF({ document: undefined });

  useEffect(() => {
    if (repair) {
      updateInstance(<RepairPdfDocument repair={repair} {...config} />);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repair, config.hourlyRate, config.priceDevis, config.priceHivernage, config.conditions, config.address, config.phone, config.email, config.website, config.pdfTitle]);

  return <>{children(instance)}</>;
}
