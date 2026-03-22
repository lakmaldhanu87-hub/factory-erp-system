
import React, { useState } from 'react';
import { FactoryState, ReceivingEntry, IssueEntry } from '../types';
import { createAuditLog } from '../store';
import { BAG_CONVERSION_FACTOR } from '../constants';

const RawMaterial: React.FC<{ state: FactoryState; updateState: (updater: (prev: FactoryState) => FactoryState) => void }> = ({ state, updateState }) => {
  const [selectedRM, setSelectedRM] = useState('');
  const [qty, setQty] = useState<number>(0);
  const [mode, setMode] = useState<'RECEIVING' | 'ISSUE'>('RECEIVING');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const rawMaterials = state.masterItems.filter(i => i.category === 'Raw Material');

  const handleProcess = () => {
    if (!selectedRM || qty <= 0 || !entryDate) {
      alert('Please select material, quantity, and date.');
      return;
    }

    updateState(prev => {
      let newState = { ...prev };
      const rm = rawMaterials.find(r => r.id === selectedRM);
      const formattedDate = new Date(entryDate).toLocaleDateString();

      // Reverse old entry if editing
      if (editingId) {
        if (mode === 'RECEIVING') {
          const old = prev.receivingLogs.find(l => l.id === editingId);
          if (old) {
            newState.rawMaterialStock = newState.rawMaterialStock.map(s => s.materialId === old.materialId ? { ...s, kg: s.kg - old.kg } : s);
            newState.receivingLogs = newState.receivingLogs.filter(l => l.id !== editingId);
          }
        } else {
          const old = prev.issueLogs.find(l => l.id === editingId);
          if (old) {
            newState.rawMaterialStock = newState.rawMaterialStock.map(s => s.materialId === old.materialId ? { ...s, kg: s.kg + old.kg, issuedKg: s.issuedKg - old.kg } : s);
            newState.issueLogs = newState.issueLogs.filter(l => l.id !== editingId);
          }
        }
      }

      // Re-check stock for issue
      const currentStock = newState.rawMaterialStock.find(s => s.materialId === selectedRM)?.kg || 0;
      if (mode === 'ISSUE' && currentStock < qty) {
        alert('Insufficient stock!');
        return prev;
      }

      const auditLog = createAuditLog('Raw Material', editingId ? 'UPDATE' : 'CREATE', '', `${mode} processed: ${qty}kg of ${rm?.name}`);
      const entryId = editingId || crypto.randomUUID();

      newState.rawMaterialStock = newState.rawMaterialStock.map(s => {
        if (s.materialId === selectedRM) {
          return {
            ...s,
            kg: mode === 'RECEIVING' ? s.kg + qty : s.kg - qty,
            issuedKg: mode === 'ISSUE' ? s.issuedKg + qty : s.issuedKg
          };
        }
        return s;
      });

      if (mode === 'RECEIVING') {
        const entry: ReceivingEntry = { id: entryId, materialId: selectedRM, kg: qty, date: formattedDate, timestamp: new Date(entryDate).getTime() };
        newState.receivingLogs = [entry, ...newState.receivingLogs];
      } else {
        const entry: IssueEntry = { id: entryId, materialId: selectedRM, kg: qty, date: formattedDate, timestamp: new Date(entryDate).getTime() };
        newState.issueLogs = [entry, ...newState.issueLogs];
      }

      return { ...newState, auditLogs: [auditLog, ...newState.auditLogs] };
    });

    setQty(0);
    setEditingId(null);
  };

  const handleDelete = (id: string, logType: 'RECEIVING' | 'ISSUE') => {
    if (!confirm('Are you sure you want to delete this record? Stock will be reversed.')) return;
    updateState(prev => {
      let newState = { ...prev };
      if (logType === 'RECEIVING') {
        const entry = prev.receivingLogs.find(l => l.id === id);
        if (entry) {
          newState.rawMaterialStock = newState.rawMaterialStock.map(s => s.materialId === entry.materialId ? { ...s, kg: s.kg - entry.kg } : s);
          newState.receivingLogs = newState.receivingLogs.filter(l => l.id !== id);
        }
      } else {
        const entry = prev.issueLogs.find(l => l.id === id);
        if (entry) {
          newState.rawMaterialStock = newState.rawMaterialStock.map(s => s.materialId === entry.materialId ? { ...s, kg: s.kg + entry.kg, issuedKg: s.issuedKg - entry.kg } : s);
          newState.issueLogs = newState.issueLogs.filter(l => l.id !== id);
        }
      }
      const auditLog = createAuditLog('Raw Material', 'DELETE', id, `Deleted ${logType} record.`);
      return { ...newState, auditLogs: [auditLog, ...newState.auditLogs] };
    });
  };

  const handleEdit = (entry: ReceivingEntry | IssueEntry, logType: 'RECEIVING' | 'ISSUE') => {
    setMode(logType);
    setEditingId(entry.id);
    setSelectedRM(entry.materialId);
    setQty(entry.kg);
    const dateParts = entry.date.split('/');
    const isoDate = dateParts.length === 3 ? `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}` : new Date().toISOString().split('T')[0];
    setEntryDate(isoDate);
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Raw Material Input</h3>
        <div className="flex space-x-4 mb-6">
          <button onClick={() => {setMode('RECEIVING'); setEditingId(null);}} className={`flex-1 py-2 text-sm font-bold rounded-md ${mode === 'RECEIVING' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-500'}`}>Receiving Entry</button>
          <button onClick={() => {setMode('ISSUE'); setEditingId(null);}} className={`flex-1 py-2 text-sm font-bold rounded-md ${mode === 'ISSUE' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-500'}`}>Issue for Expanding</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Date</label>
            <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-md" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Raw Material</label>
            <select value={selectedRM} onChange={e => setSelectedRM(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-md">
              <option value="">-- Select Material --</option>
              {rawMaterials.map(rm => <option key={rm.id} value={rm.id}>{rm.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Quantity (kg)</label>
            <input type="number" value={qty} onChange={e => setQty(Number(e.target.value))} className="w-full px-4 py-2 border border-slate-300 rounded-md" />
          </div>
        </div>
        <div className="mt-6 flex space-x-4">
          <button onClick={handleProcess} className={`flex-1 py-3 rounded-md text-white font-bold ${mode === 'RECEIVING' ? 'bg-green-600' : 'bg-orange-600'}`}>{editingId ? 'Update' : 'Submit'} {mode}</button>
          {editingId && <button onClick={() => setEditingId(null)} className="px-8 py-3 bg-slate-200 text-slate-700 font-bold rounded-md">Cancel</button>}
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Historical Records</h3>
        <div className="space-y-8">
          <div>
            <h4 className="text-xs font-bold text-slate-400 mb-2 uppercase">Receiving Logs</h4>
            <div className="overflow-x-auto"><table className="w-full text-left text-xs">
              <thead className="bg-slate-50"><tr><th className="px-4 py-2">Date</th><th className="px-4 py-2">Material</th><th className="px-4 py-2">Quantity</th><th className="px-4 py-2 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {state.receivingLogs.map(log => (<tr key={log.id} className="hover:bg-slate-50"><td className="px-4 py-2">{log.date}</td><td className="px-4 py-2">{rawMaterials.find(r => r.id === log.materialId)?.name}</td><td className="px-4 py-2">{log.kg} kg</td><td className="px-4 py-2 text-right space-x-2"><button onClick={() => handleEdit(log, 'RECEIVING')} className="text-blue-600 font-bold">Edit</button><button onClick={() => handleDelete(log.id, 'RECEIVING')} className="text-red-600 font-bold">Delete</button></td></tr>))}
              </tbody>
            </table></div>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-400 mb-2 uppercase">Issue Logs</h4>
            <div className="overflow-x-auto"><table className="w-full text-left text-xs">
              <thead className="bg-slate-50"><tr><th className="px-4 py-2">Date</th><th className="px-4 py-2">Material</th><th className="px-4 py-2">Quantity</th><th className="px-4 py-2 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {state.issueLogs.map(log => (<tr key={log.id} className="hover:bg-slate-50"><td className="px-4 py-2">{log.date}</td><td className="px-4 py-2">{rawMaterials.find(r => r.id === log.materialId)?.name}</td><td className="px-4 py-2">{log.kg} kg</td><td className="px-4 py-2 text-right space-x-2"><button onClick={() => handleEdit(log, 'ISSUE')} className="text-blue-600 font-bold">Edit</button><button onClick={() => handleDelete(log.id, 'ISSUE')} className="text-red-600 font-bold">Delete</button></td></tr>))}
              </tbody>
            </table></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RawMaterial;
