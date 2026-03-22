
import React, { useState } from 'react';
import { FactoryState, Shift } from '../types';

const Reports: React.FC<{ state: FactoryState }> = ({ state }) => {
  const [reportType, setReportType] = useState<'PRODUCTION' | 'DELIVERY'>('PRODUCTION');
  const [filters, setFilters] = useState({
    dateStart: '',
    dateEnd: '',
    shift: '',
    itemId: '',
    machineId: ''
  });

  const fgItems = state.masterItems.filter(i => i.category === 'Finished Goods');
  const machines = state.masterItems.filter(i => i.category === 'Production Machine');

  const filteredLogs = state.productionLogs.filter(log => {
    if (filters.shift && log.shift !== filters.shift) return false;
    if (filters.itemId && log.itemId !== filters.itemId) return false;
    if (filters.machineId && log.machineId !== filters.machineId) return false;
    
    if (filters.dateStart || filters.dateEnd) {
      const logDate = new Date(log.date).getTime();
      if (filters.dateStart && logDate < new Date(filters.dateStart).getTime()) return false;
      if (filters.dateEnd && logDate > new Date(filters.dateEnd).getTime()) return false;
    }
    return true;
  });

  const filteredDeliveryLogs = state.deliveryLogs.filter(log => {
    if (filters.itemId && log.itemId !== filters.itemId) return false;
    if (filters.dateStart || filters.dateEnd) {
      const logDate = log.timestamp;
      if (filters.dateStart && logDate < new Date(filters.dateStart).getTime()) return false;
      if (filters.dateEnd && logDate > new Date(filters.dateEnd).getTime()) return false;
    }
    return true;
  });

  const exportToExcel = () => {
    let headers = "";
    let rows: string[] = [];
    let filename = "";

    if (reportType === 'PRODUCTION') {
      headers = [
        "Date", "Item", "UOM", "Production Qty", "Damaged Qty", "Good Qty", 
        "Shift", "Average Wet Weight", "Dry Weight", "Total Production Weight", "Total Damaged Weight", 
        "Machine", "Operator", "Fuel Used", "Fuel Ratio"
      ].join(",");

      rows = filteredLogs.map(log => {
        const fuelRecord = state.fuelLogs.find(f => f.date === log.date && f.shift === log.shift);
        const fuelUsed = fuelRecord ? fuelRecord.used : 0;
        const fuelRatio = log.totalProdWeight > 0 ? (fuelUsed / log.totalProdWeight).toFixed(3) : '0.000';
        const item = state.masterItems.find(i => i.id === log.itemId);
        const itemName = log.isLargeBeads ? 'Large Expanding Beads' : (item?.name || 'Unknown');
        const machineName = log.isLargeBeads ? '---' : (state.masterItems.find(m => m.id === log.machineId)?.name || '---');
        const operatorName = state.masterItems.find(o => o.id === log.operatorId)?.name || '---';

        return [
          log.date,
          `"${itemName.replace(/"/g, '""')}"`,
          log.isLargeBeads ? 'Kg' : 'Pcs',
          log.isLargeBeads ? log.totalQty.toFixed(3) : log.totalQty,
          log.isLargeBeads ? '' : log.damagedQty,
          log.isLargeBeads ? log.totalQty.toFixed(3) : log.goodQty,
          log.shift,
          log.isLargeBeads ? '' : log.avgWetWeight.toFixed(3),
          log.isLargeBeads ? '' : log.dryWeight.toFixed(3),
          log.totalProdWeight.toFixed(3),
          log.isLargeBeads ? '0.000' : log.damagedWeight.toFixed(3),
          `"${machineName.replace(/"/g, '""')}"`,
          `"${operatorName.replace(/"/g, '""')}"`,
          fuelUsed.toFixed(3),
          fuelRatio
        ].join(",");
      });
      filename = `production_report_${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      headers = ["Date", "Item", "Quantity", "Unit", "Source", "Remarks"].join(",");
      rows = filteredDeliveryLogs.map(log => [
        log.date,
        `"${log.itemName.replace(/"/g, '""')}"`,
        log.quantity,
        log.unit,
        `"${log.source.replace(/"/g, '""')}"`,
        `"${(log.remarks || "").replace(/"/g, '""')}"`
      ].join(","));
      filename = `delivery_report_${new Date().toISOString().split('T')[0]}.csv`;
    }

    const csvContent = headers + "\n" + rows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Report Type Selector */}
      <div className="flex space-x-2">
        <button 
          onClick={() => setReportType('PRODUCTION')}
          className={`px-6 py-2 rounded-md font-bold text-xs uppercase tracking-widest transition-all ${reportType === 'PRODUCTION' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'}`}
        >
          Production Report
        </button>
        <button 
          onClick={() => setReportType('DELIVERY')}
          className={`px-6 py-2 rounded-md font-bold text-xs uppercase tracking-widest transition-all ${reportType === 'DELIVERY' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'}`}
        >
          Delivery Report
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-wider">Report Filters</h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">From Date</label>
            <input 
              type="date"
              value={filters.dateStart}
              onChange={e => setFilters({...filters, dateStart: e.target.value})}
              className="w-full text-xs px-2 py-2 border border-slate-200 rounded"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">To Date</label>
            <input 
              type="date"
              value={filters.dateEnd}
              onChange={e => setFilters({...filters, dateEnd: e.target.value})}
              className="w-full text-xs px-2 py-2 border border-slate-200 rounded"
            />
          </div>
          {reportType === 'PRODUCTION' && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Shift</label>
              <select 
                value={filters.shift}
                onChange={e => setFilters({...filters, shift: e.target.value})}
                className="w-full text-xs px-2 py-2 border border-slate-200 rounded"
              >
                <option value="">All Shifts</option>
                <option value={Shift.Day}>Day</option>
                <option value={Shift.Night}>Night</option>
              </select>
            </div>
          )}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Item</label>
            <select 
              value={filters.itemId}
              onChange={e => setFilters({...filters, itemId: e.target.value})}
              className="w-full text-xs px-2 py-2 border border-slate-200 rounded"
            >
              <option value="">All Items</option>
              <option value="large_beads">Large Expanding Beads</option>
              {fgItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          {reportType === 'PRODUCTION' && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Machine</label>
              <select 
                value={filters.machineId}
                onChange={e => setFilters({...filters, machineId: e.target.value})}
                className="w-full text-xs px-2 py-2 border border-slate-200 rounded"
              >
                <option value="">All Machines</option>
                {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex items-end">
            <button 
              onClick={exportToExcel}
              className="w-full bg-green-700 text-white font-bold py-2 rounded text-xs hover:bg-green-800 uppercase transition-colors tracking-widest"
            >
              Export Excel
            </button>
          </div>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">
            {reportType === 'PRODUCTION' ? 'Full Detailed Production Report' : 'Full Detailed Delivery Report'}
          </h3>
          <span className="text-[10px] text-slate-400 font-bold uppercase">
            {(reportType === 'PRODUCTION' ? filteredLogs : filteredDeliveryLogs).length} Records Found
          </span>
        </div>
        <div className="overflow-x-auto">
          {reportType === 'PRODUCTION' ? (
            <table className="w-full text-[10px] text-left">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-2 py-3 font-bold text-slate-500 whitespace-nowrap uppercase">Date</th>
                  <th className="px-2 py-3 font-bold text-slate-500 uppercase">Item</th>
                  <th className="px-2 py-3 font-bold text-slate-500 uppercase">UOM</th>
                  <th className="px-2 py-3 font-bold text-slate-500 uppercase">Prod Qty</th>
                  <th className="px-2 py-3 font-bold text-slate-500 uppercase">Dmg Qty</th>
                  <th className="px-2 py-3 font-bold text-green-700 uppercase">Good Qty</th>
                  <th className="px-2 py-3 font-bold text-slate-500 uppercase">Shift</th>
                  <th className="px-2 py-3 font-bold text-slate-500 uppercase">Avg Wet</th>
                  <th className="px-2 py-3 font-bold text-slate-500 uppercase">Dry Wt</th>
                  <th className="px-2 py-3 font-bold text-slate-500 uppercase">Total Prod (kg)</th>
                  <th className="px-2 py-3 font-bold text-slate-500 uppercase">Total Dmg (kg)</th>
                  <th className="px-2 py-3 font-bold text-slate-500 uppercase">Machine</th>
                  <th className="px-2 py-3 font-bold text-slate-500 uppercase">Operator</th>
                  <th className="px-2 py-3 font-bold text-amber-700 uppercase">Fuel Used</th>
                  <th className="px-2 py-3 font-bold text-amber-700 uppercase">Fuel Ratio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map(log => {
                  const fuelRecord = state.fuelLogs.find(f => f.date === log.date && f.shift === log.shift);
                  const fuelUsed = fuelRecord ? fuelRecord.used : 0;
                  const fuelRatio = log.totalProdWeight > 0 ? (fuelUsed / log.totalProdWeight).toFixed(3) : '0.000';
                  const item = fgItems.find(i => i.id === log.itemId);
                  const itemName = log.isLargeBeads ? 'Large Expanding Beads' : (item?.name || '---');
                  const machineName = log.isLargeBeads ? '---' : (machines.find(m => m.id === log.machineId)?.name || '---');
                  const operatorName = state.masterItems.find(o => o.id === log.operatorId)?.name || '---';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-2 py-3 text-slate-500 whitespace-nowrap">{log.date}</td>
                      <td className="px-2 py-3 font-bold text-slate-900">{itemName}</td>
                      <td className="px-2 py-3 uppercase">{log.isLargeBeads ? 'Kg' : 'Pcs'}</td>
                      <td className="px-2 py-3 font-bold">{log.isLargeBeads ? log.totalQty.toFixed(3) : log.totalQty}</td>
                      <td className="px-2 py-3 text-red-500">{log.isLargeBeads ? '---' : log.damagedQty}</td>
                      <td className="px-2 py-3 text-green-700 font-bold">{log.isLargeBeads ? log.totalQty.toFixed(3) : log.goodQty}</td>
                      <td className="px-2 py-3 font-medium">{log.shift}</td>
                      <td className="px-2 py-3">{log.isLargeBeads ? '---' : log.avgWetWeight.toFixed(3)}</td>
                      <td className="px-2 py-3">{log.isLargeBeads ? '---' : log.dryWeight.toFixed(3)}</td>
                      <td className="px-2 py-3 font-black text-blue-600">{log.totalProdWeight.toFixed(3)}</td>
                      <td className="px-2 py-3 text-red-400">{log.isLargeBeads ? '0.000' : log.damagedWeight.toFixed(3)}</td>
                      <td className="px-2 py-3">{machineName}</td>
                      <td className="px-2 py-3">{operatorName}</td>
                      <td className="px-2 py-3 font-bold text-amber-700">{fuelUsed.toFixed(3)} L</td>
                      <td className="px-2 py-3 font-bold text-amber-900">{fuelRatio}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-[10px] text-left">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase">Date</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase">Item</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase text-right">Quantity</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase">Unit</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase">Source</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDeliveryLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">{log.date}</td>
                    <td className="px-4 py-3 font-bold">{log.itemName}</td>
                    <td className="px-4 py-3 text-right font-black text-blue-600">
                      {log.itemId === 'large_beads' ? log.quantity.toFixed(3) : log.quantity}
                    </td>
                    <td className="px-4 py-3 font-medium uppercase">{log.unit}</td>
                    <td className="px-4 py-3 text-slate-400">{log.source}</td>
                    <td className="px-4 py-3 italic">{log.remarks || '---'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {(reportType === 'PRODUCTION' ? filteredLogs : filteredDeliveryLogs).length === 0 && (
            <div className="px-4 py-8 text-center text-slate-400 italic">No logs match the current filters.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
