export interface StorageRepair {
  id: number;
  client: { firstName: string; lastName: string };
  robot_type_name?: string | null;
  brand_name?: string | null;
  state?: string | null;
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
  settings: { enabled: boolean; allowOverflow: boolean };
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
export function searchStorage(data: StorageOverview, query: string) {
  const q = query.trim().toLocaleLowerCase('fr');
  if (!q) return [];
  return [
    ...data.racks.flatMap((rack) =>
      rack.slots.flatMap((slot) =>
        slot.repair ? [{ repair: slot.repair, slot, rack }] : [],
      ),
    ),
    ...data.unlocated.map((repair) => ({ repair, slot: null, rack: null })),
  ].filter(({ repair }) =>
    storageRepairLabel(repair).toLocaleLowerCase('fr').includes(q),
  );
}
