'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@forestar-be/ui';
import { useAuth } from '@/lib/auth';

/**
 * En mode SSO, cette page n'affiche plus de formulaire : les identifiants se
 * saisissent chez Zitadel. Elle reste une route valide parce que d'anciens
 * liens et favoris y mènent encore ; elle repart aussitôt vers l'IdP.
 */
function SsoLoginRedirect() {
  const { loginAction } = useAuth();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void loginAction({ username: '', password: '' });
  }, [loginAction]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-4">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        Redirection vers l&apos;authentification Forestar…
      </p>
    </div>
  );
}

export default function LoginPage() {
  const { loginAction, ssoEnabled } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await loginAction({ username, password });
    if (!result.success) setError(result.message);
    setLoading(false);
  };

  // Après les hooks : leur ordre doit rester identique d'un rendu à l'autre.
  if (ssoEnabled) return <SsoLoginRedirect />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="glass-card animate-scale-in w-full max-w-md">
        <CardHeader className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo/logo-70x70.png"
            alt=""
            className="mx-auto mb-2 size-16"
          />
          <CardTitle className="text-2xl">Forestar Shop Atelier</CardTitle>
          <CardDescription>Connectez-vous pour continuer</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="username">Identifiant</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              Se connecter
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
