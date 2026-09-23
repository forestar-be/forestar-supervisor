import { useSyncExternalStore } from 'react';

/**
 * `true` quand la media query correspond. Côté serveur et au premier rendu
 * d'hydratation, renvoie `false` : le rendu initial est celui du bureau.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
