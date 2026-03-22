
import { FactoryState, SiloType, AuditLog, MasterItem, FinishedGoodsStock } from './types';
import { TOTAL_SILOS, SILO_CONFIGS } from './constants';

const STORAGE_KEY = 'factory_pro_state_v1';

const initialSilos = Array.from({ length: TOTAL_SILOS }, (_, i) => ({
  id: i + 1,
  currentStock: 0,
  materialName: '',
  type: SILO_CONFIGS[i + 1].type
}));

const defaultFGNames = [
  "Fish box", "Fish box lid", "STR box", "Special size box (10\")", "Half size box",
  "STR lid", "L pro half", "L pro", "L pro lid", "Mini box", "Mini box lid",
  "Mega box", "Mega lid", "S.S. type box", "S.S type lid", "Half gallon can",
  "One gallon can", "Gallon lid", "G7 floats large", "G7 floats small",
  "7cm diameter ball", "M block", "Normal Hard Block", "S Block"
];

const defaultItems: MasterItem[] = defaultFGNames.map(name => ({
  id: name.toLowerCase().replace(/\s+/g, '_'),
  name: name,
  category: 'Finished Goods',
  uom: 'Nos'
}));

const defaultFGStock: FinishedGoodsStock[] = defaultItems.map(item => ({
  itemId: item.id,
  stockPieces: 0,
  totalWeight: 0
}));

const initialState: FactoryState = {
  masterItems: defaultItems,
  rawMaterialStock: [],
  receivingLogs: [],
  issueLogs: [],
  silos: initialSilos,
  siloOpeningSet: false,
  preExpandingLogs: [],
  secondExpandingLogs: [],
  productionLogs: [],
  deliveryLogs: [],
  fgStock: defaultFGStock,
  fgOpeningSet: false,
  fuelLogs: [],
  auditLogs: []
};

export const loadState = (): FactoryState => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return initialState;
  const parsed = JSON.parse(saved);

  // Migration for Silos (to handle expansion from 11 to 13)
  if (parsed.silos.length < TOTAL_SILOS) {
    const existingIds = new Set(parsed.silos.map((s: any) => s.id));
    for (let i = 1; i <= TOTAL_SILOS; i++) {
      if (!existingIds.has(i)) {
        parsed.silos.push({
          id: i,
          currentStock: 0,
          materialName: '',
          type: SILO_CONFIGS[i]?.type || SiloType.Normal
        });
      }
    }
    parsed.silos.sort((a: any, b: any) => a.id - b.id);
  }

  // Ensure default items exist even if user has an older saved state
  const existingNames = new Set(parsed.masterItems.map((i: MasterItem) => i.name.toLowerCase()));
  const missingItems = defaultItems.filter(i => !existingNames.has(i.name.toLowerCase()));
  
  if (missingItems.length > 0) {
    parsed.masterItems = [...parsed.masterItems, ...missingItems];
    const missingStock = missingItems.map(i => ({ itemId: i.id, stockPieces: 0, totalWeight: 0 }));
    parsed.fgStock = [...parsed.fgStock, ...missingStock];
  }

  return parsed;
};

export const saveState = (state: FactoryState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const createAuditLog = (
  module: string,
  action: AuditLog['action'],
  oldValue: string,
  newValue: string
): AuditLog => {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    module,
    action,
    oldValue,
    newValue,
    user: 'System User',
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString()
  };
};
