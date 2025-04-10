
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TripType } from "@/lib/tripTypes";
import { useNavigate } from "react-router-dom";

interface MobileTabSelectorProps {
  selectedTab: TripType;
  onTabChange: (tab: TripType) => void;
}

export function MobileTabSelector({ selectedTab, onTabChange }: MobileTabSelectorProps) {
  const navigate = useNavigate();
  
  const tabs = [
    { id: "outstation" as TripType, label: "Outstation" },
    { id: "airport" as TripType, label: "Airport" },
    { id: "local" as TripType, label: "Hourly Rentals" },
  ];
  
  const [activeTab, setActiveTab] = useState<TripType>(selectedTab);

  useEffect(() => {
    // Update the active tab when selectedTab prop changes
    setActiveTab(selectedTab);
  }, [selectedTab]);
  
  const handleTabChange = (tab: TripType) => {
    setActiveTab(tab);
    onTabChange(tab);
    navigate(`/cabs/${tab}`);
    
    // Safely save to sessionStorage without changing the URL
    try {
      sessionStorage.setItem('tripType', tab);
    } catch (e) {
      console.error("Error saving trip type to session storage:", e);
    }
  };

  return (
    <div className="p-1 bg-gray-50 rounded-full w-full">
      <div className="relative flex rounded-full p-1 bg-white shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`relative z-10 flex-1 py-2 px-3 text-sm text-center rounded-full transition-colors duration-200 ${
              activeTab === tab.id 
                ? "text-blue-600 font-medium" 
                : "text-gray-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
        <motion.div
          className="absolute top-1 left-1 bottom-1 rounded-full bg-blue-50 border border-blue-200"
          initial={false}
          animate={{
            x: tabs.findIndex((tab) => tab.id === activeTab) * (100 / tabs.length) + "%",
            width: 100 / tabs.length + "%",
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      </div>
    </div>
  );
}
