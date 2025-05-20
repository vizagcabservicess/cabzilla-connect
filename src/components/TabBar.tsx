
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface TabBarProps {
  tabs: {
    id: string;
    label: string;
  }[];
  defaultTabId?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
}

export const TabBar: React.FC<TabBarProps> = ({ 
  tabs, 
  defaultTabId, 
  onTabChange,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState(defaultTabId || tabs[0]?.id);
  
  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    if (onTabChange) {
      onTabChange(tabId);
    }
  };
  
  return (
    <div className={`w-full overflow-hidden bg-white rounded-xl ${className}`}>
      <div className="grid grid-cols-4 relative">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`relative py-3 text-sm font-medium transition-colors z-10 px-1
              ${activeTab === tab.id ? 'text-white' : 'text-gray-500'}`}
          >
            {activeTab === tab.id && (
              <motion.div 
                layoutId="activeTabBackground"
                className="absolute inset-0 bg-blue-600 rounded-lg"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
