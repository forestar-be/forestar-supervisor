import type { Metadata } from 'next';
import InvoiceList from '@/components/invoices/invoice-list';

export const metadata: Metadata = { title: 'Factures' };

export default function Page() {
  return <InvoiceList />;
}
