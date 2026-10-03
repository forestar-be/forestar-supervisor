'use client';

import {
  CalendarDays,
  FileText,
  HardHat,
  History,
  Home,
  PhoneCall,
  Settings,
  Users,
} from 'lucide-react';
import {
  AppShell as SharedAppShell,
  ThemeToggle,
  type AppShellNavItem,
} from '@forestar-be/ui';
import AppMenu from '@/components/AppMenu';
import AccountMenu from '@/components/AccountMenu';
import { useAuth } from '@/lib/auth';
import { useTrackInAppHistory } from '@/lib/in-app-history';

const navItems: AppShellNavItem[] = [
  { href: '/', label: 'Accueil', icon: Home },
  { href: '/historique', label: 'Historique', icon: History },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/ouvrier', label: 'Ouvrier', icon: HardHat },
  { href: '/appels', label: 'Appels', icon: PhoneCall },
  { href: '/calendrier', label: 'Calendrier', icon: CalendarDays },
  { href: '/factures', label: 'Factures', icon: FileText },
  { href: '/parametres', label: 'Paramètres', icon: Settings, iconOnly: true },
];

const logo = (
  <>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src="/images/logo/logo-70x70.png"
      alt=""
      className="size-9 dark:hidden"
    />
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src="/images/logo/logo-dark-70x70.png"
      alt=""
      className="hidden size-9 dark:block"
    />
  </>
);

/** L'accueil ne doit pas rester actif sur toutes les pages. */
const isItemActive = (item: { href: string }, pathname: string) =>
  item.href === '/'
    ? pathname === '/' || pathname.startsWith('/reparation/')
    : pathname === item.href || pathname.startsWith(`${item.href}/`);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { logOut, ssoEnabled } = useAuth();
  useTrackInAppHistory();

  const header = (
    <>
      <ThemeToggle />
      <AppMenu />
    </>
  );

  return (
    <SharedAppShell
      navItems={navItems}
      brand={{ title: 'Atelier', logo, href: '/' }}
      onLogout={logOut}
      // Sans slot, AppShell affiche son bouton de déconnexion : c'est le
      // rendu voulu en mode historique, qui n'a ni identité ni console.
      accountSlot={ssoEnabled ? <AccountMenu /> : undefined}
      headerSlot={header}
      isItemActive={isItemActive}
      fullWidth
    >
      {children}
    </SharedAppShell>
  );
}
