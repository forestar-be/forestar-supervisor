export type ReplacedPart = { name: string; price: number };

export type ConfigElement = {
  key: string;
  value: string;
};

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
  /** Atelier R001 — `null` : fiche active. Sinon, date d'archivage (ISO). */
  archived_at: string | null;
  /** Atelier R003 — date d'entrée (dépôt) et date de sortie (remise au client). */
  entry_date: string | null;
  exit_date: string | null;
  /** Atelier R002 — chemin et date du PDF déjà envoyé sur Dropbox. */
  dropbox_pdf_path: string | null;
  dropbox_pdf_uploaded_at: string | null;
  /**
   * Atelier R002 — nom D-05 du PDF, calculé par le serveur (`GET /:id`
   * uniquement : la liste ne le porte pas).
   */
  pdf_file_name: string;
  /**
   * Atelier R003 — vrai si la fiche est archivée et que son PDF Dropbox
   * manque ou précède l'archivage (`GET /:id` uniquement) : pilote le
   * bandeau « PDF non envoyé — Réessayer ».
   */
  dropbox_pdf_pending: boolean;
  serviceInvoice?: {
    id: number;
    invoiceNumber: string;
    status: string;
  } | null;
}

/** Résultat d'un envoi du PDF sur Dropbox (R002-S03), tel que renvoyé par
 * l'archivage et la remise au client (R003) : `pdf` de leur réponse. */
export type PdfUploadOutcome =
  | {
      uploaded: true;
      dropbox_pdf_path: string;
      dropbox_pdf_uploaded_at: string;
    }
  | { uploaded: false; code: string; error: string };

/**
 * Réponse de `POST /machine-repairs/:id/archive` (« Archiver sans sortie »)
 * et `POST /machine-repairs/:id/handover` (« Machine rendue au client ») :
 * les colonnes scalaires de la fiche à jour, plus le résultat de l'envoi du
 * PDF sur Dropbox — jamais bloquant (D-03).
 */
export type MachineRepairHandoverResult = Pick<
  MachineRepair,
  | 'id'
  | 'archived_at'
  | 'entry_date'
  | 'exit_date'
  | 'dropbox_pdf_path'
  | 'dropbox_pdf_uploaded_at'
> & { pdf: PdfUploadOutcome };

/** Atelier R003 — motif du lien entre deux fiches (`GET /:id/related`). */
export type RelatedRepairMatch = 'phone' | 'name' | 'robot_code';

