import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Ce site a déménagé' };

const NEW_URL = 'https://atelier.forestar.be';

/** Servie à la place de l'application sur l'ancien domaine (voir `proxy.ts`). */
export default function DemenagePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-heading text-3xl font-semibold">
        Ce site a déménagé
      </h1>
      <p>
        Cette adresse n&apos;est plus utilisée. Il faut maintenant utiliser{' '}
        <a
          href={NEW_URL}
          className="font-medium text-primary underline underline-offset-4"
        >
          {NEW_URL}
        </a>
        .
      </p>
      <p className="text-muted-foreground">
        Merci de mettre à jour vos favoris : cette ancienne adresse sera
        bientôt désactivée.
      </p>
    </div>
  );
}
