/** Taille de rangement d'un robot : un robot large occupe deux places voisines. */
export type StorageSize = 'STANDARD' | 'LARGE';
export const storageSizeLabel = (size?: StorageSize | null) =>
  size === 'LARGE' ? 'Large (2 places)' : 'Standard (1 place)';
/** Libellé court des paramètres : nombre de places occupées. */
export const storageSizeSlots = (size?: StorageSize | null) =>
  size === 'LARGE' ? '2 places' : '1 place';
export interface StorageRepair {
  id: number;
  client: { firstName: string; lastName: string };
  robot_type_name?: string | null;
  brand_name?: string | null;
  state?: string | null;
  hivernage?: boolean;
  /** Première photo de la fiche ; affichée via l'optimiseur de vignettes Next. */
  imageUrl?: string | null;
  /** Absente = STANDARD (ancien serveur, ou fiche sans modèle). */
  storageSize?: StorageSize;
  storageSecondSlotId?: number | null;
}
export interface StorageSlot {
  id: number;
  level: number;
  position: string;
  /** Code de la place seule (`R1/2/A`) ; pour un large, voir `locationCode`. */
  code: string;
  repair: StorageRepair | null;
  /** 2 pour l'ancrage (place de gauche) d'un robot large. Absent = 1. */
  span?: 1 | 2;
  secondSlotId?: number | null;
  /** Code à afficher partout : `R1/2/A-B` pour un large, sinon `code`. */
  locationCode?: string;
  /** Seconde place d'un large : jamais libre, jamais dessinée comme telle. */
  coveredBy?: { repairId: number; anchorSlotId: number } | null;
}
export type StorageRackCategory = 'ATELIER' | 'HIVERNAGE';
export const rackCategoryLabel = (category?: StorageRackCategory) =>
  category === 'HIVERNAGE' ? 'Hivernage' : 'Atelier';
export const repairStorageCategory = (
  hivernage?: boolean,
): StorageRackCategory => (hivernage === true ? 'HIVERNAGE' : 'ATELIER');
export interface StorageTransitionPreview {
  movement: boolean;
  fromCode: string | null;
  toCode: string | null;
  category: StorageRackCategory;
  token: string | null;
}
export interface StorageTransitionConfirmation {
  commandId: string;
  token: string;
}
export interface StorageRack {
  id: number;
  number: number;
  active: boolean;
  category: StorageRackCategory;
  slots: StorageSlot[];
}
export interface StorageOverview {
  settings: {
    enabled: boolean;
    allowOverflow: boolean;
    /** Plafond de racks pour l'ajout automatique ; null = sans limite. */
    maxRacks: number | null;
  };
  machineTypes: { name: string; isRobot: boolean }[];
  /** Taille par défaut de chaque modèle de robot. Absent = tous STANDARD. */
  robotTypes?: { name: string; storageSize: StorageSize }[];
  racks: StorageRack[];
  unlocated: StorageRepair[];
}
export interface RepairStorage {
  depositedAt: string | null;
  /** Absente = STANDARD. */
  size?: StorageSize;
  location: null | {
    slotId: number;
    secondSlotId?: number | null;
    size?: StorageSize;
    rackId: number;
    rackNumber: number;
    category?: StorageRackCategory;
    level: number;
    position: string;
    /** Code double (`R1/2/A-B`) pour un robot large. */
    code: string;
  };
  history: {
    id: number;
    action: string;
    fromCode: string | null;
    toCode: string | null;
    actor: string | null;
    createdAt: string;
  }[];
}
/** Résultat de la recherche de la modale : un robot non rendu, rangé ou non. */
export interface StorageSearchItem {
  repair: StorageRepair;
  depositedAt: string | null;
  slot: { id: number; secondSlotId?: number | null; code: string } | null;
}
export interface StorageSearchResult {
  items: StorageSearchItem[];
  /** Plus de résultats que la limite du serveur : préciser la recherche. */
  truncated: boolean;
}
export interface StorageCommand {
  commandId: string;
  action: 'deposit' | 'assign' | 'move' | 'resize';
  /** Pour un robot large : l'ancrage, c'est-à-dire la place de gauche de la paire. */
  slotId?: number;
  expectedSlotId?: number;
  confirmOverflow?: boolean;
  size?: StorageSize;
  /** `toCode` confirmé par l'aperçu ; obligatoire pour redimensionner un robot rangé. */
  expectedToCode?: string | null;
}
export type StorageResizeKind =
  'none' | 'update' | 'extend' | 'move' | 'reduce' | 'refused';
export interface StorageResizePreview {
  size: StorageSize;
  kind: StorageResizeKind;
  feasible: boolean;
  fromCode: string | null;
  toCode: string | null;
}
export const storageRepairLabel = (repair: StorageRepair) =>
  `#${repair.id} · ${repair.client.firstName} ${repair.client.lastName}`;
