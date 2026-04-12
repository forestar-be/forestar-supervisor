# Roadmap — Factures de réparation dans forestar-supervisor

## Contexte

Les factures de service (réparations) sont actuellement gérées **uniquement depuis forestar-installer** (application terrain des techniciens). L'objectif est de porter cette fonctionnalité à l'identique dans **forestar-supervisor** (dashboard managers), qui est le site principal de gestion des réparations.

### Situation actuelle

- **forestar-installer** : module complet (liste, création, édition, envoi, suppression, calendrier, intégration Dolibarr)
- **forestar-server** :
  - `src/handlers/serviceInvoice.handlers.ts` ✅ **existe déjà** — handlers partagés pour toutes les opérations facture (list, get, update, delete, send, mark-paid, mark-sent, resync, pdf, deletion-info, calendar CRUD, item-config CRUD, thirdparty search, bank accounts)
  - `src/routes/supervisor/routes/serviceInvoices.route.ts` ✅ **refactoré** (84 lignes) — utilise les handlers partagés. Endpoints existants : list, get, update, delete, send, mark-paid, mark-sent, pdf, resync, calendar, item-configs, thirdparties, bank-accounts, + **create from PurchaseOrder** (pour factures d'installation)
  - `src/routes/installer.routes.ts` ✅ **partiellement refactoré** — utilise les handlers partagés pour la majorité des endpoints, mais le **`POST /invoices` (création de facture) reste inline** car il inclut la logique spécifique de liaison CalendarEvent depuis MachineRepair et la gestion du calendrier à la création
  - **Endpoints manquants côté supervisor** :
    - `POST /` — **création de facture from scratch** (avec pré-remplissage client depuis réparation, liaison CalendarEvent existant, calendrier optionnel)
    - `GET /repairs/search` — **recherche de réparations** pour import/pré-remplissage (exclut celles déjà facturées, retourne détails calendrier)
- **forestar-supervisor** : aucune interface facture actuellement. Le `ConfirmDialog` (type `'invoice'`) existe dans les composants mais la logique derrière n'est pas implémentée. Aucun type, API call, ou page relative aux factures

### Principes directeurs

1. **Parité fonctionnelle 1:1** avec forestar-installer — aucune régression, simplification ou perte de règle métier
2. **DRY côté serveur** — les handlers partagés existent déjà ; il reste à extraire le handler de création et ajouter les endpoints manquants
3. **Suivre le design existant** de forestar-supervisor (AG Grid, MUI, Redux, patterns existants)

---

## Phase 0 — Compléter les routes serveur manquantes

> Les handlers partagés existent déjà dans `src/handlers/serviceInvoice.handlers.ts`. Il reste à extraire le handler de création et ajouter les endpoints manquants côté supervisor.

- [x] **0.1** Extraire `handleCreateInvoice` dans `serviceInvoice.handlers.ts`
  - Déplacer la logique inline de `POST /invoices` de `installer.routes.ts` vers un handler partagé
  - Inclure : validation one-to-one (machineRepairId), création avec lignes, liaison CalendarEvent existant depuis MachineRepair, gestion calendrier optionnel à la création
  - Mettre à jour `installer.routes.ts` pour utiliser `handleCreateInvoice` au lieu du code inline
- [x] **0.2** Extraire `handleSearchRepairs` dans `serviceInvoice.handlers.ts`
  - Déplacer la logique inline de `GET /repairs/search` de `installer.routes.ts` vers un handler partagé
  - Inclure : filtre `serviceInvoice: null`, recherche multi-champs, include calendarEvent, mapping avec détails événement Google Calendar
  - Mettre à jour `installer.routes.ts` pour utiliser `handleSearchRepairs`
- [x] **0.3** Ajouter les endpoints manquants dans `supervisor/routes/serviceInvoices.route.ts`
  - `POST /` → `handleCreateInvoice` (création de facture from scratch)
  - `GET /repairs/search` → `handleSearchRepairs` (recherche réparations pour import)
- [ ] **0.4** Tests manuels depuis forestar-installer pour valider la non-régression du refactoring

---

## Phase 1 — Types, API client et état (forestar-supervisor)

> Ajouter les types, fonctions API et éventuellement un slice Redux pour les factures dans forestar-supervisor.

- [x] **1.1** Ajouter les types dans `src/utils/types.ts`
  - `ServiceInvoice` (id, invoiceNumber, status, type, client*, paymentMethod, deposit, lines, dolibarr*, calendar*, remarks, totaux, dates)
  - `ServiceInvoiceLine` (id, description, type, unit, quantity, unitPrice, totalPrice, order)
  - `ServiceInvoiceItemConfig` (id, name, type, unit, defaultPrice, priceUnit, order, isActive, category)
  - `CalendarEvent` (id, googleEventId, googleCalendarId, source)
  - `DolibarrThirdparty` (id, name, email, phone, address, zip, town)
  - `DolibarrBankAccount` (id, label, number, etc.)
  - Types d'enum : `ServiceInvoiceStatus`, `ServiceInvoiceType`, `PaymentMethod`
  - Type pour les réponses 409 de résolution tiers : `ThirdpartyConfirmation`

- [x] **1.2** Ajouter les fonctions API dans `src/utils/api.ts`
  - `getServiceInvoices(token, params?)` — GET `/supervisor/service-invoices`
  - `getServiceInvoice(token, id)` — GET `/supervisor/service-invoices/:id`
  - `createServiceInvoice(token, data)` — POST `/supervisor/service-invoices`
  - `createServiceInvoiceFromPO(token, poId)` — POST `/supervisor/service-invoices/from-purchase-order/:poId`
  - `updateServiceInvoice(token, id, data)` — PUT `/supervisor/service-invoices/:id`
  - `deleteServiceInvoice(token, id)` — DELETE `/supervisor/service-invoices/:id`
  - `sendServiceInvoice(token, id, body?)` — POST `/supervisor/service-invoices/:id/send`
  - `markServiceInvoicePaid(token, id)` — PUT `/supervisor/service-invoices/:id/mark-paid`
  - `markServiceInvoiceSent(token, id)` — PUT `/supervisor/service-invoices/:id/mark-sent`
  - `resyncServiceInvoice(token, id)` — POST `/supervisor/service-invoices/:id/resync`
  - `getServiceInvoicePdf(token, id)` — GET `/supervisor/service-invoices/:id/pdf` (blob)
  - `getServiceInvoiceDeletionInfo(token, id)` — GET `/supervisor/service-invoices/:id/deletion-info`
  - `getServiceInvoiceCalendar(token, id)` — GET `/supervisor/service-invoices/:id/calendar`
  - `createServiceInvoiceCalendar(token, id, data)` — POST `/supervisor/service-invoices/:id/calendar`
  - `deleteServiceInvoiceCalendar(token, id)` — DELETE `/supervisor/service-invoices/:id/calendar`
  - `getInvoiceItemConfigs(token, params?)` — GET `/supervisor/service-invoices/item-configs`
  - `createInvoiceItemConfig(token, data)` — POST `/supervisor/service-invoices/item-configs`
  - `updateInvoiceItemConfig(token, id, data)` — PUT `/supervisor/service-invoices/item-configs/:id`
  - `deleteInvoiceItemConfig(token, id)` — DELETE `/supervisor/service-invoices/item-configs/:id`
  - `reorderInvoiceItemConfigs(token, ids)` — PUT `/supervisor/service-invoices/item-configs/reorder`
  - `searchDolibarrThirdparties(token, q)` — GET `/supervisor/service-invoices/thirdparties/search`
  - `getDolibarrBankAccounts(token)` — GET `/supervisor/service-invoices/dolibarr-bank-accounts`
  - `setDolibarrBankAccount(token, data)` — PUT `/supervisor/service-invoices/dolibarr-bank-account`
  - `searchRepairsForInvoice(token, q)` — GET `/supervisor/service-invoices/repairs/search` (si ajouté en phase 0)

- [x] **1.3** Ajouter les utilitaires dans `src/utils/common.utils.ts` (ou nouveau fichier `invoiceUtils.ts`)
  - `formatCurrency(amount)` — formater en euros
  - `getInvoiceStatusLabel(status)` — DRAFT → Brouillon, SENT → Envoyée, PAID → Payée
  - `getInvoiceStatusColor(status)` — couleurs par statut
  - `getPaymentMethodLabel(method)` — CASH → Espèces, CARD → Carte, TRANSFER → Virement
  - `calculateLineTotals(lines)` — calculer sous-total HT, TVA, TTC

---

## Phase 2 — Tableau des réparations : colonnes facture

> Ajouter la colonne "Statut facture" et le bouton action "Facture" dans le tableau `MachineRepairsTable`.

- [x] **2.1** Enrichir l'API `getAllMachineRepairs` pour retourner la relation `serviceInvoice` (ou au minimum l'existence + statut)
  - Modifier côté serveur la route `POST /supervisor/machine-repairs` pour inclure `serviceInvoice: { select: { id, status, invoiceNumber } }` dans le Prisma include
  - Mettre à jour le type `MachineRepair` / `MachineRepairFromApi` en frontend

