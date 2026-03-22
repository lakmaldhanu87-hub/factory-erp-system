
import React, { useState, useEffect } from 'react';
import { FactoryState, Shift, ProductionEntry } from '../types';
import { createAuditLog } from '../store';
import { SHIFTS, DRY_WEIGHT_RATIO, MAX_SILO_CAPACITY } from '../constants';

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

  // Effect to lock values for Large Beads
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

  // Auto-calculated good quantity for Finished Goods
  const goodQty = form.isLargeBeads ? 0 : Math.max(0, form.totalQty - form.damagedQty);

  const handleProduction = () => {
    // Validation Logic
    const missingFields: string[] = [];
    if (!form.date) missingFields.push('Date');
    if (!form.operatorId) missingFields.push('Operator');
    
    if (!form.isLargeBeads) {
      if (!form.machineId) missingFields.push('Machine');
      if (!form.itemId) missingFields.push('Item');
      if (form.totalQty <= 0) missingFields.push('Total Quantity (Pieces)');
    } else {
      if (form.totalQty <= 0) missingFields.push('Total Quantity (Kg)');
    }

    if (missingFields.length > 0) {
      alert(`Please fill required fields: ${missingFields.join(', ')}`);
      return;
    }

    if (!form.isLargeBeads && form.damagedQty > form.totalQty) {
      alert('Damaged Quantity cannot exceed Total Quantity.');
      return;
    }

    const roundedQty = Number(Number(form.totalQty).toFixed(3));
    let dryWeight = 0;
    let totalProdWeight = 0;
    let damagedWeight = 0;

    if (form.isLargeBeads) {
      totalProdWeight = roundedQty;
      damagedWeight = 0;
      dryWeight = 0; // NULL logic as per requirement
    } else {
      dryWeight = Number((form.avgWetWeight * DRY_WEIGHT_RATIO).toFixed(3));
      totalProdWeight = Number((form.totalQty * dryWeight).toFixed(3));
      damagedWeight = Number((form.damagedQty * dryWeight).toFixed(3));
    }

    // Capacity Check for Silo 5 if Large Beads
    if (form.isLargeBeads) {
      const silo10 = state.silos.find(s => s.id === 10);
      const silo5 = state.silos.find(s => s.id === 5);
      
      if (!silo10 || silo10.currentStock < totalProdWeight) {
        alert(`Insufficient stock in Silo 10! Needs ${totalProdWeight.toFixed(3)}kg. Available: ${silo10?.currentStock.toFixed(3)}kg`);
        return;
      }
      
      if (silo5 && (Number((silo5.currentStock + totalProdWeight).toFixed(3))) > MAX_SILO_CAPACITY) {
        alert(`Maximum silo capacity is ${MAX_SILO_CAPACITY} kg. Current Silo 5: ${silo5.currentStock.toFixed(3)} kg`);
        return;
      }
    } else {
      // Standard FG check: Deduct from selected source silo
      const silo = state.silos.find(s => s.id === form.siloId);
      if (!silo || silo.currentStock < totalProdWeight) {
        alert(`Insufficient stock in Silo ${form.siloId}! Needs ${totalProdWeight.toFixed(3)}kg. Available: ${silo?.currentStock.toFixed(3)}kg`);
        return;
      }
    }

    updateState(prev => {
      let newState = { ...prev };
      const formattedDate = new Date(form.date).toLocaleDateString();

      // Reverse previous entry if editing
      if (editingId) {
        const oldEntry = prev.productionLogs.find(l => l.id === editingId);
        if (oldEntry) {
          if (oldEntry.isLargeBeads) {
            // Reverse Large Beads: Deduct from 5, Add back to 10
            newState.silos = newState.silos.map(s => {
              if (s.id === 10) return { ...s, currentStock: Number((s.currentStock + oldEntry.totalProdWeight).toFixed(3)) };
              if (s.id === 5) return { ...s, currentStock: Number((s.currentStock - oldEntry.totalProdWeight).toFixed(3)) };
              return s;
            });
          } else {
            // Reverse FG: Add back to Source Silo
            newState.silos = newState.silos.map(s => s.id === oldEntry.siloId ? { ...s, currentStock: Number((s.currentStock + oldEntry.totalProdWeight).toFixed(3)) } : s);
            newState.fgStock = newState.fgStock.map(s => s.itemId === oldEntry.itemId ? { ...s, stockPieces: s.stockPieces - oldEntry.goodQty, totalWeight: Number((s.totalWeight - (oldEntry.goodQty * oldEntry.dryWeight)).toFixed(3)) } : s);
          }
          newState.productionLogs = newState.productionLogs.filter(l => l.id !== editingId);
        }
      }

      // Apply New Stock Movement
      if (form.isLargeBeads) {
        // Large Beads Movement: Deduct from 10, Add to 5
        const s10Prev = newState.silos.find(s => s.id === 10)?.currentStock || 0;
        const s5Prev = newState.silos.find(s => s.id === 5)?.currentStock || 0;
        
        newState.silos = newState.silos.map(s => {
          if (s.id === 10) return { ...s, currentStock: Number((s.currentStock - totalProdWeight).toFixed(3)) };
          if (s.id === 5) {
            const sourceMaterial = newState.silos.find(src => src.id === 10)?.materialName || '';
            return { ...s, currentStock: Number((s.currentStock + totalProdWeight).toFixed(3)), materialName: sourceMaterial };
          }
          return s;
        });

        const auditMsg = `Large Beads Production: Deducted ${totalProdWeight.toFixed(3)} Kg from Silo 10 (${s10Prev.toFixed(3)} -> ${(s10Prev - totalProdWeight).toFixed(3)}), Added to Silo 5 (${s5Prev.toFixed(3)} -> ${(s5Prev + totalProdWeight).toFixed(3)})`;
        newState.auditLogs = [createAuditLog('Production', editingId ? 'UPDATE' : 'CREATE', '', auditMsg), ...newState.auditLogs];
      } else {
        // Standard FG: Deduct from selected source
        newState.silos = newState.silos.map(s => s.id === form.siloId ? { ...s, currentStock: Number((s.currentStock - totalProdWeight).toFixed(3)) } : s);
        newState.fgStock = newState.fgStock.map(s => s.itemId === form.itemId ? { ...s, stockPieces: s.stockPieces + goodQty, totalWeight: Number((s.totalWeight + (goodQty * dryWeight)).toFixed(3)) } : s);
        newState.auditLogs = [createAuditLog('Production', editingId ? 'UPDATE' : 'CREATE', '', `FG Recorded: ${goodQty} pcs of ${fgItems.find(i => i.id === form.itemId)?.name}`), ...newState.auditLogs];
      }

      const entry: ProductionEntry = {
        id: editingId || crypto.randomUUID(),
        ...form,
        siloId: form.isLargeBeads ? 5 : form.siloId, // Store Output Silo for Large Beads
        date: formattedDate,
        goodQty: form.isLargeBeads ? 0 : goodQty,
        dryWeight,
        totalProdWeight,
        damagedWeight,
        machineId: form.isLargeBeads ? '' : form.machineId,
        itemId: form.isLargeBeads ? '' : form.itemId
      };

      return {
        ...newState,
        productionLogs: [entry, ...newState.productionLogs]
      };
    });

    setForm({ ...form, totalQty: 0, damagedQty: 0, avgWetWeight: 0 });
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this record? Stock will be reversed.')) return;
    updateState(prev => {
      const entry = prev.productionLogs.find(l => l.id === id);
      if (!entry) return prev;

      let newState = { ...prev };
      if (entry.isLargeBeads) {
        // Reverse: Add to 10, Deduct from 5
        newState.silos = newState.silos.map(s => {
          if (s.id === 10) return { ...s, currentStock: Number((s.currentStock + entry.totalProdWeight).toFixed(3)) };
          if (s.id === 5) return { ...s, currentStock: Number((s.currentStock - entry.totalProdWeight).toFixed(3)) };
          return s;
        });
      } else {
        // Reverse FG: Add back to Source Silo
        newState.silos = newState.silos.map(s => s.id === entry.siloId ? { ...s, currentStock: Number((s.currentStock + entry.totalProdWeight).toFixed(3)) } : s);
        newState.fgStock = newState.fgStock.map(s => s.itemId === entry.itemId ? { ...s, stockPieces: s.stockPieces - entry.goodQty, totalWeight: Number((s.totalWeight - (entry.goodQty * entry.dryWeight)).toFixed(3)) } : s);
      }

      newState.productionLogs = newState.productionLogs.filter(l => l.id !== id);
      newState.auditLogs = [createAuditLog('Production', 'DELETE', id, `Deleted ${entry.isLargeBeads ? 'Large Beads' : 'FG'} and reversed stock movement`), ...newState.auditLogs];
      return newState;
    });
  };

  const handleEdit = (entry: ProductionEntry) => {
    setEditingId(entry.id);
    const dateParts = entry.date.split('/');
    const isoDate = dateParts.length === 3 ? `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}` : entry.date;
    setForm({
      date: isoDate,
      shift: entry.shift,
      machineId: entry.machineId,
      operatorId: entry.operatorId,
      siloId: entry.siloId,
      itemId: entry.itemId,
      totalQty: entry.totalQty,
      damagedQty: entry.damagedQty,
      avgWetWeight: entry.isLargeBeads ? 0 : (entry.dryWeight / DRY_WEIGHT_RATIO),
      isLargeBeads: entry.isLargeBeads
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-6 uppercase tracking-wider">{editingId ? 'Edit' : 'New'} Production Entry</h3>
        
        <div className="flex items-center space-x-6 mb-8 p-4 bg-slate-50 rounded-lg border border-slate-100">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Production Type:</label>
          <div className="flex items-center space-x-8">
            <label className="flex items-center space-x-2 text-sm font-bold text-slate-700 cursor-pointer">
              <input 
                type="radio" 
                className="w-4 h-4 text-blue-600"
                checked={!form.isLargeBeads} 
                onChange={() => setForm({...form, isLargeBeads: false})} 
              />
              <span>Finished Goods</span>
            </label>
            <label className="flex items-center space-x-2 text-sm font-bold text-slate-700 cursor-pointer">
              <input 
                type="radio" 
                className="w-4 h-4 text-blue-600"
                checked={form.isLargeBeads} 
                onChange={() => setForm({...form, isLargeBeads: true})} 
              />
              <span>Large Expanding Beads</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Date</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Shift</label>
            <select value={form.shift} onChange={e => setForm({...form, shift: e.target.value as Shift})} className="w-full px-4 py-2 border border-slate-300 rounded shadow-inner focus:ring-2 focus:ring-blue-500 outline-none">
              {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Operator</label>
            <select value={form.operatorId} onChange={e => setForm({...form, operatorId: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded shadow-inner focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">-- Select Operator --</option>
              {operators.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          
          {!form.isLargeBeads && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Machine</label>
              <select value={form.machineId} onChange={e => setForm({...form, machineId: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded shadow-inner focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">-- Select Machine --</option>
                {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">
              {form.isLargeBeads ? 'Material Flow Path' : 'Source Silo'}
            </label>
            {form.isLargeBeads ? (
              <div className="w-full px-4 py-2 border border-blue-200 rounded bg-blue-50 text-blue-700 font-bold text-xs">
                Material will be taken from Silo 10 and stored in Silo 5
              </div>
            ) : (
              <select value={form.siloId} onChange={e => setForm({...form, siloId: Number(e.target.value)})} className="w-full px-4 py-2 border border-slate-300 rounded shadow-inner focus:ring-2 focus:ring-blue-500 outline-none">
                {state.silos.filter(s => s.id !== 10).map(s => <option key={s.id} value={s.id}>Silo {s.id} ({s.currentStock.toFixed(3)}kg)</option>)}
              </select>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 border-t border-slate-100 pt-8">
          {!form.isLargeBeads && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Item Selection</label>
              <select value={form.itemId} onChange={e => setForm({...form, itemId: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded shadow-inner focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">-- Select Item --</option>
                {fgItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
          )}
          
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">
              {form.isLargeBeads ? 'Total Quantity (Kg)' : 'Total Quantity (Pieces)'}
            </label>
            <input 
              type="number" 
              step="0.001" 
              value={form.totalQty} 
              onChange={e => setForm({...form, totalQty: Number(e.target.value)})} 
              className="w-full px-4 py-2 border border-slate-300 rounded shadow-inner focus:ring-2 focus:ring-blue-500 outline-none font-bold" 
            />
          </div>

          {!form.isLargeBeads && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Damaged (Pieces)</label>
                <input type="number" value={form.damagedQty} onChange={e => setForm({...form, damagedQty: Number(e.target.value)})} className="w-full px-4 py-2 border border-slate-300 rounded shadow-inner focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Avg Wet Wt (kg/pc)</label>
                <input type="number" step="0.001" value={form.avgWetWeight} onChange={e => setForm({...form, avgWetWeight: Number(e.target.value)})} className="w-full px-4 py-2 border border-slate-300 rounded shadow-inner focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </>
          )}
        </div>

        <div className="mt-8 p-6 bg-slate-900 rounded-lg text-white flex flex-wrap gap-12 items-center">
          {!form.isLargeBeads ? (
            <>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Good Quantity</span>
                <span className="text-xl font-black text-green-400">{goodQty} <span className="text-xs font-normal">Pcs</span></span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Dry Weight</span>
                <span className="text-xl font-black text-blue-400">{(form.avgWetWeight * DRY_WEIGHT_RATIO).toFixed(3)} <span className="text-xs font-normal">kg</span></span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Weight</span>
                <span className="text-xl font-black text-blue-400">{(form.totalQty * (form.avgWetWeight * DRY_WEIGHT_RATIO)).toFixed(3)} <span className="text-xs font-normal">kg</span></span>
              </div>
            </>
          ) : (
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Production Weight</span>
              <span className="text-3xl font-black text-blue-400">{form.totalQty.toFixed(3)} <span className="text-lg font-normal">Kg</span></span>
              <div className="text-[10px] text-blue-300 mt-1 uppercase font-bold tracking-widest">Consumption Source: Silo 10</div>
            </div>
          )}
        </div>

        <div className="mt-8 flex space-x-4">
          <button onClick={handleProduction} className="flex-1 py-4 bg-slate-900 text-white font-bold rounded-md hover:bg-black uppercase tracking-widest transition-all shadow-lg">
            {editingId ? 'Update Record' : 'Record Production Entry'}
          </button>
          {editingId && (
            <button 
              onClick={() => {
                setEditingId(null); 
                setForm({...form, totalQty: 0, damagedQty: 0, avgWetWeight: 0});
              }} 
              className="px-8 py-4 bg-slate-200 text-slate-700 font-bold rounded-md hover:bg-slate-300 uppercase tracking-widest transition-all"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Historical Production Logs</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-bold uppercase text-slate-500">Date</th>
                <th className="px-4 py-3 font-bold uppercase text-slate-500">Item / Type</th>
                <th className="px-4 py-3 font-bold uppercase text-slate-500">Shift</th>
                <th className="px-4 py-3 font-bold uppercase text-slate-500">Machine</th>
                <th className="px-4 py-3 font-bold uppercase text-slate-500">Quantity</th>
                <th className="px-4 py-3 font-bold uppercase text-slate-500">Good/Dmg</th>
                <th className="px-4 py-3 font-bold uppercase text-slate-500">Weight (kg)</th>
                <th className="px-4 py-3 text-right font-bold uppercase text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.productionLogs.map(log => {
                const item = fgItems.find(i => i.id === log.itemId);
                const machine = machines.find(m => m.id === log.machineId);
                return (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">{log.date}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold">{log.isLargeBeads ? 'Large Expanding Beads' : (item?.name || '---')}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-widest">
                        {log.isLargeBeads ? 'Material Movement (S10 -> S5)' : 'Finished Product'}
                      </div>
                    </td>
                    <td className="px-4 py-3">{log.shift}</td>
                    <td className="px-4 py-3">{log.isLargeBeads ? '---' : (machine?.name || '---')}</td>
                    <td className="px-4 py-3 font-medium">
                      {log.isLargeBeads ? `${log.totalQty.toFixed(3)} Kg` : `${log.totalQty} Pcs`}
                    </td>
                    <td className="px-4 py-3">
                      {log.isLargeBeads ? '---' : `${log.goodQty} / ${log.damagedQty}`}
                    </td>
                    <td className="px-4 py-3 font-black text-blue-600">{log.totalProdWeight.toFixed(3)}</td>
                    <td className="px-4 py-3 text-right space-x-3">
                      <button onClick={() => handleEdit(log)} className="text-blue-600 font-bold uppercase hover:underline">Edit</button>
                      <button onClick={() => handleDelete(log.id)} className="text-red-600 font-bold uppercase hover:underline">Delete</button>
                    </td>
                  </tr>
                );
              })}
              {state.productionLogs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400 italic">No records found. Start recording production to see them here.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Production;
