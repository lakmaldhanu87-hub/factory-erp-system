
import { SiloType, Shift } from './types';

export const TOTAL_SILOS = 13;
export const MAX_SILO_CAPACITY = 600; // kg
export const DRY_WEIGHT_RATIO = 0.94;
export const BAG_CONVERSION_FACTOR = 25; // 25kg per bag
export const TARGET_FUEL_RATIO = 0.025; // L/kg (Updated from 1.1 based on new example)

export const PRE_EXPANDER_MACHINES = ['Pre Expander 1', 'Pre Expander 2'];
export const SHIFTS: Shift[] = [Shift.Day, Shift.Night];

export const SILO_CONFIGS: Record<number, { type: SiloType }> = {
  5: { type: SiloType.ProductionReady },
  10: { type: SiloType.Intermediate },
};

for (let i = 1; i <= TOTAL_SILOS; i++) {
  if (!SILO_CONFIGS[i]) {
    SILO_CONFIGS[i] = { type: SiloType.Normal };
  }
}
