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
// Garder la valeur écrite en mémoire : un aller-retour JSON recréerait aussi
// les branches inchangées (tri, filtres…), déclenchant le retour à la première
// page de TanStack Table à chaque changement de pagination.
const snapshots = new Map<string, { raw: string; value: unknown }>();

function decode<T>(key: string, raw: string): T {
  const cached = snapshots.get(key);
  if (cached?.raw === raw) return cached.value as T;
  const value = JSON.parse(raw) as T;
  snapshots.set(key, { raw, value });
  return value;
}

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
      return decode<T>(key, raw);
    } catch {
      return initialValue;
    }
    // `initialValue` n'est lu qu'à défaut de valeur stockée.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, raw]);

  const update = useCallback(
    (next: T | ((previous: T) => T)) => {
      const previousRaw = read(key);
      let previous = initialValue;
      if (previousRaw !== null) {
        try {
          previous = decode<T>(key, previousRaw);
        } catch {
          // valeur illisible : on repart de la valeur initiale
        }
      }
      const resolved =
        typeof next === 'function'
          ? (next as (previous: T) => T)(previous)
          : next;
      try {
        const serialized = JSON.stringify(resolved);
        window.localStorage.setItem(key, serialized);
        snapshots.set(key, { raw: serialized, value: resolved });
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
