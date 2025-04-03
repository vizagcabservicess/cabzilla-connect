
import { Button, ButtonProps } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { clearAllCaches } from "@/lib/cacheManager";

interface ClearCacheButtonProps extends ButtonProps {
  onClear?: () => void;
  showText?: boolean;
}

export function ClearCacheButton({ 
  onClear, 
  showText = true, 
  className, 
  variant = "outline",
  size = "sm",
  ...props 
}: ClearCacheButtonProps) {
  const [isClearing, setIsClearing] = useState(false);

  const handleClearCache = async () => {
    setIsClearing(true);
    
    try {
      await clearAllCaches();
      
      if (onClear) {
        onClear();
      }
    } catch (error) {
      console.error("Error clearing caches:", error);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={`${className || ''}`}
      onClick={handleClearCache}
      disabled={isClearing}
      {...props}
    >
      <RefreshCw className={`h-4 w-4 mr-1 ${isClearing ? 'animate-spin' : ''}`} />
      {showText && (isClearing ? "Clearing..." : "Clear Cache")}
    </Button>
  );
}
