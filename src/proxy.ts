import { NextResponse, type NextRequest } from 'next/server';

const LEGACY_HOSTNAME = 'forestar-shop-atelier.be';

/**
 * L'ancien domaine sert encore l'application : on y affiche l'avis de
 * déménagement au lieu de l'atelier, sans rediriger, pour que la personne
 * mette ses favoris à jour.
 */
export function proxy(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0];
  if (host === LEGACY_HOSTNAME && request.nextUrl.pathname !== '/demenage') {
    return NextResponse.rewrite(new URL('/demenage', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/|images/|favicon.ico|robots.txt).*)'],
};
