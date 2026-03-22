
import React, { useState, useEffect } from 'react';
import { FactoryState, DeliveryEntry } from '../types';
import { createAuditLog } from '../store';

const Delivery: React.FC<{ state: FactoryState; updateState: (updater: (prev: FactoryState) => FactoryState) => void }> = ({ state, updateState }) => {
  // Debug log to verify mounting
  useEffect(() => {
    console.log("Delivery window mounted");
  }, []);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    itemId: '',
    quantity: '',
    remarks: ''
  });

  const fgItems = state.masterItems.filter(i => i.category === 'Finished Goods');
  
  // Item Dropdown: FG Items + special "Large Beads" item
  const deliveryItems = [
    { id: 'large_beads', name: 'Large Beads', type: 'Special' },
    ...fgItems.map(i => ({ id: i.id, name: i.name, type: 'Finished Goods' }))
  ];

  const handleDelivery = () => {
    const qtyNum = parseFloat(form.quantity);

    // Mandatory Field Validation
    if (!form.date || !form.itemId || isNaN(qtyNum) || qtyNum <= 0) {
      alert('Please fill all required fields: Date, Item, and Quantity.');
      return;
    }

    const selectedItem = deliveryItems.find(i => i.id === form.itemId);
    const isLargeBeads = form.itemId === 'large_beads';
    
    // Decimal Rules: 3 for Kg (Large Beads), whole numbers for Nos (FG)
    const processedQty = isLargeBeads 
      ? Number(qtyNum.toFixed(3)) 
      : Math.floor(qtyNum);

    let success = true;

    updateState(prev => {
      let newState = { ...prev };
      const formattedDate = new Date(form.date).toLocaleDateString();

      // 1. REVERSE STOCK IF EDITING
      if (editingId) {
        const oldEntry = prev.deliveryLogs.find(l => l.id === editingId);
        if (oldEntry) {
          if (oldEntry.itemId === 'large_beads') {
            // Restore to Silo 5
            newState.silos = newState.silos.map(s => 
              s.id === 5 ? { ...s, currentStock: Number((s.currentStock + oldEntry.quantity).toFixed(3)) } : s
            );
          } else {
            // Restore to FG Stock
            newState.fgStock = newState.fgStock.map(s => 
              s.itemId === oldEntry.itemId ? { ...s, stockPieces: s.stockPieces + oldEntry.quantity } : s
            );
          }
          newState.deliveryLogs = newState.deliveryLogs.filter(l => l.id !== editingId);
        }
      }

      // 2. VALIDATION & STOCK DEDUCTION
      if (isLargeBeads) {
        const silo5 = newState.silos.find(s => s.id === 5);
        if (!silo5 || silo5.currentStock < processedQty) {
          alert(`Insufficient stock in Silo 5. Available: ${silo5?.currentStock.toFixed(3)} kg`);
          success = false;
          return prev;
        }
        // Deduct from Silo 5
        newState.silos = newState.silos.map(s => 
          s.id === 5 ? { ...s, currentStock: Number((s.currentStock - processedQty).toFixed(3)) } : s
        );
      } else {
        const stock = newState.fgStock.find(s => s.itemId === form.itemId);
        if (!stock || stock.stockPieces < processedQty) {
          alert(`Insufficient Finished Goods stock. Available: ${stock?.stockPieces || 0} Nos`);
          success = false;
          return prev;
        }
        // Deduct from FG Stock
        newState.fgStock = newState.fgStock.map(s => 
          s.itemId === form.itemId ? { ...s, stockPieces: s.stockPieces - processedQty } : s
        );
      }

      // 3. CREATE ENTRY
      const entryId = editingId || crypto.randomUUID();
      const unitLabel = isLargeBeads ? 'Kg' : 'Nos';
      const sourceLabel = isLargeBeads ? 'Silo 5' : 'Finished Goods Stock';

      const newEntry: DeliveryEntry = {
        id: entryId,
        date: formattedDate,
        itemId: form.itemId,
        itemName: selectedItem?.name || 'Unknown',
        quantity: processedQty,
        unit: unitLabel as any, // Using 'Nos' as requested in prompt logic description
        source: sourceLabel,
        remarks: form.remarks,
        timestamp: new Date(form.date).getTime()
      };

      const auditLog = createAuditLog(
        'Delivery', 
        editingId ? 'UPDATE' : 'CREATE', 
        '', 
        `Delivered ${processedQty} ${unitLabel} of ${newEntry.itemName}`
      );
      
      return {
        ...newState,
        deliveryLogs: [newEntry, ...newState.deliveryLogs],
        auditLogs: [auditLog, ...newState.auditLogs]
      };
    });

    if (success) {
      // Clear Form on success (Keeping date as today or selected)
      setForm({ ...form, quantity: '', remarks: '' });
      setEditingId(null);
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this delivery? Stock will be restored.')) return;
    updateState(prev => {
      const entry = prev.deliveryLogs.find(l => l.id === id);
      if (!entry) return prev;

      let newState = { ...prev };
      if (entry.itemId === 'large_beads') {
        newState.silos = newState.silos.map(s => 
          s.id === 5 ? { ...s, currentStock: Number((s.currentStock + entry.quantity).toFixed(3)) } : s
        );
      } else {
        newState.fgStock = newState.fgStock.map(s => 
          s.itemId === entry.itemId ? { ...s, stockPieces: s.stockPieces + entry.quantity } : s
        );
      }

      const auditLog = createAuditLog('Delivery', 'DELETE', id, `Deleted delivery: restored ${entry.quantity} ${entry.unit} of ${entry.itemName}`);
      newState.deliveryLogs = newState.deliveryLogs.filter(l => l.id !== id);
      newState.auditLogs = [auditLog, ...newState.auditLogs];

      return newState;
    });
  };

  const handleEdit = (entry: DeliveryEntry) => {
    setEditingId(entry.id);
    const dateParts = entry.date.split('/');
    const isoDate = dateParts.length === 3 
      ? `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}` 
      : entry.date;
    
    setForm({
      date: isoDate,
      itemId: entry.itemId,
      quantity: entry.quantity.toString(),
      remarks: entry.remarks || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-8 min-h-[400px]">
      {/* 1. Form Section */}
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-6 uppercase tracking-wider">
          {editingId ? 'Edit Delivery' : 'New Delivery Entry'}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* A. Date Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Delivery Date (Required)</label>
            <input 
              type="date" 
              required
              value={form.date} 
              onChange={e => setForm({ ...form, date: e.target.value })} 
              className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" 
            />
          </div>

          {/* B. Item Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Item (Required)</label>
            <select 
              required
              value={form.itemId} 
              onChange={e => setForm({ ...form, itemId: e.target.value })} 
              className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">-- Select Item --</option>
              {deliveryItems.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>

          {/* C. Delivered Quantity Input */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">
              Quantity {form.itemId === 'large_beads' ? '(Kg)' : '(Nos)'}
            </label>
            <input 
              type="number" 
              required
              step={form.itemId === 'large_beads' ? '0.001' : '1'}
              value={form.quantity} 
              onChange={e => setForm({ ...form, quantity: e.target.value })} 
              className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none font-bold" 
              placeholder="Enter amount"
            />
          </div>

          {/* Optional Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Remarks</label>
            <input 
              type="text" 
              value={form.remarks} 
              onChange={e => setForm({ ...form, remarks: e.target.value })} 
              className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" 
              placeholder="Optional notes"
            />
          </div>
        </div>

        {/* D. Record Delivery Button */}
        <div className="flex space-x-4">
          <button 
            onClick={handleDelivery} 
            className="flex-1 py-4 bg-slate-900 text-white font-bold rounded-md uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95"
          >
            {editingId ? 'Update Delivery' : 'Record Delivery'}
          </button>
          {editingId && (
            <button 
              onClick={() => {
                setEditingId(null);
                setForm({ ...form, quantity: '', remarks: '' });
              }} 
              className="px-8 bg-slate-200 text-slate-700 font-bold rounded-md uppercase tracking-widest hover:bg-slate-300 transition-all"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="border-t border-slate-100 my-4" />

      {/* E. Delivery Entry Table */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Recent Delivery Records</h3>
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 font-bold uppercase text-slate-500">Date</th>
                <th className="px-4 py-3 font-bold uppercase text-slate-500">Item</th>
                <th className="px-4 py-3 font-bold uppercase text-slate-500">Delivered Qty</th>
                <th className="px-4 py-3 font-bold uppercase text-slate-500">Unit</th>
                <th className="px-4 py-3 text-right font-bold uppercase text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.deliveryLogs.length > 0 ? state.deliveryLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-600">{log.date}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">{log.itemName}</td>
                  <td className="px-4 py-3 font-black text-blue-600">
                    {log.itemId === 'large_beads' ? log.quantity.toFixed(3) : log.quantity}
                  </td>
                  <td className="px-4 py-3 uppercase font-medium text-slate-500">{log.unit === 'Pieces' ? 'Nos' : log.unit}</td>
                  <td className="px-4 py-3 text-right space-x-4">
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
              )) : (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400 italic font-medium">
                    No delivery records yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Delivery;
