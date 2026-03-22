
import React, { useState } from 'react';
import { FactoryState, PreExpandingEntry, Shift } from '../types';
import { createAuditLog } from '../store';
import { PRE_EXPANDER_MACHINES, SHIFTS, MAX_SILO_CAPACITY } from '../constants';

const PreExpanding: React.FC<{ state: FactoryState; updateState: (updater: (prev: FactoryState) => FactoryState) => void }> = ({ state, updateState }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    shift: Shift.Day,
    machine: PRE_EXPANDER_MACHINES[0],
    materialId: '',
    operatorId: '',
    quantityKg: 0,
    outputSiloId: 1
  });

  const rawMaterials = state.masterItems.filter(i => i.category === 'Raw Material');
  const operators = state.masterItems.filter(i => i.category === 'Operator');

  const handleProcess = () => {
    // Detailed Validation Logic
    const missingFields: string[] = [];
    
    if (!form.date || form.date.trim() === '') missingFields.push('Date');
    if (!form.shift) missingFields.push('Shift');
    if (!form.materialId) missingFields.push('Raw Material');
    if (!form.operatorId) missingFields.push('Operator');
    if (form.quantityKg === null || form.quantityKg === undefined || form.quantityKg <= 0) {
      missingFields.push('Quantity (kg)');
    }
    if (!form.outputSiloId) missingFields.push('Output Silo');

    if (missingFields.length > 0) {
      alert(`Please fill required fields: ${missingFields.join(', ')}`);
      return;
    }

    // Accept up to 3 decimal places - Automatically round to 3 decimals
    const roundedQty = Number(Number(form.quantityKg).toFixed(3));

    updateState(prev => {
      let newState = { ...prev };
      const formattedDate = new Date(form.date).toLocaleDateString();

      // Reverse old entry if editing
      if (editingId) {
        const old = prev.preExpandingLogs.find(l => l.id === editingId);
        if (old) {
          newState.rawMaterialStock = newState.rawMaterialStock.map(s => 
            s.materialId === old.materialId 
              ? { ...s, issuedKg: Number((s.issuedKg + old.quantityKg).toFixed(3)) } 
              : s
          );
          newState.silos = newState.silos.map(s => 
            s.id === old.outputSiloId 
              ? { ...s, currentStock: Number((s.currentStock - old.quantityKg).toFixed(3)) } 
              : s
          );
          newState.preExpandingLogs = newState.preExpandingLogs.filter(l => l.id !== editingId);
        }
      }

      // Check capacity
      const silo = newState.silos.find(s => s.id === form.outputSiloId);
      if (!silo || Number((silo.currentStock + roundedQty).toFixed(3)) > MAX_SILO_CAPACITY) {
        alert(`Maximum silo capacity is ${MAX_SILO_CAPACITY} kg`);
        return prev;
      }

      // Check stock
      const stock = newState.rawMaterialStock.find(s => s.materialId === form.materialId);
      if (!stock || stock.issuedKg < roundedQty) {
        alert(`Insufficient issued stock for material. Available: ${stock?.issuedKg.toFixed(3)}kg`);
        return prev;
      }

      const auditLog = createAuditLog('Pre Expanding', editingId ? 'UPDATE' : 'CREATE', '', `Pre-expanded ${roundedQty.toFixed(3)}kg into Silo ${form.outputSiloId}`);
      const entryId = editingId || crypto.randomUUID();
      const newEntry: PreExpandingEntry = { id: entryId, ...form, quantityKg: roundedQty, date: formattedDate };

      newState.rawMaterialStock = newState.rawMaterialStock.map(s => 
        s.materialId === form.materialId 
          ? { ...s, issuedKg: Number((s.issuedKg - roundedQty).toFixed(3)) } 
          : s
      );
      newState.silos = newState.silos.map(s => 
        s.id === form.outputSiloId 
          ? { ...s, currentStock: Number((s.currentStock + roundedQty).toFixed(3)), materialName: rawMaterials.find(r => r.id === form.materialId)?.name || '' } 
          : s
      );
      newState.preExpandingLogs = [newEntry, ...newState.preExpandingLogs];

      return { ...newState, auditLogs: [auditLog, ...newState.auditLogs] };
    });

    setForm({ ...form, quantityKg: 0 });
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this record? Stock will be reversed.')) return;
    updateState(prev => {
      const entry = prev.preExpandingLogs.find(l => l.id === id);
      if (!entry) return prev;
      const newRmStock = prev.rawMaterialStock.map(s => 
        s.materialId === entry.materialId 
          ? { ...s, issuedKg: Number((s.issuedKg + entry.quantityKg).toFixed(3)) } 
          : s
      );
      const newSilos = prev.silos.map(s => 
        s.id === entry.outputSiloId 
          ? { ...s, currentStock: Number((s.currentStock - entry.quantityKg).toFixed(3)) } 
          : s
      );
      const auditLog = createAuditLog('Pre Expanding', 'DELETE', id, 'Deleted record and reversed stock.');
      return { ...prev, preExpandingLogs: prev.preExpandingLogs.filter(l => l.id !== id), rawMaterialStock: newRmStock, silos: newSilos, auditLogs: [auditLog, ...prev.auditLogs] };
    });
  };

  const handleEdit = (entry: PreExpandingEntry) => {
    setEditingId(entry.id);
    const dateParts = entry.date.split('/');
    // Handle both locale formats and iso formats
    const isoDate = dateParts.length === 3 
      ? `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}` 
      : entry.date;
    setForm({ ...entry, date: isoDate });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-6 uppercase tracking-wider">{editingId ? 'Edit' : 'New'} Process Entry</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Production Date</label>
              <input 
                type="date" 
                value={form.date} 
                onChange={e => setForm({ ...form, date: e.target.value })} 
                className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Shift</label>
                <select 
                  value={form.shift} 
                  onChange={e => setForm({ ...form, shift: e.target.value as Shift })} 
                  className="w-full px-4 py-2 border border-slate-300 rounded-md bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Machine</label>
                <select 
                  value={form.machine} 
                  onChange={e => setForm({ ...form, machine: e.target.value })} 
                  className="w-full px-4 py-2 border border-slate-300 rounded-md bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {PRE_EXPANDER_MACHINES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Raw Material Selection</label>
              <select 
                value={form.materialId} 
                onChange={e => setForm({ ...form, materialId: e.target.value })} 
                className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">-- Select Material --</option>
                {rawMaterials.map(rm => <option key={rm.id} value={rm.id}>{rm.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Operator Selection</label>
              <select 
                value={form.operatorId} 
                onChange={e => setForm({ ...form, operatorId: e.target.value })} 
                className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">-- Select Operator --</option>
                {operators.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Quantity (kg)</label>
                <input 
                  type="number" 
                  step="0.001" 
                  value={form.quantityKg} 
                  onChange={e => setForm({ ...form, quantityKg: Number(e.target.value) })} 
                  className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="0.000"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Output Silo</label>
                <select 
                  value={form.outputSiloId} 
                  onChange={e => setForm({ ...form, outputSiloId: Number(e.target.value) })} 
                  className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {state.silos.map(s => <option key={s.id} value={s.id}>Silo {s.id}</option>)}
                </select>
              </div>
            </div>

            <div className="flex space-x-4 pt-4">
              <button 
                onClick={handleProcess} 
                className="flex-1 py-4 bg-slate-800 text-white font-bold rounded-md uppercase tracking-wider hover:bg-black transition-colors"
              >
                {editingId ? 'Update Record' : 'Start Pre-Expanding'}
              </button>
              {editingId && (
                <button 
                  onClick={() => {
                    setEditingId(null);
                    setForm({ ...form, quantityKg: 0 });
                  }} 
                  className="px-8 bg-slate-200 text-slate-700 font-bold rounded-md uppercase tracking-wider hover:bg-slate-300 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-slate-900 p-8 rounded-xl text-white shadow-xl">
          <h3 className="text-sm font-bold text-slate-400 mb-6 uppercase tracking-wider border-b border-slate-800 pb-2">Available Issued Stock</h3>
          <div className="space-y-4">
            {state.rawMaterialStock.map(rm => (
              <div key={rm.materialId} className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div>
                  <div className="text-sm font-bold">{rm.materialName}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Ready for expanding</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-extrabold text-blue-400">{rm.issuedKg.toFixed(3)} kg</div>
                </div>
              </div>
            ))}
            {state.rawMaterialStock.length === 0 && (
              <p className="text-slate-500 italic text-sm">No raw material stock found.</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Historical Process Logs</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-500">Date</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-500">Machine</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-500">Operator</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-500">Silo</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-500">Qty</th>
                <th className="px-4 py-3 text-right font-bold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.preExpandingLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">{log.date}</td>
                  <td className="px-4 py-3">{log.machine}</td>
                  <td className="px-4 py-3">{state.masterItems.find(o => o.id === log.operatorId)?.name || '---'}</td>
                  <td className="px-4 py-3 font-medium">Silo {log.outputSiloId}</td>
                  <td className="px-4 py-3 font-bold text-blue-600">{log.quantityKg.toFixed(3)} kg</td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button 
                      onClick={() => handleEdit(log)} 
                      className="text-blue-600 font-bold uppercase tracking-tighter hover:underline"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(log.id)} 
                      className="text-red-600 font-bold uppercase tracking-tighter hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {state.preExpandingLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">No historical logs found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PreExpanding;