- [x] **2.2** Ajouter la colonne "Statut facture" dans `MachineRepairsTable.tsx`
  - Valeurs : Aucune / Brouillon / Envoyée / Payée
  - Cellule colorée par statut (gris=aucune, bleu clair=brouillon, orange=envoyée, vert=payée)
  - Masquée sur tablette (`hide: isTablet`)

- [x] **2.3** Ajouter le bouton facture dans la colonne actions (colonne N°) ou nouvelle colonne actions
  - Icône facturation (`ReceiptIcon` ou `DescriptionIcon` de MUI)
  - Tooltip : "Voir la facture" si statut existant, "Créer une facture" si aucune
  - Click → navigation vers `/factures/:invoiceId` si existante
  - Click → modal de confirmation si aucune facture

- [x] **2.4** Modal de confirmation "Créer une facture"
  - Utiliser le `ConfirmDialog` existant (type `'invoice'`)
  - Message : "Voulez-vous créer une facture de réparation pour [client] ?"
  - Sur confirmation → créer la facture via API avec pré-remplissage client depuis la réparation
  - Sur succès → naviguer vers la page d'édition de la facture créée

---

## Phase 3 — Page liste des factures

> Nouvelle page `/factures` avec un tableau AG Grid, suivant le design des autres pages (comme `MachineRepairsTable`).

