
export enum Shift {
  Day = 'Day',
  Night = 'Night'
}

export enum SiloType {
  Normal = 'Normal',
  ProductionReady = 'Production Ready',
  Intermediate = 'Intermediate'
}

export interface AuditLog {
  id: string;
  module: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ADJUST';
  oldValue: string;
  newValue: string;
  user: string;
  date: string;
  time: string;
}

export interface MasterItem {
  id: string;
  name: string;
  category: 'Finished Goods' | 'Raw Material' | 'Operator' | 'Production Machine';
  uom?: string;
}

export interface RawMaterialStock {
  materialId: string;
  materialName: string;
  kg: number;
  issuedKg: number;
}

export interface ReceivingEntry {
  id: string;
  materialId: string;
  kg: number;
  date: string;
  timestamp: number;
}

export interface IssueEntry {
  id: string;
  materialId: string;
  kg: number;
  date: string;
  timestamp: number;
}

export interface Silo {
  id: number;
  currentStock: number; // kg
  materialName: string;
  type: SiloType;
}

export interface PreExpandingEntry {
  id: string;
  date: string;
  shift: Shift;
  machine: string;
  materialId: string;
  operatorId: string;
  quantityKg: number;
  outputSiloId: number;
}

export interface SecondExpandingEntry {
  id: string;
  date: string;
  shift: Shift;
  operatorId: string;
  quantityKg: number;
  destSiloId: number;
  isLargeBeads: boolean;
}

export interface ProductionEntry {
  id: string;
  date: string;
  shift: Shift;
  machineId: string;
  operatorId: string;
  siloId: number;
  itemId: string;
  isLargeBeads: boolean;
  totalQty: number;
  goodQty: number;
  damagedQty: number;
  avgWetWeight: number; // For FG
  dryWeight: number; // 94% of avgWetWeight
  totalProdWeight: number;
  damagedWeight: number;
}

export interface FinishedGoodsStock {
  itemId: string;
  stockPieces: number;
  totalWeight: number;
}

export interface FuelEntry {
  id: string;
  date: string;
  shift: Shift;
  opening: number;
  purchased: number;
  closing: number;
  used: number;
  totalProdWeightOnDate: number;
}

export interface DeliveryEntry {
  id: string;
  date: string;
  itemId: string; // "large_beads" or MasterItem ID
  itemName: string;
  quantity: number;
  unit: 'Kg' | 'Pieces';
  source: string;
  remarks?: string;
  timestamp: number;
}

export interface FactoryState {
  masterItems: MasterItem[];
  rawMaterialStock: RawMaterialStock[];
  receivingLogs: ReceivingEntry[];
  issueLogs: IssueEntry[];
  silos: Silo[];
  siloOpeningSet: boolean;
  preExpandingLogs: PreExpandingEntry[];
  secondExpandingLogs: SecondExpandingEntry[];
  productionLogs: ProductionEntry[];
  deliveryLogs: DeliveryEntry[];
  fgStock: FinishedGoodsStock[];
  fgOpeningSet: boolean;
  fuelLogs: FuelEntry[];
  auditLogs: AuditLog[];
}
