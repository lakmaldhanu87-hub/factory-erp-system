
import React, { useState, useEffect } from 'react';
import { FactoryState, MasterItem } from './types';
import { loadState, saveState } from './store';
import Sidebar from './components/Sidebar';

// Pages
import Dashboard from './pages/Dashboard';
import MasterData from './pages/MasterData';
import RawMaterial from './pages/RawMaterial';
import PreExpanding from './pages/PreExpanding';
import SiloManagement from './pages/SiloManagement';
import Production from './pages/Production';
import FinishedGoods from './pages/FinishedGoods';
import Delivery from './pages/Delivery';
import FuelConsumption from './pages/FuelConsumption';
import Efficiency from './pages/Efficiency';
import Reports from './pages/Reports';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [state, setState] = useState<FactoryState>(loadState());

  // Save to local storage whenever state changes
  useEffect(() => {
    saveState(state);
  }, [state]);

  const updateState = (updater: (prev: FactoryState) => FactoryState) => {
    setState(prev => {
      const newState = updater(prev);
      return newState;
    });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard': return <Dashboard state={state} />;
      case 'Master Data': return <MasterData state={state} updateState={updateState} />;
      case 'Raw Material': return <RawMaterial state={state} updateState={updateState} />;
      case 'Pre Expanding': return <PreExpanding state={state} updateState={updateState} />;
      case 'Silo Management': return <SiloManagement state={state} updateState={updateState} />;
      case 'Production': return <Production state={state} updateState={updateState} />;
      case 'Finished Goods': return <FinishedGoods state={state} updateState={updateState} />;
      case 'Delivery': return <Delivery state={state} updateState={updateState} />;
      case 'Furnace Oil Consumption': return <FuelConsumption state={state} updateState={updateState} />;
      case 'Efficiency': return <Efficiency state={state} />;
      case 'Reports': return <Reports state={state} />;
      default: return <Dashboard state={state} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 ml-64 overflow-auto p-8">
        <header className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800">{activeTab}</h2>
          <p className="text-slate-500 text-sm">Factory Operation Control Panel</p>
        </header>
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
