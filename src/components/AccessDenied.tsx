'use client';

import { LockKeyhole, LogOut, RefreshCw } from 'lucide-react';
import { roleLabelsOf, type ForestarRole } from '@forestar-be/core';
import { Button, Card, CardContent } from '@forestar-be/ui';
import { useAuth } from '@/lib/auth';

interface Props {
  /** Nom de l'application, tel qu'une personne la nomme. */
  application: string;
  /** Rôles qui ouvriraient cet écran. */
  allowedRoles: readonly ForestarRole[];
}

/**
 * Refus de rôle : la session est valide mais ne porte pas le rôle attendu.
 * « Changer de compte » est la sortie utile sur un poste partagé de l'atelier.
 */
export default function AccessDenied({ application, allowedRoles }: Props) {
  const auth = useAuth();
  const required = roleLabelsOf(allowedRoles);
  const held = roleLabelsOf(auth.roles);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="w-full max-w-lg text-center">
        <CardContent className="space-y-3 p-8">
          <LockKeyhole className="mx-auto h-14 w-14 text-warning" />
          <h1 className="text-lg font-semibold">Accès non autorisé</h1>
          <p className="text-sm text-muted-foreground">
            Votre compte est bien authentifié, mais il ne porte pas les droits
            nécessaires à {application}.
          </p>
          <p className="text-sm text-muted-foreground">
            {required.length === 1
              ? `Cet écran demande le rôle « ${required[0]} ».`
              : `Cet écran demande l'un des rôles suivants : ${required.join(', ')}.`}{' '}
            {held.length > 0
              ? `Votre compte porte ${held.join(', ')}.`
              : "Votre compte ne porte aucun rôle Forestar pour l'instant."}
          </p>
          <p className="text-sm text-muted-foreground">
            Si vous pensez devoir y accéder, demandez ce rôle à l&apos;atelier —
            c&apos;est une autorisation à ajouter, pas un problème de mot de
            passe.
          </p>
          <div className="flex flex-col justify-center gap-3 pt-3 sm:flex-row">
            <Button onClick={() => auth.switchAccount()}>
              <RefreshCw />
              Changer de compte
            </Button>
            <Button variant="outline" onClick={() => auth.logOut()}>
              <LogOut />
              Se déconnecter
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