- [x] **3.1** Créer la page `src/pages/ServiceInvoices.tsx`
  - Layout identique à `Home.tsx` : Paper + titre + boutons + filtres + AG Grid
  - Titre : "Factures de service"
  - Bouton "+ Nouvelle facture" (ouvre la page de création)
  - Bouton réinitialiser tableau (pattern existant `clearGridState`)

- [x] **3.2** Colonnes du tableau
  - **N°** : `invoiceNumber` — lien cliquable vers détail (`/factures/:id`)
  - **Client** : `clientFirstName` + `clientLastName`
  - **Téléphone** : `clientPhone`
  - **Type** : REPAIR → "Réparation", INSTALLATION → "Installation"
  - **Montant TTC** : `totalTTC` formaté en euros
  - **Mode de paiement** : `paymentMethod` (Espèces / Carte / Virement)
  - **Statut** : badge coloré (Brouillon/Envoyée/Payée)
  - **Dolibarr** : indicateur sync (✓ synced, ⚠ error, — aucun)
  - **Date de création** : `createdAt` formaté FR
  - **Actions** : colonne avec boutons icônes :
    - Voir (VisibilityIcon) → navigation détail
    - Télécharger PDF (DownloadIcon) → si non-brouillon, télécharger le PDF
    - Éditer (EditIcon) → si brouillon, navigation vers `/factures/:id/edit`

- [x] **3.3** Filtres (même pattern que MachineRepairsTable)
  - Filtre par statut : MultiSelectDropdown (DRAFT, SENT, PAID)
  - Filtre par type : MultiSelectDropdown (REPAIR, INSTALLATION)
  - Recherche client : TextField (nom, téléphone, numéro facture)
  - Responsive : 3 layouts (mobile, tablette, desktop) comme MachineRepairsTable

- [x] **3.4** Persistance état du tableau
  - Utiliser `agGridSettingsHelper` avec clé `'serviceInvoicesAgGridState'`
  - Sauvegarder/restaurer : colonnes, tailles, ordre, taille de page

- [x] **3.5** Gestion du téléchargement PDF depuis la colonne actions
  - Appeler `getServiceInvoicePdf(token, id)` qui retourne un blob
  - Ouvrir/télécharger le PDF dans un nouvel onglet
  - Désactiver le bouton si `status === 'DRAFT'` (pas de PDF disponible)

---

## Phase 4 — Page détail facture

> Nouvelle page `/factures/:id` en lecture seule avec actions conditionnelles, répliquant le comportement de forestar-installer.

- [x] **4.1** Créer la page `src/pages/ServiceInvoiceDetail.tsx`
  - Header : numéro de facture, badge statut, date de création
  - Indicateur sync Dolibarr (bandeau ambre si `dolibarrSyncStatus === 'error'` avec bouton "Resync Dolibarr")
  - Lien vers la réparation associée si `machineRepairId` (navigation vers `/reparation/:id`)

