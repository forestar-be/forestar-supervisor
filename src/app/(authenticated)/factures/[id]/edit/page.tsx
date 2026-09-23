import type { Metadata } from 'next';
import InvoiceEdit from '@/components/invoices/invoice-edit';

export const metadata: Metadata = { title: 'Modifier la facture' };

export default function Page() {
  return <InvoiceEdit />;
}
