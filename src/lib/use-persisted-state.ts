'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

/**
 * État persisté dans `localStorage`, sûr au rendu serveur.
 *
 * `useSyncExternalStore` rend `initialValue` côté serveur et pendant
 * l'hydratation, puis la valeur stockée : lire le stockage dans un
 * initialiseur de `useState` casserait l'hydratation. `hydrated` indique que
 * la valeur stockée est désormais celle rendue.
 */
const listeners = new Map<string, Set<() => void>>();

function notify(key: string) {
  listeners.get(key)?.forEach((listener) => listener());
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function usePersistedState<T>(
  key: string,
  initialValue: T,
): [T, (next: T | ((previous: T) => T)) => void, boolean] {
  const subscribe = useCallback(
    (listener: () => void) => {
      const set = listeners.get(key) ?? new Set();
      set.add(listener);
      listeners.set(key, set);
      const onStorage = (event: StorageEvent) => {
        if (event.key === key) listener();
      };
      window.addEventListener('storage', onStorage);
      return () => {
        set.delete(listener);
        window.removeEventListener('storage', onStorage);
      };
    },
    [key],
  );

  const raw = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => undefined,
  );
  const hydrated = raw !== undefined;

  // `raw` est une chaîne : la mémoïsation évite un nouvel objet à chaque rendu.
  const value = useMemo<T>(() => {
    if (raw === undefined || raw === null) return initialValue;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return initialValue;
    }
    // `initialValue` n'est lu qu'à défaut de valeur stockée.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw]);

  const update = useCallback(
    (next: T | ((previous: T) => T)) => {
      const previousRaw = read(key);
      let previous = initialValue;
      if (previousRaw !== null) {
        try {
          previous = JSON.parse(previousRaw) as T;
        } catch {
          // valeur illisible : on repart de la valeur initiale
        }
      }
      const resolved =
        typeof next === 'function'
          ? (next as (previous: T) => T)(previous)
          : next;
      try {
        window.localStorage.setItem(key, JSON.stringify(resolved));
      } catch {
        // Stockage plein ou interdit : la préférence ne survivra pas.
      }
      notify(key);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  return [value, update, hydrated];
}
