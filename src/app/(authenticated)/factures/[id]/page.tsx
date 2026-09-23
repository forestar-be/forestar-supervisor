import type { Metadata } from 'next';
import InvoiceDetail from '@/components/invoices/invoice-detail';

export const metadata: Metadata = { title: 'Facture' };

export default function Page() {
  return <InvoiceDetail />;
}
