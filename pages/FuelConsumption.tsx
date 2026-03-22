
import React, { useState } from 'react';
import { FactoryState, Shift, FuelEntry } from '../types';
import { createAuditLog } from '../store';
import { SHIFTS } from '../constants';

const FuelConsumption: React.FC<{ state: FactoryState; updateState: (updater: (prev: FactoryState) => FactoryState) => void }> = ({ state, updateState }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    shift: Shift.Day,
    opening: 0,
    purchased: 0,
    closing: 0
  });

  const handleFuelEntry = () => {
    const used = form.opening + form.purchased - form.closing;
    if (used < 0 || !form.date) { alert('Invalid calculation or missing date!'); return; }

    const formattedDate = new Date(form.date).toLocaleDateString();
    const todaysProd = state.productionLogs.filter(l => l.date === formattedDate).reduce((acc, l) => acc + l.totalProdWeight, 0);

    updateState(prev => {
      const entry: FuelEntry = { id: editingId || crypto.randomUUID(), ...form, date: formattedDate, used, totalProdWeightOnDate: todaysProd };
      let newLogs = prev.fuelLogs;
      if (editingId) newLogs = newLogs.filter(l => l.id !== editingId);
      const auditLog = createAuditLog('Fuel Consumption', editingId ? 'UPDATE' : 'CREATE', '', `Entry: ${used}L used on ${formattedDate}`);
      return { ...prev, fuelLogs: [entry, ...newLogs], auditLogs: [auditLog, ...prev.auditLogs] };
    });
    setForm({ ...form, purchased: 0 });
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete record?')) return;
    updateState(prev => {
      const auditLog = createAuditLog('Fuel Consumption', 'DELETE', id, 'Deleted record.');
      return { ...prev, fuelLogs: prev.fuelLogs.filter(l => l.id !== id), auditLogs: [auditLog, ...prev.auditLogs] };
    });
  };

  const handleEdit = (log: FuelEntry) => {
    setEditingId(log.id);
    const dateParts = log.date.split('/');
    const isoDate = dateParts.length === 3 ? `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}` : new Date().toISOString().split('T')[0];
    setForm({ date: isoDate, shift: log.shift, opening: log.opening, purchased: log.purchased, closing: log.closing });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-6 uppercase tracking-wider">{editingId ? 'Edit' : 'New'} Consumption Entry</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div><label className="text-xs font-bold text-slate-500">Date</label><input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded" /></div>
          <div><label className="text-xs font-bold text-slate-500">Shift</label><select value={form.shift} onChange={e => setForm({...form, shift: e.target.value as Shift})} className="w-full px-4 py-2 border border-slate-300 rounded">{SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          <div><label className="text-xs font-bold text-slate-500">Opening (L)</label><input type="number" value={form.opening} onChange={e => setForm({...form, opening: Number(e.target.value)})} className="w-full px-4 py-2 border border-slate-300 rounded" /></div>
          <div><label className="text-xs font-bold text-slate-500">Purchased (L)</label><input type="number" value={form.purchased} onChange={e => setForm({...form, purchased: Number(e.target.value)})} className="w-full px-4 py-2 border border-slate-300 rounded" /></div>
          <div><label className="text-xs font-bold text-slate-500">Closing (L)</label><input type="number" value={form.closing} onChange={e => setForm({...form, closing: Number(e.target.value)})} className="w-full px-4 py-2 border border-slate-300 rounded" /></div>
        </div>
        <div className="mt-6 flex space-x-4"><button onClick={handleFuelEntry} className="flex-1 py-4 bg-amber-600 text-white font-bold rounded-md uppercase">{editingId ? 'Update' : 'Record'} Consumption</button>{editingId && <button onClick={() => setEditingId(null)} className="px-8 bg-slate-200 font-bold rounded-md">Cancel</button>}</div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Fuel Consumption Logs</h3>
        <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50"><tr><th className="px-4 py-2">Date</th><th className="px-4 py-2">Shift</th><th className="px-4 py-2">Used</th><th className="px-4 py-2 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{state.fuelLogs.map(log => (<tr key={log.id} className="hover:bg-slate-50"><td className="px-4 py-2">{log.date}</td><td className="px-4 py-2">{log.shift}</td><td className="px-4 py-2 font-bold">{log.used} L</td><td className="px-4 py-2 text-right space-x-2"><button onClick={() => handleEdit(log)} className="text-blue-600 font-bold">Edit</button><button onClick={() => handleDelete(log.id)} className="text-red-600 font-bold">Delete</button></td></tr>))}</tbody></table></div>
      </div>
    </div>
  );
};

export default FuelConsumption;