- [x] **4.2** Section infos client
  - Card avec : nom, prénom, téléphone (lien `tel:`), email (lien `mailto:`), adresse, code postal, ville

- [x] **4.3** Section lignes de facture
  - Tableau (MUI Table) avec : description, prix unitaire, quantité, total par ligne
  - Sous-total HT, TVA (21%), Total TTC
  - Acompte si applicable (installations)

- [x] **4.4** Section mode de paiement
  - Afficher le mode de paiement (Espèces / Carte / Virement)
  - Si virement : afficher la communication structurée

- [x] **4.5** Section remarques
  - Afficher les remarques si présentes

- [x] **4.6** Section calendrier (Google Calendar)
  - Réutiliser/adapter la logique de `CalendarEventModal` existant dans supervisor
  - Afficher les détails de l'événement si existant (date, heure, titre, description, lien Google Calendar)
  - Boutons : créer / modifier / supprimer événement
  - Gestion événement supprimé manuellement de Google Calendar (404 → proposer de recréer)
  - Note : uniquement pour les factures REPAIR, pas INSTALLATION

- [x] **4.7** Boutons d'actions conditionnels
  - **DRAFT** :
    - "Modifier" → `/factures/:id/edit`
    - "Envoyer" → déclenche le flux d'envoi (modal SendInvoice)
    - "Supprimer" → modal DeleteInvoice
    - "Télécharger PDF" (aperçu brouillon si disponible, sinon masqué)
  - **SENT** :
    - "Marquer payée" → API mark-paid (avec warning Dolibarr si échec)
    - "Supprimer" → modal DeleteInvoice (avec warnings)
    - "Télécharger PDF" → télécharger depuis Dolibarr
    - "Resync Dolibarr" (si erreur sync)
  - **PAID** :
    - "Remettre en envoyée" → API mark-sent (revert)
    - "Supprimer" → modal DeleteInvoice (avec warnings)
    - "Télécharger PDF"

---

## Phase 5 — Modal d'envoi de facture (SendInvoiceModal)

> Composant modal pour le workflow multi-étapes de résolution du tiers Dolibarr lors de l'envoi.

- [x] **5.1** Créer `src/components/invoices/SendInvoiceModal.tsx`
  - Parité fonctionnelle 1:1 avec `forestar-installer/src/components/SendInvoiceModal.tsx`
  - Workflow multi-étapes :
    1. Appel `POST /service-invoices/:id/send` sans body
    2. Si 409 `confirmationType: 'create-client'` → afficher les données client + bouton "Créer dans Dolibarr"
    3. Si 409 `confirmationType: 'resolve-conflict'` → afficher différences (invoice vs Dolibarr) + options : "Mettre à jour Dolibarr" / "Utiliser l'existant" / "Créer nouveau"
    4. Si 409 `confirmationType: 'select-client'` → afficher la liste des matches + différences inline + sélection
    5. Ré-appeler `POST` avec le `thirdpartyAction` et `thirdpartyId` choisis
    6. Succès → facture envoyée, rafraîchir la page

- [x] **5.2** Gestion des erreurs d'envoi
  - Erreur PDF/email → message d'erreur, facture reste en brouillon
  - Erreur Dolibarr → facture envoyée mais `dolibarrSyncStatus = 'error'`, bandeau warning
  - Afficher les différences champ par champ (nom, email, téléphone, adresse, CP, ville)

---

## Phase 6 — Modal de suppression de facture (DeleteInvoiceModal)

> Composant modal avec warnings contextuels et gestion Dolibarr.

