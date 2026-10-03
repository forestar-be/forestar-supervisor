'use client';

import { ExternalLink, Grip } from 'lucide-react';
import { buildAppMenu, groupAppMenu } from '@forestar-be/core';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@forestar-be/ui';

/**
 * Bouton « Applications » : la liste de tous les sites Forestar, tirée du
 * catalogue de `@forestar-be/core`. Non filtrée par rôle ; chaque lien s'ouvre
 * dans un nouvel onglet pour ne rien faire perdre de la page en cours.
 */
export default function AppMenu() {
  const sections = groupAppMenu(buildAppMenu({ current: 'supervisor' }));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Applications"
            title="Applications"
          />
        }
      >
        <Grip className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 max-w-[calc(100vw-1rem)]"
      >
        {sections.map((section, index) => (
          <DropdownMenuGroup key={section.group}>
            {index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel>{section.label}</DropdownMenuLabel>
            {section.entries.map((entry) =>
              entry.current ? (
                <div
                  key={entry.id}
                  aria-current="page"
                  className="flex items-start gap-2 rounded-md bg-accent/60 px-1.5 py-1.5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      {entry.label}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {entry.description}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                    Vous êtes ici
                  </span>
                </div>
              ) : (
                <DropdownMenuItem
                  key={entry.id}
                  className="items-start py-1.5"
                  render={
                    <a
                      href={entry.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      {entry.label}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {entry.description}
                    </span>
                  </span>
                  <ExternalLink className="mt-0.5 opacity-40" />
                </DropdownMenuItem>
              ),
            )}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
