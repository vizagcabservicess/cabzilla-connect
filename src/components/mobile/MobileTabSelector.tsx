
import { useState } from "react";
import { motion } from "framer-motion";
import { TripType } from "@/lib/tripTypes";

interface MobileTabSelectorProps {
  selectedTab: TripType;
  onTabChange: (tab: TripType) => void;
}

export function MobileTabSelector({ selectedTab, onTabChange }: MobileTabSelectorProps) {
  const tabs = [
    { id: "outstation" as TripType, label: "Outstation" },
    { id: "airport" as TripType, label: "Airport" },
    { id: "local" as TripType, label: "Hourly Rentals" },
  ];

  return (
    <div className="p-1 bg-gray-50 rounded-full w-full">
      <div className="relative flex rounded-full p-1 bg-white shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative z-10 flex-1 py-2 px-3 text-sm text-center rounded-full transition-colors duration-200 ${
              selectedTab === tab.id 
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
            x: tabs.findIndex((tab) => tab.id === selectedTab) * (100 / tabs.length) + "%",
            width: 100 / tabs.length + "%",
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      </div>
    </div>
  );
}
