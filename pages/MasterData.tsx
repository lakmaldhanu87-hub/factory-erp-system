
import React, { useState } from 'react';
import { FactoryState, MasterItem, AuditLog } from '../types';
import { createAuditLog } from '../store';

const MasterData: React.FC<{ state: FactoryState; updateState: (updater: (prev: FactoryState) => FactoryState) => void }> = ({ state, updateState }) => {
  const [activeCategory, setActiveCategory] = useState<MasterItem['category']>('Finished Goods');
  const [newItemName, setNewItemName] = useState('');

  const handleAdd = () => {
    const trimmedName = newItemName.trim();
    if (!trimmedName) return;
    
    // Duplicate validation
    const isDuplicate = state.masterItems.some(
      item => item.name.toLowerCase() === trimmedName.toLowerCase() && item.category === activeCategory
    );

    if (isDuplicate) {
      alert(`An item with the name "${trimmedName}" already exists in ${activeCategory}.`);
      return;
    }

    const newItem: MasterItem = {
      id: crypto.randomUUID(),
      name: trimmedName,
      category: activeCategory,
      uom: activeCategory === 'Finished Goods' ? 'Nos' : undefined
    };

    updateState(prev => {
      const log = createAuditLog('Master Data', 'CREATE', '', `Add ${activeCategory}: ${trimmedName}`);
      
      // If adding Raw Material, initialize stock tracking
      let newRmStock = [...prev.rawMaterialStock];
      if (activeCategory === 'Raw Material') {
        newRmStock.push({
          materialId: newItem.id,
          materialName: newItem.name,
          kg: 0,
          issuedKg: 0
        });
      }

      // If adding FG, initialize FG stock tracking
      let newFgStock = [...prev.fgStock];
      if (activeCategory === 'Finished Goods') {
        newFgStock.push({
          itemId: newItem.id,
          stockPieces: 0,
          totalWeight: 0
        });
      }

      return {
        ...prev,
        masterItems: [...prev.masterItems, newItem],
        rawMaterialStock: newRmStock,
        fgStock: newFgStock,
        auditLogs: [log, ...prev.auditLogs]
      };
    });
    setNewItemName('');
  };

  const handleDelete = (id: string) => {
    // Check if deletion is allowed (no stock movement exists)
    // Production check
    const hasProduction = state.productionLogs.some(l => l.itemId === id);
    const hasDelivery = state.deliveryLogs.some(l => l.itemId === id);
    const hasReceiving = state.receivingLogs.some(l => l.materialId === id);
    const hasIssuing = state.issueLogs.some(l => l.materialId === id);

    if (hasProduction || hasDelivery || hasReceiving || hasIssuing) {
      alert("This item cannot be deleted because it has associated stock movements or production records.");
      return;
    }

    updateState(prev => {
      const item = prev.masterItems.find(i => i.id === id);
      const log = createAuditLog('Master Data', 'DELETE', item?.name || '', '');
      return {
        ...prev,
        masterItems: prev.masterItems.filter(i => i.id !== id),
        fgStock: prev.fgStock.filter(s => s.itemId !== id),
        rawMaterialStock: prev.rawMaterialStock.filter(s => s.materialId !== id),
        auditLogs: [log, ...prev.auditLogs]
      };
    });
  };

  const categories: MasterItem['category'][] = ['Finished Goods', 'Raw Material', 'Production Machine', 'Operator'];

  return (
    <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm max-w-4xl">
      <div className="flex space-x-2 mb-8 border-b border-slate-100">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeCategory === cat ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex gap-4 mb-8">
        <input
          type="text"
          value={newItemName}
          onChange={e => setNewItemName(e.target.value)}
          placeholder={`New ${activeCategory} name...`}
          className="flex-1 px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleAdd}
          className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700"
        >
          Add Item
        </button>
      </div>

      <div className="overflow-hidden border border-slate-200 rounded-lg">
        <table className="w-full text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Name</th>
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Unit</th>
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {state.masterItems.filter(i => i.category === activeCategory).map(item => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-sm text-slate-700 font-medium">{item.name}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{item.uom || '---'}</td>
                <td className="px-6 py-4 text-sm text-right">
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-red-600 hover:text-red-800 font-medium uppercase text-xs tracking-wider"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {state.masterItems.filter(i => i.category === activeCategory).length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-slate-400 italic">No {activeCategory} found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MasterData;
