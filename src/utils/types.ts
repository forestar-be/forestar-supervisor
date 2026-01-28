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
  eventId: string | null;
  calendarId: string | null;
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
  clientEmail: string;
  deposit: number;
  robotInventoryId: number;
  robotInventory?: RobotInventory;
  serialNumber: string | null;
  pluginInventoryId: number | null;
  antennaInventoryId: number | null;
  shelterInventoryId: number | null;
  plugin?: RobotInventory | null;
  antenna?: RobotInventory | null;
  shelter?: RobotInventory | null;
  hasWire: boolean;
  wireLength: number | null;
  hasAntennaSupport: boolean;
  hasPlacement: boolean;
  installationDate: string | null;
  needsInstaller: boolean;
  installationNotes: string | null;
  hasAppointment: boolean;
  isInstalled: boolean;
  isInvoiced: boolean;
  devis: boolean;
  validUntil: string | null;
  bankAccountNumber: string | null;
  bankAccountHolderName: string | null;
  bankBic: string | null;
  orderPdfId: string | null;
  invoicePath?: string | null;
  photosPaths: string[];
  clientSignature?: string | null;
  signatureTimestamp?: string | null;
  eventId?: string | null;
  deleteInvoice: boolean;
  emailDevisSent?: boolean;
}

export interface PurchaseOrderFormData {
  clientFirstName: string;
  clientLastName: string;
  clientAddress: string;
  clientCity: string;
  clientPhone: string;
  clientEmail: string;
  deposit: number;

  robotInventoryId: number;
  serialNumber: string;

  pluginInventoryId: number | null;
  antennaInventoryId: number | null;
  shelterInventoryId: number | null;

  hasWire: boolean;
  wireLength: number;
  hasAntennaSupport: boolean;
  hasPlacement: boolean;

  installationDate: string;
  needsInstaller: boolean;
  installationNotes: string;

  // Status fields
  hasAppointment?: boolean;
  isInstalled?: boolean;
  isInvoiced?: boolean;
  devis?: boolean;

  // Quote specific fields
  validUntil: string;
  bankAccountNumber: string;
  bankAccountHolderName: string;
  bankBic: string;

  // File management
  deleteInvoice?: boolean;
  photosToDelete?: string[];
}

// Define the InventoryCategory enum
export enum InventoryCategory {
  ROBOT = 'ROBOT',
  ANTENNA = 'ANTENNA',
  PLUGIN = 'PLUGIN',
  SHELTER = 'SHELTER',
}

// Define the WireType enum for public catalog
export enum WireType {
  WIRED = 'WIRED',
  WIRELESS = 'WIRELESS',
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
  // Public catalog fields (for reparobot public site)
  isPublicVisible?: boolean;
  publicDescription?: string;
  imageFileName?: string;
  imageUrl?: string | null; // Full URL to the image (returned by server)
  maxSurface?: number;
  maxSlope?: number;
  installationPrice?: number;
  promotion?: string;
  wireType?: WireType;
  publicOrder?: number;
}

export interface InventoryPlan {
  id?: number;
  robotInventoryId: number;
  year: number;
  quantity: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface InventorySummary {
  robots: RobotInventory[];
  periods: { year: number; month: number }[];
}

// Installation Preparation Text
export enum InstallationTextType {
  TITLE = 'TITLE',
  SUBTITLE = 'SUBTITLE',
  SUBTITLE2 = 'SUBTITLE2',
  PARAGRAPH = 'PARAGRAPH',
}

export interface InstallationPreparationText {
  id: number;
  content: string;
  type: InstallationTextType;
  order: number;
  createdAt: string;
  updatedAt: string;
}
