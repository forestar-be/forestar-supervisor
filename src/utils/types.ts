import { ReplacedPart } from '../pages/SingleRepair';

export interface MachineRepair {
  id: number;
  first_name: string;
  last_name: string;
  address: string;
  phone: string;
  email: string;
  machine_type_name: string;
  robot_type_name: string | null;
  repair_or_maintenance: string;
  robot_code: string;
  fault_description: string;
  start_timer: Date | null;
  working_time_in_sec: number;
  replaced_part_list: {
    quantity: number;
    replacedPart: ReplacedPart;
  }[];
  state: string | null;
  createdAt: string;
  imageUrls: string[];
  signatureUrl: string;
  brand_name: string;
  warranty?: boolean;
  devis: boolean;
  repairer_name: string | null;
  remark: string | null;
  city: string | null;
  postal_code: string | null;
  client_call_times: Date[];
  hivernage: boolean;
}

export type MachineRepairFromApi = Omit<
  MachineRepair,
  'start_timer' | 'client_call_times'
> & {
  start_timer: string | null;
  client_call_times: string[];
  machine_type_name: string;
  robot_type_name: string | null;
};

// Types for Purchase Orders
export interface PurchaseOrder {
  id: number;
  createdAt: string;
  updatedAt: string;

  clientFirstName: string;
  clientLastName: string;
  clientAddress: string;
  clientCity: string;
  clientPhone: string;
  deposit: number;

  robotInventoryId: number;
  robotInventory?: RobotInventory;

  pluginInventoryId: number | null;
  plugin?: RobotInventory;

  antennaInventoryId: number | null;
  antenna?: RobotInventory;

  hasWire: boolean;
  wireLength: number | null;
  shelterType: string | null;
  shelterPrice: number | null;
  hasAntennaSupport: boolean;

  installationDate: string | null;
  needsInstaller: boolean;
  installationNotes: string | null;

  // Status fields
  hasAppointment: boolean;
  isInstalled: boolean;

  orderPdfId: string | null;
  eventId?: string | null;
}

export interface PurchaseOrderFormData {
  clientFirstName: string;
  clientLastName: string;
  clientAddress: string;
  clientCity: string;
  clientPhone: string;
  deposit: number;

  robotInventoryId: number;

  pluginInventoryId: number | null;
  antennaInventoryId: number | null;
  hasWire: boolean;
  wireLength: number;
  shelterType: string;
  shelterPrice: number;
  hasAntennaSupport: boolean;

  installationDate: string;
  needsInstaller: boolean;
  installationNotes: string;

  // Status fields
  hasAppointment?: boolean;
  isInstalled?: boolean;
}

// Define the InventoryCategory enum
export enum InventoryCategory {
  ROBOT = 'ROBOT',
  ANTENNA = 'ANTENNA',
  PLUGIN = 'PLUGIN',
}

// Types for Robot Inventory
export interface RobotInventory {
  id: number;
  reference?: string;
  name: string;
  category: InventoryCategory;
  sellingPrice?: number;
  purchasePrice?: number;
  createdAt: string;
  updatedAt: string;
  inventoryPlans: InventoryPlan[];
}

export interface InventoryPlan {
  id: number;
  robotInventoryId: number;
  year: number;
  month: number;
  quantity: number;
  createdAt: string;
  updatedAt: string;
  robotInventory?: RobotInventory;
}

export interface InventorySummary {
  robots: RobotInventory[];
  periods: { year: number; month: number }[];
}
