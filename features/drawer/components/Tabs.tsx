'use client';

import React from 'react';

export interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

/**
 * Tabs - Reusable tab navigation component
 * Features underline indicator that transitions between tabs
 * Matches ZeFile reference design
 */
const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-20 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={`relative text-base font-semibold transition-colors ${
            activeTab === tab.id
              ? 'text-gray-900'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          {tab.label}
          {/* Active indicator - green underline positioned on the gray border line */}
          {activeTab === tab.id && (
            <span
              className="absolute left-0 w-full h-[3px] bg-[#87E64B] rounded-full z-10"
              style={{ bottom: '-15px' }}
            />
          )}
        </button>
      ))}
    </div>
  );
};

export default Tabs;
