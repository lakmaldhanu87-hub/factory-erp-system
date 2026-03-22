
import React, { useState } from 'react';
import { FactoryState } from '../types';
import { createAuditLog } from '../store';

const FinishedGoods: React.FC<{ state: FactoryState; updateState: (updater: (prev: FactoryState) => FactoryState) => void }> = ({ state, updateState }) => {
  const [openingValues, setOpeningValues] = useState<Record<string, { pcs: number; weight: number }>>({});
  const [adjustment, setAdjustment] = useState({ itemId: '', qty: 0, reason: '', date: new Date().toISOString().split('T')[0] });

  const fgItems = state.masterItems.filter(i => i.category === 'Finished Goods');
  const hasProductionRecords = state.productionLogs.length > 0;

  const handleSetOpening = () => {
    if (state.fgOpeningSet || hasProductionRecords) return;
    const values = Object.values(openingValues) as { pcs: number; weight: number }[];
    if (values.some(v => v.pcs < 0 || v.weight < 0)) { alert('Values cannot be negative.'); return; }

    updateState(prev => {
      const newFgStock = prev.fgStock.map(s => {
        const ov = openingValues[s.itemId];
        if (ov) return { ...s, stockPieces: ov.pcs, totalWeight: ov.weight };
        return s;
      });
      return { ...prev, fgStock: newFgStock, fgOpeningSet: true, auditLogs: [createAuditLog('Finished Goods', 'ADJUST', '0', 'Opening stock set'), ...prev.auditLogs] };
    });
  };

  const handleAdjust = () => {
    if (!adjustment.itemId || adjustment.qty === 0 || !adjustment.date) return;
    updateState(prev => {
      const stock = prev.fgStock.find(s => s.itemId === adjustment.itemId);
      if (!stock || stock.stockPieces + adjustment.qty < 0) { alert('Invalid qty!'); return prev; }
      const formattedDate = new Date(adjustment.date).toLocaleDateString();
      const newFgStock = prev.fgStock.map(s => s.itemId === adjustment.itemId ? { ...s, stockPieces: s.stockPieces + adjustment.qty } : s);
      const logMsg = `Adjustment Log: ${adjustment.qty} pcs of ${fgItems.find(i => i.id === adjustment.itemId)?.name} on ${formattedDate}`;
      return { ...prev, fgStock: newFgStock, auditLogs: [createAuditLog('Finished Goods', 'ADJUST', stock.stockPieces.toString(), logMsg), ...prev.auditLogs] };
    });
    setAdjustment({ ...adjustment, qty: 0, reason: '' });
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><h3 className="text-sm font-bold text-slate-800 mb-6 uppercase tracking-wider">Inventory Status</h3><div className="grid grid-cols-1 md:grid-cols-4 gap-6">{state.fgStock.map(s => (<div key={s.itemId} className="p-4 bg-slate-50 border border-slate-100 rounded-lg"><div className="text-xs font-bold text-slate-400 uppercase">{fgItems.find(i => i.id === s.itemId)?.name}</div><div className="text-2xl font-extrabold text-slate-900">{s.stockPieces.toLocaleString()} Pcs</div></div>))}</div></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Manual Adjustment</h3><div className="space-y-4"><div><label className="text-xs font-bold text-slate-500">Date</label><input type="date" value={adjustment.date} onChange={e => setAdjustment({...adjustment, date: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded" /></div><div><label className="text-xs font-bold text-slate-500">Item</label><select value={adjustment.itemId} onChange={e => setAdjustment({...adjustment, itemId: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded"><option value="">-- Select --</option>{fgItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></div><div><label className="text-xs font-bold text-slate-500">Qty (+ / - Pcs)</label><input type="number" value={adjustment.qty} onChange={e => setAdjustment({...adjustment, qty: Number(e.target.value)})} className="w-full px-4 py-2 border border-slate-300 rounded" /></div><button onClick={handleAdjust} className="w-full py-2 bg-slate-800 text-white font-bold rounded">Apply Adjustment</button></div></div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-hidden"><h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Audit Logs</h3><div className="text-[10px] overflow-y-auto h-[200px]"><table className="w-full text-left"><thead><tr><th className="py-2">Time</th><th className="py-2">Detail</th></tr></thead><tbody className="divide-y divide-slate-50">{state.auditLogs.filter(l => l.module === 'Finished Goods').map(l => (<tr key={l.id}><td>{l.date} {l.time}</td><td>{l.newValue}</td></tr>))}</tbody></table></div></div>
      </div>
    </div>
  );
};

export default FinishedGoods;
