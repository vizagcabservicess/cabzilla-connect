
import * as React from "react";
import { ToastContext, ToastContextType } from "./toast-context";
import { toast } from "./toast";

// Hook to use the toast context
export const useToast = (): ToastContextType => {
  const context = React.useContext(ToastContext);
  
  if (!context) {
    // Provide a fallback implementation when used outside of ToastProvider
    return {
      toasts: [],
      toast,
      dismiss: (toastId?: string) => 
        dispatch({ type: "DISMISS_TOAST", toastId }),
    };
  }
  
  return context;
};

// Import dispatch for fallback case
import { dispatch } from "./toast-reducer";
