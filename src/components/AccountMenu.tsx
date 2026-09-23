'use client';

import {
  Building2,
  ExternalLink,
  Key,
  LogOut,
  RefreshCw,
  UserCog,
  Users,
} from 'lucide-react';
import {
  buildAccountMenu,
  displayNameOf,
  initialsOf,
  roleLabelsOf,
} from '@forestar-be/core';
import {
  Avatar,
  AvatarFallback,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@forestar-be/ui';
import { useAuth } from '@/lib/auth';
import { SSO_ISSUER } from '@/lib/session';

const ICONS: Record<string, typeof Key> = {
  password: Key,
  profile: UserCog,
  'admin-users': Users,
  'admin-org': Building2,
};

/**
 * Bouton avatar et menu de compte (SSO). Les entrées de compte ouvrent la
 * console de l'IdP dans un nouvel onglet ; « Changer de compte » repart vers
 * l'IdP avec `prompt=select_account`.
 */
export default function AccountMenu() {
  const auth = useAuth();

  // En mode historique il n'y a ni identité ni console : AppShell affiche
  // alors son bouton de déconnexion.
  if (!auth.ssoEnabled) return null;

  const entries = buildAccountMenu({ issuer: SSO_ISSUER, roles: auth.roles });
  const accountEntries = entries.filter((e) => e.group === 'account');
  const adminEntries = entries.filter((e) => e.group === 'admin');
  const roles = roleLabelsOf(auth.roles);

  const renderEntry = (entry: (typeof entries)[number]) => {
    const Icon = ICONS[entry.id] ?? Key;
    return (
      <DropdownMenuItem
        key={entry.id}
        render={
          <a href={entry.href} target="_blank" rel="noopener noreferrer" />
        }
      >
        <Icon />
        <span className="flex-1">{entry.label}</span>
        <ExternalLink className="opacity-40" />
      </DropdownMenuItem>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label="Mon compte"
          />
        }
      >
        <Avatar className="size-8">
          <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
            {initialsOf(auth.user)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-medium">
            {displayNameOf(auth.user)}
          </p>
          {auth.user?.email && (
            <p className="truncate text-xs text-muted-foreground">
              {auth.user.email}
            </p>
          )}
          {roles.length > 0 && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {roles.join(' · ')}
            </p>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>{accountEntries.map(renderEntry)}</DropdownMenuGroup>
        {adminEntries.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Administration</DropdownMenuLabel>
              {adminEntries.map(renderEntry)}
            </DropdownMenuGroup>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => auth.switchAccount()}>
            <RefreshCw />
            Changer de compte
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => auth.logOut()}>
            <LogOut />
            Se déconnecter
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