/** Une fiche liée par `GET /machine-repairs/:id/related` (passage précédent du client). */
export interface RelatedRepair {
  id: number;
  phone: string;
  first_name: string;
  last_name: string;
  robot_code: string | null;
  entry_date: string;
  exit_date: string | null;
  machine_type_name: string | null;
  brand_name: string | null;
  repair_or_maintenance: string;
  state: string | null;
  archived_at: string | null;
  match: RelatedRepairMatch[];
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

/**
 * Réponse de `POST /machine-repairs/:id/archive` et `/unarchive` : les
 * colonnes scalaires de la fiche (pas de relations, pas d'URL d'images). On
 * ne type que ce que l'atelier consomme réellement après l'appel.
 */
export type MachineRepairArchiveResult = Pick<MachineRepair, 'id' | 'archived_at'>;

/** Filtre d'archivage transmis à `POST /supervisor/machine-repairs`. */
export type ArchiveFilter = 'active' | 'archived' | 'all';

/**
 * Fields the list endpoint (POST /supervisor/machine-repairs) actually returns.
 *
 * The list payload is deliberately narrower than MachineRepair: images,
 * signature, replaced parts and the postal details are only served by the
 * detail endpoint. Typing the list this way makes the compiler catch any list
 * view that reads a field the server no longer sends.
 */
export type MachineRepairListItem = Omit<
  MachineRepair,
  | 'address'
  | 'email'
  | 'replaced_part_list'
  | 'imageUrls'
  | 'signatureUrl'
  | 'warranty'
  | 'devis'
  | 'city'
  | 'postal_code'
  | 'hivernage'
  | 'eventId'
  | 'calendarId'
  | 'dropbox_pdf_path'
  | 'dropbox_pdf_uploaded_at'
  | 'pdf_file_name'
  | 'dropbox_pdf_pending'
>;

export type MachineRepairListItemFromApi = Omit<
  MachineRepairListItem,
  'start_timer' | 'client_call_times'
> & {
  start_timer: string | null;
  client_call_times: string[];
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

// === Service Invoice Types ===

export enum ServiceInvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PAID = 'PAID',
}

export enum ServiceInvoiceType {
  REPAIR = 'REPAIR',
  INSTALLATION = 'INSTALLATION',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  TRANSFER = 'TRANSFER',
}

export enum InvoiceItemCategory {
  REPAIR = 'REPAIR',
  INSTALLATION = 'INSTALLATION',
}

export interface ServiceInvoiceLine {
  id: number;
  serviceInvoiceId: number;
  description: string;
  type: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  order: number;
}

export interface CalendarEvent {
  id: number;
  googleEventId: string;
  googleCalendarId: string;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceInvoice {
  id: number;
  invoiceNumber: string;
  status: ServiceInvoiceStatus;
  type: ServiceInvoiceType;

  machineRepairId: number | null;
  machineRepair?: MachineRepair | null;
  purchaseOrderId: number | null;
  purchaseOrder?: PurchaseOrder | null;

  clientFirstName: string;
  clientLastName: string;
  clientPhone: string;
  clientEmail: string;
  clientAddress: string;
  clientCity: string;
  clientPostalCode: string;

  paymentMethod: PaymentMethod;
  deposit: number;

  dolibarrInvoiceId: number | null;
  dolibarrThirdpartyId: number | null;
  dolibarrSyncStatus: string | null;
  dolibarrLastSyncAt: string | null;

  subtotalHT: number;
  vatRate: number;
  vatAmount: number;
  totalTTC: number;

  remarks: string | null;

  calendarEventId: number | null;
  calendarEvent: CalendarEvent | null;
  calendarEventUrl: string | null;

  createdAt: string;
  updatedAt: string;

  lines: ServiceInvoiceLine[];
}

export interface ServiceInvoiceItemConfig {
  id: number;
  name: string;
  type: string;
  unit: string;
  defaultPrice: number;
  priceUnit: string | null;
  order: number;
  isActive: boolean;
  category: InvoiceItemCategory;
  createdAt: string;
  updatedAt: string;
}

export interface DolibarrThirdparty {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  zip: string;
  town: string;
}

export interface DolibarrBankAccount {
  id: number;
  ref?: string;
  label: string;
  number?: string;
  bank: string;
  iban?: string;
  iban_prefix?: string;
  bic: string;
  type?: number; // 0=Savings, 1=Current, 2=Cash
}

export interface ThirdpartyConfirmation {
  confirmationType: 'create-client' | 'resolve-conflict' | 'select-client';
  invoiceClient: {
    name: string;
    email: string;
    phone: string;
    address: string;
    zip: string;
    town: string;
  };
  dolibarrClient?: DolibarrThirdparty;
  /** `select-client` : plusieurs tiers Dolibarr candidats. */
  matches?: DolibarrThirdpartyMatch[];
  /** `resolve-conflict` : champs qui diffèrent, libellés en français. */
  differences?: ThirdpartyDifference[];
}

/** Contrat de la réponse 409 de `POST /supervisor/service-invoices/:id/send`. */
export interface ThirdpartyDifference {
  field: string;
  invoice: string;
  dolibarr: string;
}

export interface DolibarrThirdpartyMatch extends DolibarrThirdparty {
  differences: ThirdpartyDifference[];
}

export interface RepairForInvoice {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  address: string;
  city: string | null;
  postal_code: string | null;
  fault_description: string;
  repair_or_maintenance: string;
  brand_name: string;
  robot_type_name: string | null;
  hasCalendarEvent: boolean;
  calendarEventId: number | null;
  eventStart: string | null;
  eventTitle: string | null;
  eventDescription: string | null;
  eventSource: string | null;
  createdAt: string;
}
