import React, { useState, useEffect } from 'react';
import { FactoryState, Shift, ProductionEntry } from '../types';
import { createAuditLog } from '../store';
import { SHIFTS, DRY_WEIGHT_RATIO, MAX_SILO_CAPACITY } from '../constants';
import { saveProduction } from '../firebase'; // ✅ ADDED

const Production: React.FC<{ state: FactoryState; updateState: (updater: (prev: FactoryState) => FactoryState) => void }> = ({ state, updateState }) => {

  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    shift: Shift.Day,
    machineId: '',
    operatorId: '',
    siloId: 5,
    itemId: '',
    totalQty: 0,
    damagedQty: 0,
    avgWetWeight: 0,
    isLargeBeads: false
  });

  useEffect(() => {
    if (form.isLargeBeads) {
      setForm(prev => ({
        ...prev,
        siloId: 5,
        machineId: '',
        itemId: '',
        damagedQty: 0,
        avgWetWeight: 0
      }));
    }
  }, [form.isLargeBeads]);

  const fgItems = state.masterItems.filter(i => i.category === 'Finished Goods');
  const operators = state.masterItems.filter(i => i.category === 'Operator');
  const machines = state.masterItems.filter(i => i.category === 'Production Machine');

  const goodQty = form.isLargeBeads ? 0 : Math.max(0, form.totalQty - form.damagedQty);

  const handleProduction = async () => {

    const missingFields: string[] = [];
    if (!form.date) missingFields.push('Date');
    if (!form.operatorId) missingFields.push('Operator');

    if (!form.isLargeBeads) {
      if (!form.machineId) missingFields.push('Machine');
      if (!form.itemId) missingFields.push('Item');
      if (form.totalQty <= 0) missingFields.push('Total Quantity');
    }

    if (missingFields.length > 0) {
      alert(`Fill: ${missingFields.join(', ')}`);
      return;
    }

    updateState(prev => {
      const entry: ProductionEntry = {
        id: crypto.randomUUID(),
        ...form,
        goodQty,
        dryWeight: 0,
        totalProdWeight: form.totalQty,
        damagedWeight: 0,
      };

      return {
        ...prev,
        productionLogs: [entry, ...prev.productionLogs]
      };
    });

    // 🔥 FIREBASE SAVE (MAIN PART)
    await saveProduction({
      date: form.date,
      shift: form.shift,
      machineId: form.machineId,
      operatorId: form.operatorId,
      siloId: form.siloId,
      itemId: form.itemId,
      totalQty: form.totalQty,
      damagedQty: form.damagedQty,
      avgWetWeight: form.avgWetWeight,
      isLargeBeads: form.isLargeBeads
    });

    alert("✅ Saved to database");

    setForm({
      ...form,
      totalQty: 0,
      damagedQty: 0,
      avgWetWeight: 0
    });
  };

  return (
    <div className="space-y-6">
      <button
        onClick={handleProduction}
        className="bg-black text-white px-6 py-3 rounded"
      >
        Record Production Entry
      </button>
    </div>
  );
};

export default Production;
