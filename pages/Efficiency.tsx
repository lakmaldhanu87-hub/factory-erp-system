
import React, { useState } from 'react';
import { FactoryState } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Label } from 'recharts';

const Efficiency: React.FC<{ state: FactoryState }> = ({ state }) => {
  const [refDate, setRefDate] = useState(new Date().toISOString().split('T')[0]);

  const filteredProd = refDate ? state.productionLogs.filter(l => l.date === new Date(refDate).toLocaleDateString()) : state.productionLogs;
  const filteredFuel = refDate ? state.fuelLogs.filter(l => l.date === new Date(refDate).toLocaleDateString()) : state.fuelLogs;
  const filteredPreExp = refDate ? state.preExpandingLogs.filter(l => l.date === new Date(refDate).toLocaleDateString()) : state.preExpandingLogs;

  // 1. PIECE EFFICIENCY: Exclude Large Expanding Beads
  const pieceProd = filteredProd.filter(l => !l.isLargeBeads);
  const totalGoodPcs = pieceProd.reduce((acc, l) => acc + l.goodQty, 0);
  const totalDamagedPcs = pieceProd.reduce((acc, l) => acc + l.damagedQty, 0);
  const totalPcs = totalGoodPcs + totalDamagedPcs;
  const pieceEfficiency = totalPcs > 0 ? (totalGoodPcs / totalPcs) * 100 : 0;

  // 2. WEIGHT EFFICIENCY: (Total Production Weight / Raw Material Used) * 100
  // "Raw Material Used" is the total quantity processed in pre-expanding.
  const totalProdWeight = filteredProd.reduce((acc, l) => acc + l.totalProdWeight, 0);
  const rawMaterialUsed = filteredPreExp.reduce((acc, l) => acc + l.quantityKg, 0);
  const weightEfficiency = rawMaterialUsed > 0 ? (totalProdWeight / rawMaterialUsed) * 100 : 0;

  // 3. FUEL RATIO: Total Fuel Consumption (Liters) / Total Production Weight (Kg)
  // Large Beads are included in Total Production Weight.
  const totalFuelUsed = filteredFuel.reduce((acc, l) => acc + l.used, 0);
  const actualFuelRatio = totalProdWeight > 0 ? totalFuelUsed / totalProdWeight : 0;

  const COLORS = ['#10b981', '#ef4444'];

  const renderEfficiencyCard = (
    value: number, 
    label: string, 
    formula: string, 
    actuals: string, 
    finalResult: string
  ) => {
    const displayValue = Math.min(Math.max(0, value), 100);
    const lossValue = 100 - displayValue;
    
    const data = [
      { name: 'Efficiency', value: Number(displayValue.toFixed(1)) },
      { name: 'Loss', value: Number(lossValue.toFixed(1)) }
    ];

    return (
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
        <h4 className="text-xs font-bold text-slate-500 mb-6 uppercase tracking-widest">{label}</h4>
        <div className="w-full h-[320px] flex items-center justify-center relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                stroke="none"
              >
                <Cell fill={COLORS[0]} />
                <Cell fill={COLORS[1]} />
                <Label
                  value={`${displayValue.toFixed(1)}%`}
                  position="center"
                  className="text-3xl font-black text-slate-800"
                />
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-8 w-full border-t border-slate-100 pt-6 text-center space-y-4">
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Formula</div>
            <div className="text-xs font-semibold text-slate-600 px-4">{formula}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Actual Values</div>
            <div className="text-sm font-bold text-slate-800">{actuals}</div>
          </div>
          <div className="pt-2">
            <div className="text-lg font-black text-blue-600">{finalResult}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Date Reference Selector */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-bold text-slate-700 whitespace-nowrap">Analysis Date Filter:</label>
          <input 
            type="date" 
            value={refDate} 
            onChange={e => setRefDate(e.target.value)} 
            className="px-4 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
          />
        </div>
        <div className="text-xs font-medium text-slate-500 bg-slate-50 px-3 py-2 rounded-full border border-slate-100">
          Showing data for: <span className="text-blue-600 font-bold">{refDate ? new Date(refDate).toLocaleDateString() : 'Global History'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 1. Piece Efficiency */}
        {renderEfficiencyCard(
          pieceEfficiency, 
          "Piece Efficiency", 
          "(Good Pieces / Total Pieces) × 100", 
          `${totalGoodPcs.toLocaleString()} / ${totalPcs.toLocaleString()} Pcs`, 
          `${pieceEfficiency.toFixed(1)}% Efficiency`
        )}

        {/* 2. Weight Efficiency */}
        {renderEfficiencyCard(
          weightEfficiency, 
          "Weight Efficiency", 
          "(Total Production Weight / Raw Material Used) × 100", 
          `${totalProdWeight.toFixed(2)} / ${rawMaterialUsed.toFixed(2)} Kg`, 
          `${weightEfficiency.toFixed(1)}% Efficiency`
        )}

        {/* 3. Fuel Consumption Summary Card */}
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h4 className="text-xs font-bold text-slate-500 mb-8 uppercase tracking-widest text-center">Fuel Consumption Summary</h4>
          
          <div className="flex-1 flex flex-col justify-center space-y-8">
            <div className="flex justify-between items-center border-b border-slate-50 pb-4">
              <span className="text-sm font-medium text-slate-500">Total Fuel Used</span>
              <span className="text-lg font-bold text-slate-800">{totalFuelUsed.toLocaleString()} <span className="text-xs text-slate-400 font-normal">Liters</span></span>
            </div>
            
            <div className="flex justify-between items-center border-b border-slate-50 pb-4">
              <span className="text-sm font-medium text-slate-500">Total Production Weight</span>
              <span className="text-lg font-bold text-slate-800">{totalProdWeight.toLocaleString()} <span className="text-xs text-slate-400 font-normal">Kg</span></span>
            </div>

            <div className="bg-blue-50 p-6 rounded-lg text-center border border-blue-100">
              <div className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-2">Fuel Ratio (L/kg)</div>
              <div className="text-4xl font-black text-blue-600">{actualFuelRatio.toFixed(4)} <span className="text-base font-bold">L/kg</span></div>
              <div className="mt-2 text-[10px] text-blue-400 italic">Formula: Fuel Consumption / Total Prod Weight</div>
            </div>
          </div>

          <div className="mt-auto pt-6 text-center">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Comprehensive Production Weight</div>
            <div className="text-[10px] text-slate-500">
              Includes both Finished Goods and Large Expanding Beads
            </div>
          </div>
        </div>
      </div>

      <div className="text-center p-4 bg-white rounded-lg border border-slate-200">
        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Efficiency System Rules</p>
        <p className="text-[10px] text-slate-500 italic">
          * Large Beads are included in Weight Efficiency and Fuel Ratio but excluded from Piece Efficiency.
        </p>
      </div>
    </div>
  );
};

export default Efficiency;
