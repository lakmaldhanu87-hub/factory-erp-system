
import React from 'react';
import { Silo } from '../types';
import { MAX_SILO_CAPACITY } from '../constants';

interface SiloGraphicProps {
  silo: Silo;
}

const SiloGraphic: React.FC<SiloGraphicProps> = ({ silo }) => {
  const percentage = Math.min((silo.currentStock / MAX_SILO_CAPACITY) * 100, 100);
  
  let color = 'bg-slate-400'; // Empty/Grey
  if (percentage > 0) {
    if (percentage >= 90) color = 'bg-red-500'; // 90-100%
    else if (percentage >= 70) color = 'bg-yellow-500'; // 70-89%
    else color = 'bg-green-500'; // 0-69%
  }

  const typeColor = silo.type === 'Production Ready' ? 'text-blue-600' : silo.type === 'Intermediate' ? 'text-amber-600' : 'text-slate-500';

  return (
    <div className="flex flex-col items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
      <div className="text-xs font-bold text-slate-400 mb-1">SILO {silo.id}</div>
      <div className="silo-tank">
        <div 
          className={`silo-fill ${color}`} 
          style={{ height: `${percentage}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[10px] font-bold text-white drop-shadow-md">
            {percentage.toFixed(0)}%
          </span>
        </div>
      </div>
      <div className="mt-2 text-center">
        <div className="text-[11px] font-bold text-slate-800">
          {silo.currentStock.toFixed(3)} / {MAX_SILO_CAPACITY} kg
        </div>
        <div className={`text-[10px] font-bold uppercase ${typeColor}`}>{silo.type}</div>
        <div className="text-[10px] text-slate-500 truncate w-24">
          {silo.materialName || '---'}
        </div>
      </div>
    </div>
  );
};

export default SiloGraphic;
