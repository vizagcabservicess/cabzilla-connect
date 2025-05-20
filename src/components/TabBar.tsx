
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
      <div className="flex relative">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`flex-1 relative py-3 text-sm font-medium transition-colors z-10
              ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-500'}`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div 
                layoutId="activeTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 mx-auto w-12"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
