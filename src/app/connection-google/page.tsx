'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarCheck } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  Spinner,
} from '@forestar-be/ui';
import AuthGate from '@/components/auth-gate';
import { getAuthUrlGg, isAuthenticatedGg } from '@/lib/api';
import { useAuth } from '@/lib/auth';

/**
 * Ré-autorisation du compte Google qui tient l'agenda de l'atelier.
 *
 * Ce n'est pas un login utilisateur : l'API répond 403 `re_auth_gg_required`
 * quand son propre jeton Google a expiré, et `api.ts` renvoie ici.
 */
function GoogleReauth() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [authUrl, setAuthUrl] = useState('');

  useEffect(() => {
    if (!token) return;
    const checkAuth = async () => {
      try {
        const { isAuthenticated } = await isAuthenticatedGg(token);
        if (isAuthenticated) {
          router.replace(searchParams.get('redirect') || '/');
          return;
        }
        const { email, url } = await getAuthUrlGg(
          token,
          encodeURIComponent(window.location.href),
        );
        setEmail(email);
        setAuthUrl(url);
      } catch (err) {
        console.error(err);
        setError(
          "Une erreur est survenue lors de la vérification de l'authentification",
        );
      } finally {
        setLoading(false);
      }
    };
    void checkAuth();
  }, [token, router, searchParams]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-lg text-center">
        <CardContent className="space-y-4 p-8">
          <CalendarCheck className="mx-auto size-14 text-primary" />
          <h1 className="font-heading text-2xl font-semibold">
            Authentification à Google nécessaire
          </h1>
          <p className="text-muted-foreground">
            L&apos;application a besoin de se reconnecter au compte Google de{' '}
            <strong className="text-foreground">{email}</strong> pour pouvoir
            continuer à mettre à jour le Google Agenda.
          </p>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button
            size="lg"
            onClick={() => {
              if (authUrl) window.location.href = authUrl;
              else setError("URL d'authentification non disponible");
            }}
          >
            Se connecter avec Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ConnectionGooglePage() {
  return (
    <AuthGate>
      <Suspense>
        <GoogleReauth />
      </Suspense>
    </AuthGate>
  );
}