- [x] **6.1** Créer `src/components/invoices/DeleteInvoiceModal.tsx`
  - Parité fonctionnelle 1:1 avec `forestar-installer/src/components/DeleteInvoiceModal.tsx`
  - Avant ouverture : appeler `GET /service-invoices/:id/deletion-info` pour obtenir les warnings
  - Affichage conditionnel :
    - DRAFT : suppression simple, pas d'impact
    - SENT avec Dolibarr : warning impact comptabilité
    - PAID dans Dolibarr (fk_statut=2) : warning fort — ne peut pas être supprimée dans Dolibarr
    - Facture non dernière : warning impact numérotation
  - Bouton de confirmation avec texte contextuel
  - Affichage du résultat Dolibarr post-suppression (warning si Dolibarr n'a pas pu supprimer)

---

## Phase 7 — Pages création et édition de facture

> Formulaires complets pour créer et modifier des factures, identiques à forestar-installer.

- [x] **7.1** Créer la page `src/pages/ServiceInvoiceCreate.tsx` (route `/factures/nouveau`)
  - Deux modes de création :
    - **Nouveau client** : formulaire vierge
    - **Import depuis réparation** : recherche par nom/téléphone/N° réparation, puis pré-remplissage client + calendrier
  - Formulaire identique à l'édition (composant partagé)

- [x] **7.2** Créer la page `src/pages/ServiceInvoiceEdit.tsx` (route `/factures/:id/edit`)
  - Chargement de la facture existante
  - Formulaire pré-rempli
  - Uniquement accessible si `status === 'DRAFT'`
  - Redirection si facture non-brouillon

- [x] **7.3** Créer le composant formulaire partagé `src/components/invoices/InvoiceForm.tsx`
  - Champs client : nom*, prénom, téléphone, email, adresse, ville, code postal
  - Mode de paiement : CASH / CARD / TRANSFER (select)
  - Remarques : textarea
  - **Lignes de facture** (tableau dynamique) :
    - Description*, unité (pièce/heure/km/m/forfait), quantité, prix unitaire
    - Bouton ajouter une ligne
    - Bouton supprimer une ligne (min 1 ligne)
    - Ajout rapide depuis les postes configurés (`ServiceInvoiceItemConfig`)
    - Calcul automatique : total par ligne, sous-total HT, TVA 21%, total TTC
  - **Section calendrier** (REPAIR uniquement) :
    - Date, heure (ou toute la journée), titre, description
    - Si import réparation : événement pré-rempli depuis le calendrier existant de la réparation
  - Validation : nom client requis, au moins une ligne
  - Bouton sauvegarder → créer ou mettre à jour via API

- [x] **7.4** Import depuis réparation
  - Barre de recherche : `GET /service-invoices/repairs/search?q=xxx`
  - Résultats : liste des réparations (exclut celles déjà facturées)
  - Sélection → pré-remplir : client (nom, prénom, téléphone, email, adresse), événement calendrier si existant
  - Possibilité de modifier après pré-remplissage

---

## Phase 8 — Configuration facturation dans les paramètres

> Ajouter les onglets de configuration facturation dans la page Settings existante.

- [x] **8.1** Ajouter un onglet "Facturation" dans `src/pages/Settings.tsx`
  - Postes de facturation : liste CRUD des `ServiceInvoiceItemConfig`
    - Nom, type, unité, prix par défaut, unité de prix, catégorie (REPAIR/INSTALLATION)
    - Réordonnement drag-and-drop ou boutons ↑↓
    - Activer/désactiver
  - Comptes bancaires Dolibarr :
    - Fetch des comptes disponibles depuis Dolibarr
    - Association mode de paiement → compte bancaire (CASH, CARD, TRANSFER)

---

## Phase 9 — Routing et navigation

> Intégrer les nouvelles pages dans le routing et la navigation.

- [x] **9.1** Ajouter les routes dans `src/App.tsx`
  - `/factures` → `ServiceInvoices` (liste)
  - `/factures/nouveau` → `ServiceInvoiceCreate`
  - `/factures/:id` → `ServiceInvoiceDetail`
  - `/factures/:id/edit` → `ServiceInvoiceEdit`

- [x] **9.2** Ajouter le lien "Factures" dans le header (`src/layout/Header.tsx`)
  - Icône : `ReceiptIcon` ou `DescriptionIcon`
  - Position : entre les boutons existants (Accueil, Appels, Calendrier)
  - Bouton actif quand on est sur `/factures*`

- [x] **9.3** Ajouter le lien dans le menu mobile sidebar (`src/layout/Layout.tsx`)
  - Même icône et texte "Factures"
  - Même position dans la liste `menuItems`

---

## Phase 10 — Intégration SingleRepair

> Connecter la page de détail réparation avec les factures.

- [x] **10.1** Bouton "Voir la facture" dans `SingleRepair.tsx`
  - Si la réparation a une facture associée → lien direct vers `/factures/:invoiceId`
  - Afficher le statut et numéro de facture
  - Si pas de facture → afficher le lien de création avec confirmation

- [x] **10.2** Mettre à jour l'état après création de facture
  - Rafraîchir les données de la réparation après création/modification de facture
  - Naviguer vers la facture créée

---

## Phase 11 — Tests et validation finale

> Vérification complète de la parité fonctionnelle.

- [ ] **11.1** Tester le cycle de vie complet d'une facture de réparation
  - Créer une facture (nouveau client)
  - Créer une facture (import depuis réparation)
  - Modifier une facture brouillon
  - Envoyer une facture (workflow tiers Dolibarr complet : création, conflit, sélection)
  - Marquer payée
  - Remettre en envoyée
  - Supprimer (chaque statut : brouillon, envoyée)
  - Télécharger PDF
  - Resync Dolibarr

- [ ] **11.2** Tester le cycle de vie d'une facture d'installation
  - Créer depuis un bon de commande
  - Modifier les lignes
  - Envoyer (avec acompte)
  - Marquer payée
  - Supprimer

- [ ] **11.3** Tester les événements calendrier
  - Créer un événement depuis une facture
  - Modifier un événement
  - Supprimer un événement
  - Gérer un événement supprimé manuellement de Google Calendar

- [ ] **11.4** Tester la colonne facture dans le tableau des réparations
  - Affichage correct du statut
  - Bouton action : navigation vers facture existante
  - Bouton action : création de facture pour réparation sans facture

- [ ] **11.5** Tester la page liste des factures
  - Filtres (statut, type, recherche)
  - Tri et pagination
  - Persistance de l'état du tableau
  - Actions (voir, télécharger PDF, éditer)

- [ ] **11.6** Tester la non-régression de forestar-installer
  - Toutes les fonctionnalités existantes doivent rester fonctionnelles après le refactoring serveur (phase 0)

- [ ] **11.7** Tester le responsive (mobile, tablette, desktop)
  - Toutes les pages factures
  - Colonnes cachées/affichées correctement
  - Navigation mobile (sidebar)

---

## Récapitulatif des fichiers à créer/modifier

### forestar-server (Phase 0)

| Action | Fichier | Détail |
|--------|---------|--------|
| ✅ EXISTANT | `src/handlers/serviceInvoice.handlers.ts` | Tous les handlers partagés sauf création et recherche réparations |
| MODIFIER | `src/handlers/serviceInvoice.handlers.ts` | Ajouter `handleCreateInvoice` et `handleSearchRepairs` |
| MODIFIER | `src/routes/installer.routes.ts` | Remplacer `POST /invoices` et `GET /repairs/search` inline par handlers partagés |
| MODIFIER | `src/routes/supervisor/routes/serviceInvoices.route.ts` | Ajouter `POST /` et `GET /repairs/search` |

### forestar-supervisor (Phases 1-10)

| Action | Fichier |
|--------|---------|
| MODIFIER | `src/utils/types.ts` (ajouter types facture) |
| MODIFIER | `src/utils/api.ts` (ajouter fonctions API facture) |
| CRÉER  | `src/utils/invoiceUtils.ts` (utilitaires facture) |
| MODIFIER | `src/components/MachineRepairsTable.tsx` (colonnes facture) |
| CRÉER  | `src/pages/ServiceInvoices.tsx` (liste factures) |
| CRÉER  | `src/pages/ServiceInvoiceDetail.tsx` (détail facture) |
| CRÉER  | `src/pages/ServiceInvoiceCreate.tsx` (création) |
| CRÉER  | `src/pages/ServiceInvoiceEdit.tsx` (édition) |
| CRÉER  | `src/components/invoices/InvoiceForm.tsx` (formulaire partagé) |
| CRÉER  | `src/components/invoices/SendInvoiceModal.tsx` (modal envoi) |
| CRÉER  | `src/components/invoices/DeleteInvoiceModal.tsx` (modal suppression) |
| CRÉER  | `src/components/invoices/InvoiceStatusBadge.tsx` (badge statut) |
| CRÉER  | `src/components/invoices/InvoiceLines.tsx` (tableau lignes en lecture) |
| CRÉER  | `src/components/invoices/InvoiceLinesEditor.tsx` (éditeur lignes) |
| CRÉER  | `src/components/invoices/CalendarSection.tsx` (section calendrier facture) |
| CRÉER  | `src/components/invoices/RepairSearchImport.tsx` (recherche et import réparation) |
| CRÉER  | `src/styles/ServiceInvoices.css` (styles spécifiques si nécessaire) |
| MODIFIER | `src/App.tsx` (ajouter routes) |
| MODIFIER | `src/layout/Header.tsx` (ajouter lien navigation) |
| MODIFIER | `src/layout/Layout.tsx` (ajouter lien sidebar mobile) |
| MODIFIER | `src/pages/Settings.tsx` (onglet facturation) |
| MODIFIER | `src/pages/SingleRepair.tsx` (bouton voir/créer facture) |
