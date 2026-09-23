'use client';

import { useEffect, useRef } from 'react';
import { Spinner } from '@forestar-be/ui';
import AccessDenied from '@/components/AccessDenied';
import { useAuth } from '@/lib/auth';
import { ALLOWED_ROLES } from '@/lib/session';

/**
 * Garde des écrans internes.
 *
 * En mode historique, c'est le provider de `@forestar-be/core/auth` qui
 * redirige vers `/login` ; la garde attend seulement le jeton. En mode SSO,
 * l'absence de session part directement vers l'IdP, et une session sans rôle
 * admis reçoit un refus explicite plutôt qu'une boucle de reconnexion.
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { ssoEnabled, isLoading, isAuthenticated, hasRole, loginAction, token } =
    useAuth();
  const redirected = useRef(false);

  useEffect(() => {
    if (!ssoEnabled || isLoading || isAuthenticated || redirected.current) {
      return;
    }
    redirected.current = true;
    void loginAction({ username: '', password: '' });
  }, [ssoEnabled, isLoading, isAuthenticated, loginAction]);

  const waiting = ssoEnabled ? isLoading || !isAuthenticated : !token;
  if (waiting) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (ssoEnabled && !hasRole(...ALLOWED_ROLES)) {
    return <AccessDenied application="l'Atelier" allowedRoles={ALLOWED_ROLES} />;
  }

  return <>{children}</>;
}
