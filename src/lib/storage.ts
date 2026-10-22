export interface StorageRepair {
  id: number;
  client: { firstName: string; lastName: string };
  robot_type_name?: string | null;
  brand_name?: string | null;
  state?: string | null;
  /** Première photo de la fiche ; affichée via l'optimiseur de vignettes Next. */
  imageUrl?: string | null;
}
export interface StorageSlot {
  id: number;
  level: number;
  position: string;
  code: string;
  repair: StorageRepair | null;
}
export interface StorageRack {
  id: number;
  number: number;
  active: boolean;
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
  racks: StorageRack[];
  unlocated: StorageRepair[];
}
export interface RepairStorage {
  depositedAt: string | null;
  location: null | {
    slotId: number;
    rackId: number;
    rackNumber: number;
    level: number;
    position: string;
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
export interface StorageCommand {
  commandId: string;
  action: 'deposit' | 'assign' | 'move';
  slotId?: number;
  expectedSlotId?: number;
  confirmOverflow?: boolean;
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
      `${storageRepairLabel(repair)} ${storageRobotLabel(repair)} ${slot?.code ?? ''}`,
    );
    return terms.every((term) => text.includes(term));
  });
}
