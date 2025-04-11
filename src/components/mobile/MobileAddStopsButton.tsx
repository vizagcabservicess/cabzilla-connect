
import { Plus, X } from "lucide-react";
import { useState } from "react";

interface MobileAddStopsButtonProps {
  onAddStop?: () => void;
}

export function MobileAddStopsButton({ onAddStop }: MobileAddStopsButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const handleAddStop = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onAddStop) {
      onAddStop();
    } else {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 5000);
    }
  };
  
  return (
    <div className="relative">
      <button
        onClick={handleAddStop}
        type="button"
        className="border border-blue-500 text-blue-600 rounded-full hover:bg-blue-50 flex items-center justify-center py-2.5 px-4 w-full transition-colors duration-200"
      >
        <Plus size={16} className="mr-1" />
        <span className="text-sm font-medium">ADD STOPS</span>
      </button>
      
      {showTooltip && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 text-white text-sm p-3 rounded-lg z-50 flex items-start justify-between shadow-lg animate-fade-in">
          <span>You can add one or multiple stops</span>
          <button 
            onClick={() => setShowTooltip(false)} 
            type="button"
            className="ml-2 text-gray-300 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
