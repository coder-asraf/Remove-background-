import React from 'react';
import { Sliders, BadgeCheck, Printer, Code2 } from 'lucide-react';

export type ActiveTab = 'editor' | 'passport' | 'print' | 'android';

interface NavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  hasImage: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  hasImage,
}) => {
  const tabs = [
    {
      id: 'editor' as ActiveTab,
      label: 'Photo Editor',
      sub: 'Rotate, Crop, Color, Adjust',
      icon: Sliders,
    },
    {
      id: 'passport' as ActiveTab,
      label: 'Passport & ID Maker',
      sub: '35×45mm, 2×2", Biometrics',
      icon: BadgeCheck,
    },
    {
      id: 'print' as ActiveTab,
      label: 'Print Sheet & PDF',
      sub: 'A4, 4×6", Cut Guides, Export',
      icon: Printer,
    },
    {
      id: 'android' as ActiveTab,
      label: 'Android Studio Repo',
      sub: 'Kotlin, Compose, GitHub Actions',
      icon: Code2,
    },
  ];

  return (
    <div className="bg-slate-900/90 backdrop-blur border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-left transition whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <div>
                <div className="text-xs font-semibold leading-tight">{tab.label}</div>
                <div className={`text-[10px] ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>
                  {tab.sub}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
