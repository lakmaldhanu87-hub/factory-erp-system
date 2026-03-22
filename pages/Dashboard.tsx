
import React from 'react';
import { FactoryState } from '../types';
import SiloGraphic from '../components/SiloGraphic';
import { BAG_CONVERSION_FACTOR } from '../constants';

const Dashboard: React.FC<{ state: FactoryState }> = ({ state }) => {
  // Logic for Yesterday Production and Fuel Ratio
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString();

  const yesterdayLogs = state.productionLogs.filter(l => l.date === yesterdayStr);
  
  // Total Production Weight = (Finished Goods Weight in Kg) + (Large Beads Weight in Kg)
  const yesterdayTotalProdWeight = yesterdayLogs.reduce((acc, l) => acc + l.totalProdWeight, 0);
  const yesterdayFgProdWeight = yesterdayLogs.reduce((acc, l) => acc + (l.isLargeBeads ? 0 : l.totalProdWeight), 0);
  
  const yesterdayFuelLog = state.fuelLogs.find(l => l.date === yesterdayStr);
  const yesterdayFuelUsed = yesterdayFuelLog ? yesterdayFuelLog.used : 0;
  
  // Fuel Ratio = Total Fuel Consumption (Liters) / Total Production Weight (Kg)
  const yesterdayFuelRatio = yesterdayTotalProdWeight > 0 ? (yesterdayFuelUsed / yesterdayTotalProdWeight).toFixed(3) : '0.000';

  return (
    <div className="space-y-8">
      {/* Top Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Raw Material Stock</h3>
          <div className="space-y-3">
            {state.rawMaterialStock.length > 0 ? state.rawMaterialStock.map(rm => (
              <div key={rm.materialId} className="flex justify-between items-center pb-2 border-b border-slate-50">
                <span className="text-sm text-slate-600 font-medium">{rm.materialName}</span>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-900">{rm.kg.toLocaleString()} kg</div>
                  <div className="text-[10px] text-slate-500">{(rm.kg / BAG_CONVERSION_FACTOR).toFixed(1)} Bags</div>
                </div>
              </div>
            )) : <p className="text-sm text-slate-400 italic">No stock found</p>}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Yesterday Production (FG)</h3>
          <p className="text-3xl font-extrabold text-slate-900">{yesterdayFgProdWeight.toLocaleString()} kg</p>
          <p className="text-xs text-slate-500 mt-1">Finished Goods Dry Weight ({yesterdayStr})</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Yesterday Fuel Ratio</h3>
          <p className="text-3xl font-extrabold text-blue-600">{yesterdayFuelRatio} L/kg</p>
          <p className="text-xs text-slate-500 mt-1">Fuel Used / (FG + Large Beads Weight)</p>
        </div>
      </div>

      {/* Silo Grid */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-6 uppercase tracking-widest">Silo Inventory Real-Time Monitoring</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {state.silos.map(silo => (
            <SiloGraphic key={silo.id} silo={silo} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
