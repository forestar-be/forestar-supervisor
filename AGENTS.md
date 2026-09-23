<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Projet

**Atelier** (`atelier.forestar.be`) : suivi des réparations et entretiens de l'atelier Forestar. Application Next.js 16 (App Router) qui consomme l'API de `forestar-server`, routes `/supervisor/*`. Elle a été migrée de CRA + MUI + AG Grid en septembre 2026.

## Stack

- Next.js 16 + Turbopack, React 19, TypeScript strict
- **`@forestar-be/ui` + `@forestar-be/core`** : design system commun ([forestar-frontend](https://github.com/forestar-be/forestar-frontend)), Base UI + Tailwind 4
- Redux Toolkit : store par client (`makeStore`), avec la configuration et les textes d'installation
- dayjs (`@/lib/dayjs`) ; `@react-pdf/renderer`, chargé uniquement côté client par `import()`
- Vitest + Testing Library

## Commandes

Node 22 est requis (`nvm use 22`). Le gestionnaire est pnpm.

```bash
pnpm dev          # développement
pnpm run build    # build de production (obligatoire avant fusion)
pnpm run lint
pnpm run typecheck
pnpm test
```

## Authentification

Le mode d'authentification est fixé au chargement par `NEXT_PUBLIC_AUTH_MODE` :

- `oidc` en production : le cookie SSO est porté par `api.forestar.be`, `token` vaut la sentinelle `SSO_SESSION_TOKEN` et ne sert jamais d'en-tête, les mutations envoient `X-CSRF-Token`, et les rôles admis sont `forestar.supervisor` et `forestar.admin` ;
- `legacy` en local : `/login` et un JWT dans `localStorage`.

Un 403 `re_auth_gg_required` renvoie vers `/connection-google` : il s'agit de la ré-autorisation Google Agenda, pas d'une connexion.

## Structure

```
src/
├── app/
│   ├── layout.tsx                # fonts, ForestarProviders, AuthProvider
│   ├── login/ connection-google/ demenage/ not-found.tsx
│   └── (authenticated)/          # AuthGate > StoreProvider > AppShell
│       ├── page.tsx              # liste des réparations
│       ├── reparation/[id]/      # fiche réparation
│       ├── ouvrier/ appels/ calendrier/
│       ├── factures/             # liste, nouveau, [id], [id]/edit
│       └── parametres/           # 9 onglets
├── components/                   # un dossier par domaine (repairs, repair, repairer, invoices…)
├── lib/                          # api, auth, session, types, notifications, dayjs, hooks
├── store/                        # configSlice, installationTextsSlice (les thunks ne notifient pas)
└── proxy.ts                      # ancien domaine → /demenage
```

`/devis/client/signature` redirige vers robot (`next.config.ts`).

## Conventions

- Aucun composant générique dans l'app : il se crée dans `@forestar-be/ui`.
- Pas d'`asChild` : utiliser `render`. Un `Button` rendu comme lien porte `nativeButton={false}`.
- Pour les confirmations, `ConfirmDialog` ; jamais `window.confirm`.
- Les états de tableau passent par `usePersistedState`, avec des clés préfixées `atelier.`.
- Les couleurs d'état viennent de `config['États']` : ce sont des données, appliquées en style inline.

## Déploiement

Le déploiement passe par Vercel (projet `forestar-supervisor`). Le preset Next.js est déclaré dans `vercel.json`. Variables : `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_AUTH_MODE`, `NPM_RC` (GitHub Packages), et en option `NEXT_PUBLIC_ROBOT_URL`, `NEXT_PUBLIC_SSO_ISSUER` et `NEXT_PUBLIC_SSO_CONSOLE_URL`. Les `NEXT_PUBLIC_*` sont figées au build.
