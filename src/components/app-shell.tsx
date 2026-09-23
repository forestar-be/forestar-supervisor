'use client';

import {
  CalendarDays,
  ExternalLink,
  FileText,
  HardHat,
  Home,
  PhoneCall,
  Settings,
} from 'lucide-react';
import {
  AppShell as SharedAppShell,
  Button,
  ThemeToggle,
  type AppShellNavGroup,
} from '@forestar-be/ui';
import AccountMenu from '@/components/AccountMenu';
import { useAuth } from '@/lib/auth';
import { usePersistedState } from '@/lib/use-persisted-state';
import { ROBOT_URL } from '@/lib/session';

const navGroups: AppShellNavGroup[] = [
  {
    items: [
      { href: '/', label: 'Accueil', icon: Home },
      { href: '/ouvrier', label: 'Ouvrier', icon: HardHat },
      { href: '/appels', label: 'Appels', icon: PhoneCall },
      { href: '/calendrier', label: 'Calendrier', icon: CalendarDays },
      { href: '/factures', label: 'Factures', icon: FileText },
    ],
  },
  {
    items: [{ href: '/parametres', label: 'Paramètres', icon: Settings }],
  },
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
  const [collapsed, setCollapsed, hydrated] = usePersistedState(
    'atelier.navCollapsed',
    false,
  );

  const header = (
    <div className="flex flex-1 items-center justify-end gap-2">
      <Button
        variant="ghost"
        size="sm"
        nativeButton={false}
        render={<a href={ROBOT_URL} target="_blank" rel="noopener noreferrer" />}
      >
        Robots
        <ExternalLink />
      </Button>
      <ThemeToggle />
    </div>
  );

  return (
    <SharedAppShell
      // Remonté une fois la préférence lue : `defaultCollapsed` n'est lu
      // qu'au premier rendu de la coquille.
      key={hydrated ? 'hydrated' : 'initial'}
      variant="sidebar"
      navGroups={navGroups}
      brand={{ title: 'Atelier', logo, href: '/' }}
      onLogout={logOut}
      // Sans slot, AppShell affiche son bouton de déconnexion : c'est le
      // rendu voulu en mode historique, qui n'a ni identité ni console.
      accountSlot={ssoEnabled ? <AccountMenu /> : undefined}
      headerSlot={header}
      defaultCollapsed={collapsed}
      onCollapsedChange={setCollapsed}
      isItemActive={isItemActive}
    >
      {children}
    </SharedAppShell>
  );
}
