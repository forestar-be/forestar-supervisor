/**
 * Doublure de `next/navigation` pour Vitest.
 *
 * Le paquet `@forestar-be/core/auth` importe `next/navigation`, que le
 * résolveur ESM de Vitest ne retrouve pas depuis le lien pnpm du paquet — Next
 * le résout par son propre bundler, pas par les conditions d'export standard.
 * La doublure ne remplace donc pas un comportement testé : elle rend seulement
 * le module chargeable.
 */

const noop = () => {};

export function useRouter() {
  return { push: noop, replace: noop, back: noop, refresh: noop, prefetch: noop };
}

export function usePathname() {
  return "/";
}

export function useSearchParams() {
  return new URLSearchParams();
}

export function redirect() {
  throw new Error("redirect() n'est pas simulé");
}
