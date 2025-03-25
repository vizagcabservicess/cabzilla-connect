
import * as React from "react";
import { State, memoryState, listeners, dispatch } from "./toast-reducer";
import { toast } from "./toast";
import { ToasterToast } from "./toast-reducer";

// Define the type for the toast context
export type ToastContextType = {
  toasts: ToasterToast[];
  toast: typeof toast;
  dismiss: (toastId?: string) => void;
};

// Create the context with default values
export const ToastContext = React.createContext<ToastContextType>({
  toasts: [],
  toast,
  dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
});

// Create a provider component
export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  return (
    <ToastContext.Provider
      value={{
        toasts: state.toasts,
        toast,
        dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
      }}
    >
      {children}
    </ToastContext.Provider>
  );
};