/** Le type catalogue contient parfois déjà la marque (casse, accents et ponctuation variables). */
export function storageRobotLabel(repair: StorageRepair) {
  const brand = repair.brand_name?.trim() ?? '';
  const model = repair.robot_type_name?.trim() ?? '';
  if (!brand) return model;
  if (!model) return brand;
  const normalizedBrand = normalizeStorageText(brand);
  const normalizedModel = normalizeStorageText(model);
  return ` ${normalizedModel} `.includes(` ${normalizedBrand} `)
    ? model
    : `${brand} ${model}`;
}
export function normalizeStorageText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('fr')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}
/** Code affiché d'une place : double (`R1/2/A-B`) pour l'ancrage d'un robot large. */
export const slotLocationCode = (
  slot: Pick<StorageSlot, 'code' | 'locationCode'>,
) => slot.locationCode ?? slot.code;
/** Place réellement libre : ni occupée, ni seconde place d'un robot large. */
export const isSlotFree = (slot: StorageSlot) =>
  !slot.repair && !slot.coveredBy;
export const isLargeRepair = (
  repair?: Pick<StorageRepair, 'storageSize'> | null,
) => repair?.storageSize === 'LARGE';
/** Places du rack qui ne sont plus disponibles : occupées + secondes places couvertes. */
export function rackCounts(rack: Pick<StorageRack, 'slots'>) {
  const total = rack.slots.length;
  const free = rack.slots.filter(isSlotFree).length;
  return { total, free, occupied: total - free };
}

/**
 * Une case de l'étage : simple, fusionnée sur deux colonnes (robot large, posée
 * sur son ancrage), ou couverte (seconde place d'un large : jamais rendue).
 */
export type StorageCell =
  | { kind: 'single'; slot: StorageSlot }
  | { kind: 'wide'; slot: StorageSlot; second: StorageSlot }
  | { kind: 'covered'; slot: StorageSlot };
const byPosition = (a: StorageSlot, b: StorageSlot) =>
  a.position.localeCompare(b.position);
/** Regroupe les places d'un même étage en cellules, de gauche à droite. */
export function levelCells(slots: StorageSlot[]): StorageCell[] {
  const sorted = [...slots].sort(byPosition);
  const byId = new Map(sorted.map((slot) => [slot.id, slot]));
  return sorted.map((slot): StorageCell => {
    if (slot.coveredBy) return { kind: 'covered', slot };
    const second =
      slot.repair && slot.span === 2 && slot.secondSlotId != null
        ? byId.get(slot.secondSlotId)
        : undefined;
    return second ? { kind: 'wide', slot, second } : { kind: 'single', slot };
  });
}
/** Paire de places libres voisines d'un étage, désignée par son ancrage (place de gauche). */
export interface StoragePair {
  anchor: StorageSlot;
  second: StorageSlot;
  /** Code double (`R1/2/A-B`). */
  code: string;
}
export const storagePairCode = (anchor: StorageSlot, second: StorageSlot) =>
  `${anchor.code}-${second.position}`;
/**
 * Paires libres d'un étage pour un robot large : A-B et B-C sont deux destinations
 * distinctes, même quand les trois places sont libres.
 */
export function freePairs(slots: StorageSlot[]): StoragePair[] {
  const sorted = [...slots].sort(byPosition);
  const pairs: StoragePair[] = [];
  for (let i = 0; i + 1 < sorted.length; i++) {
    const [anchor, second] = [sorted[i], sorted[i + 1]];
    if (
      isSlotFree(anchor) &&
      isSlotFree(second) &&
      anchor.level === second.level &&
      second.position.charCodeAt(0) === anchor.position.charCodeAt(0) + 1
    )
      pairs.push({ anchor, second, code: storagePairCode(anchor, second) });
  }
  return pairs;
}
/** Paires libres du rack contenant une place donnée (au plus deux : la place B). */
export function freePairsAround(
  rack: Pick<StorageRack, 'slots'>,
  slot: StorageSlot,
): StoragePair[] {
  return freePairs(rack.slots.filter((s) => s.level === slot.level)).filter(
    (pair) => pair.anchor.id === slot.id || pair.second.id === slot.id,
  );
}

export function searchStorage(data: StorageOverview, query: string) {
  const terms = normalizeStorageText(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return [
    ...data.racks.flatMap((rack) =>
      rack.slots.flatMap((slot) =>
        slot.repair ? [{ repair: slot.repair, slot, rack }] : [],
      ),
    ),
    ...data.unlocated.map((repair) => ({ repair, slot: null, rack: null })),
  ].filter(({ repair, slot }) => {
    const text = normalizeStorageText(
      `${storageRepairLabel(repair)} ${storageRobotLabel(repair)} ${slot ? slotLocationCode(slot) : ''}`,
    );
    return terms.every((term) => text.includes(term));
  });
}
