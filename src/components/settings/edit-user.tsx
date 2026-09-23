'use client';

import { SSO_CONSOLE_URL } from '@/lib/session';
import { Button, Card, CardContent } from '@forestar-be/ui';
import { ExternalLink } from 'lucide-react';

/**
 * Les comptes vivent dans Zitadel depuis la bascule SSO : l'onglet ne fait
 * que renvoyer vers la console. Les comptes hérités de la table `User` du
 * serveur ne sont plus montrés, ils ne servent plus à se connecter.
 */
export default function EditUser() {
  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">
          Les comptes et leurs rôles se gèrent dans la console Zitadel.
        </p>
        <Button
          render={
            <a
              href={`${SSO_CONSOLE_URL.replace(/\/$/, '')}/users`}
              target="_blank"
              rel="noopener noreferrer"
            />
          }
          nativeButton={false}
        >
          Gérer les utilisateurs
          <ExternalLink />
        </Button>
      </CardContent>
    </Card>
  );
}
