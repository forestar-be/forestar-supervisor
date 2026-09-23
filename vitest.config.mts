import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Le chemin d'authentification se choisit au chargement du module : seul un
 * chargement réel dans chacun des deux modes le vérifie.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    // Transformés pour que l'alias de `next/navigation` s'applique aussi aux
    // imports faits à l'intérieur des paquets, et que `next/link` (sans
    // extension, importé par l'ui) se résolve.
    server: { deps: { inline: ['@forestar-be/core', '@forestar-be/ui'] } },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'next/navigation': fileURLToPath(
        new URL('./test/next-navigation-stub.ts', import.meta.url),
      ),
    },
  },
});
