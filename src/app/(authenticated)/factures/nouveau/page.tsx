import type { Metadata } from 'next';
import InvoiceCreate from '@/components/invoices/invoice-create';

export const metadata: Metadata = { title: 'Nouvelle facture' };

export default function Page() {
  return <InvoiceCreate />;
}
