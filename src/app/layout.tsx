import type { Metadata } from 'next';
import { ForestarProviders } from '@forestar-be/ui';
import { fontVariables } from '@forestar-be/ui/fonts';
import { AuthProvider } from '@/lib/auth';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Forestar Shop Atelier',
    template: '%s | Forestar Shop Atelier',
  },
  description: "Forestar Shop Atelier — réparations, agenda et factures",
  robots: { index: false, follow: false },
  icons: { icon: '/images/logo/favicon.ico' },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      className={`${fontVariables} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col font-sans">
        <ForestarProviders>
          <AuthProvider>{children}</AuthProvider>
        </ForestarProviders>
      </body>
    </html>
  );
}
