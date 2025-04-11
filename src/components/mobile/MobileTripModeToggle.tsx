
import { TripMode } from "@/lib/tripTypes";
import { motion } from "framer-motion";
import { Circle } from "lucide-react";

interface MobileTripModeToggleProps {
  tripMode: TripMode;
  onTripModeChange: (mode: TripMode) => void;
  disabled?: boolean;
}

export function MobileTripModeToggle({ 
  tripMode, 
  onTripModeChange,
  disabled = false
}: MobileTripModeToggleProps) {
  const options = [
    { id: "one-way" as TripMode, label: "One Way" },
    { id: "round-trip" as TripMode, label: "Round Trip" },
  ];

  return (
    <div className="relative flex w-full rounded-full border border-gray-200 p-1 bg-white">
      {options.map((option) => (
        <button
          key={option.id}
          onClick={() => !disabled && onTripModeChange(option.id)}
          className={`relative z-10 flex-1 py-2 flex justify-center items-center gap-2 rounded-full transition-colors duration-200 ${
            disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          } ${
            tripMode === option.id 
              ? "text-blue-600" 
              : "text-gray-600"
          }`}
          disabled={disabled}
        >
          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center
            ${tripMode === option.id ? "border-blue-600" : "border-gray-400"}`}>
            {tripMode === option.id && (
              <div className="w-2 h-2 rounded-full bg-blue-600"></div>
            )}
          </div>
          <span className="text-sm font-medium">{option.label}</span>
        </button>
      ))}
      {!disabled && (
        <motion.div
          className="absolute top-1 left-1 bottom-1 rounded-full bg-blue-50"
          initial={false}
          animate={{
            x: tripMode === "one-way" ? "0%" : "100%",
            width: "50%",
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
    </div>
  );
}
