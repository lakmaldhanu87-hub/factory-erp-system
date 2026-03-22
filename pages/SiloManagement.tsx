
import React, { useState } from 'react';
import { FactoryState, Shift, SiloType } from '../types';
import { createAuditLog } from '../store';
import { SHIFTS, MAX_SILO_CAPACITY } from '../constants';
import SiloGraphic from '../components/SiloGraphic';

const SiloManagement: React.FC<{ state: FactoryState; updateState: (updater: (prev: FactoryState) => FactoryState) => void }> = ({ state, updateState }) => {
  const [openingValues, setOpeningValues] = useState<Record<number, number>>(Object.fromEntries(state.silos.map(s => [s.id, s.currentStock])));
  const [adjustment, setAdjustment] = useState({ siloId: 1, qty: 0, reason: '', date: new Date().toISOString().split('T')[0] });
  const [expanding, setExpanding] = useState({ shift: Shift.Day, operatorId: '', qty: 0, destId: 5, isLargeBeads: false, date: new Date().toISOString().split('T')[0] });
  const [editingExpId, setEditingExpId] = useState<string | null>(null);

  const operators = state.masterItems.filter(i => i.category === 'Operator');

  const handleSetOpening = () => {
    if (state.siloOpeningSet) return;
    updateState(prev => {
      const newSilos = prev.silos.map(s => ({ 
        ...s, 
        currentStock: Number(Math.min(MAX_SILO_CAPACITY, Math.max(0, Number(openingValues[s.id] || 0))).toFixed(3)) 
      }));
      return { ...prev, silos: newSilos, siloOpeningSet: true, auditLogs: [createAuditLog('Silo Management', 'ADJUST', '0', 'Opening Silo Stock Set'), ...prev.auditLogs] };
    });
  };

  const handleAdjust = () => {
    if (adjustment.qty === 0 || !adjustment.date) return;
    const roundedAdj = Number(Number(adjustment.qty).toFixed(3));
    
    updateState(prev => {
      const silo = prev.silos.find(s => s.id === adjustment.siloId);
      if (!silo) return prev;
      const newQty = Number((silo.currentStock + roundedAdj).toFixed(3));
      if (newQty < 0 || newQty > MAX_SILO_CAPACITY) { 
        alert(`Invalid quantity! Silo must be between 0 and ${MAX_SILO_CAPACITY} kg.`); 
        return prev; 
      }
      
      const formattedDate = new Date(adjustment.date).toLocaleDateString();
      const newSilos = prev.silos.map(s => s.id === adjustment.siloId ? { ...s, currentStock: newQty } : s);
      const auditLog = createAuditLog('Silo Management', 'ADJUST', silo.currentStock.toFixed(3), `Manual Adjustment: ${roundedAdj.toFixed(3)}kg on ${formattedDate}`);
      return { ...prev, silos: newSilos, auditLogs: [auditLog, ...prev.auditLogs] };
    });
    setAdjustment({ ...adjustment, qty: 0, reason: '' });
  };

  const handleSecondExpand = () => {
    if (expanding.qty <= 0 || !expanding.date) return;
    const roundedQty = Number(Number(expanding.qty).toFixed(3));

    updateState(prev => {
      let newState = { ...prev };
      const formattedDate = new Date(expanding.date).toLocaleDateString();

      if (editingExpId) {
        const old = prev.secondExpandingLogs.find(l => l.id === editingExpId);
        if (old) {
          newState.silos = newState.silos.map(s => {
            if (s.id === 10) return { ...s, currentStock: Number((s.currentStock + old.quantityKg).toFixed(3)) };
            if (s.id === old.destSiloId) return { ...s, currentStock: Number((s.currentStock - old.quantityKg).toFixed(3)) };
            return s;
          });
          newState.secondExpandingLogs = newState.secondExpandingLogs.filter(l => l.id !== editingExpId);
        }
      }

      const silo10 = newState.silos.find(s => s.id === 10);
      const destSilo = newState.silos.find(s => s.id === expanding.destId);
      if (!silo10 || silo10.currentStock < roundedQty) {
        alert('Insufficient stock in Silo 10!'); 
        return prev;
      }
      if (!destSilo || Number((destSilo.currentStock + roundedQty).toFixed(3)) > MAX_SILO_CAPACITY) {
        alert(`Maximum silo capacity is ${MAX_SILO_CAPACITY} kg!`); 
        return prev;
      }

      const entryId = editingExpId || crypto.randomUUID();
      newState.silos = newState.silos.map(s => {
        if (s.id === 10) return { ...s, currentStock: Number((s.currentStock - roundedQty).toFixed(3)) };
        if (s.id === expanding.destId) return { ...s, currentStock: Number((s.currentStock + roundedQty).toFixed(3)), materialName: silo10.materialName };
        return s;
      });
      const newLog = { id: entryId, ...expanding, quantityKg: roundedQty, destSiloId: expanding.destId, date: formattedDate };
      newState.secondExpandingLogs = [newLog, ...newState.secondExpandingLogs];
      newState.auditLogs = [createAuditLog('Silo Management', editingExpId ? 'UPDATE' : 'CREATE', '', `Exp: ${roundedQty.toFixed(3)}kg S10 -> S${expanding.destId}`), ...newState.auditLogs];
      return newState;
    });
    setExpanding({ ...expanding, qty: 0 });
    setEditingExpId(null);
  };

  const deleteExpLog = (id: string) => {
    if (!confirm('Reverse stock?')) return;
    updateState(prev => {
      const entry = prev.secondExpandingLogs.find(l => l.id === id);
      if (!entry) return prev;
      const newSilos = prev.silos.map(s => {
        if (s.id === 10) return { ...s, currentStock: Number((s.currentStock + entry.quantityKg).toFixed(3)) };
        if (s.id === entry.destSiloId) return { ...s, currentStock: Number((s.currentStock - entry.quantityKg).toFixed(3)) };
        return s;
      });
      return { ...prev, silos: newSilos, secondExpandingLogs: prev.secondExpandingLogs.filter(l => l.id !== id), auditLogs: [createAuditLog('Silo Management', 'DELETE', id, 'Reversed Expansion'), ...prev.auditLogs] };
    });
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><h3 className="text-sm font-bold text-slate-800 mb-6 uppercase tracking-wider">Silo Monitoring</h3><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">{state.silos.map(silo => (<SiloGraphic key={silo.id} silo={silo} />))}</div></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Manual Adjustment</h3>
          <div className="space-y-4">
            <div><label className="text-xs font-bold text-slate-500">Date</label><input type="date" value={adjustment.date} onChange={e => setAdjustment({...adjustment, date: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-md" /></div>
            <div><label className="text-xs font-bold text-slate-500">Silo</label><select value={adjustment.siloId} onChange={e => setAdjustment({...adjustment, siloId: Number(e.target.value)})} className="w-full px-4 py-2 border border-slate-300 rounded-md">{state.silos.map(s => <option key={s.id} value={s.id}>Silo {s.id}</option>)}</select></div>
            <div><label className="text-xs font-bold text-slate-500">Qty (+/- kg)</label><input type="number" step="0.001" value={adjustment.qty} onChange={e => setAdjustment({...adjustment, qty: Number(e.target.value)})} className="w-full px-4 py-2 border border-slate-300 rounded-md" /></div>
            <button onClick={handleAdjust} className="w-full py-2 bg-slate-700 text-white font-bold rounded-md uppercase">Adjust Stock</button>
          </div>
        </div>
        <div className="bg-blue-50 p-6 rounded-xl border border-blue-200 shadow-sm">
          <h3 className="text-sm font-bold text-blue-900 mb-4 uppercase tracking-wider">Second Expanding</h3>
          <div className="space-y-4">
            <div><label className="text-xs font-bold text-slate-500">Date</label><input type="date" value={expanding.date} onChange={e => setExpanding({...expanding, date: e.target.value})} className="w-full px-4 py-2 border border-blue-200 rounded-md" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-bold text-slate-500">Dest</label><select value={expanding.destId} onChange={e => setExpanding({...expanding, destId: Number(e.target.value)})} className="w-full px-4 py-2 border border-blue-200 rounded-md"><option value={5}>Silo 5</option><option value={7}>Silo 7</option></select></div>
              <div><label className="text-xs font-bold text-slate-500">Qty (kg)</label><input type="number" step="0.001" value={expanding.qty} onChange={e => setExpanding({...expanding, qty: Number(e.target.value)})} className="w-full px-4 py-2 border border-blue-200 rounded-md" /></div>
            </div>
            <button onClick={handleSecondExpand} className="w-full py-3 bg-blue-600 text-white font-bold rounded-md uppercase">{editingExpId ? 'Update' : 'Process'}</button>
            {editingExpId && <button onClick={() => setEditingExpId(null)} className="w-full text-xs text-slate-400 mt-1 uppercase font-bold">Cancel Edit</button>}
          </div>
        </div>
      </div>
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">One-Time Opening Silo Stock</h3>
        <p className="text-[10px] text-slate-500 mb-4">* Allowed ONLY once. Max {MAX_SILO_CAPACITY} kg per silo.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 mb-4">
          {state.silos.map(s => (
            <div key={s.id} className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400">Silo {s.id}</label>
              <input 
                type="number" 
                step="0.001"
                disabled={state.siloOpeningSet}
                value={openingValues[s.id] || 0}
                onChange={e => setOpeningValues({...openingValues, [s.id]: Number(e.target.value)})}
                className="w-full text-xs px-2 py-1 border border-slate-200 rounded bg-slate-50"
              />
            </div>
          ))}
        </div>
        <button 
          onClick={handleSetOpening}
          disabled={state.siloOpeningSet}
          className={`w-full py-2 rounded font-bold text-white uppercase ${state.siloOpeningSet ? 'bg-slate-300' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {state.siloOpeningSet ? 'Opening Stock Locked' : 'Set Opening Silo Stock'}
        </button>
      </div>
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Expansion History</h3><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Dest</th><th className="px-4 py-3">Qty</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{state.secondExpandingLogs.map(log => (<tr key={log.id} className="hover:bg-slate-50"><td className="px-4 py-3">{log.date}</td><td className="px-4 py-3">Silo 10</td><td className="px-4 py-3">Silo {log.destSiloId}</td><td className="px-4 py-3 font-bold">{log.quantityKg.toFixed(3)} kg</td><td className="px-4 py-3 text-right space-x-2"><button onClick={() => {setEditingExpId(log.id); setExpanding({shift: log.shift, operatorId: log.operatorId, qty: log.quantityKg, destId: log.destSiloId, isLargeBeads: log.isLargeBeads, date: new Date(log.date).toISOString().split('T')[0]});}} className="text-blue-600 font-bold">Edit</button><button onClick={() => deleteExpLog(log.id)} className="text-red-600 font-bold">Delete</button></td></tr>))}</tbody></table></div></div>
    </div>
  );
};

export default SiloManagement;
