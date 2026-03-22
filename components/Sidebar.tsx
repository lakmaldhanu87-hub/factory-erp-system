
import React from 'react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const menuItems = [
  'Dashboard',
  'Master Data',
  'Raw Material',
  'Pre Expanding',
  'Silo Management',
  'Production',
  'Finished Goods',
  'Delivery',
  'Furnace Oil Consumption',
  'Efficiency',
  'Reports'
];

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="w-64 bg-slate-900 h-screen fixed left-0 top-0 text-white flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold tracking-tight">FactoryPro</h1>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">Management System</p>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item}>
              <button
                onClick={() => setActiveTab(item)}
                className={`w-full text-left px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === item
                    ? 'bg-blue-600 text-white border-r-4 border-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-slate-800 text-[10px] text-slate-500 text-center">
        v2.5.0 • Powered by FactoryPro Engine
      </div>
    </div>
  );
};

export default Sidebar;
