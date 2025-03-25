
// src/hooks/toast/toast-reducer.ts
import * as React from "react";

export interface Toast {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  open?: boolean;
  variant?: "default" | "destructive";
  duration?: number;
  className?: string;
  onOpenChange?: (open: boolean) => void;
}

export type ToasterToast = Toast;

type ActionType =
  | { type: "ADD_TOAST"; toast: ToasterToast }
  | { type: "UPDATE_TOAST"; toast: ToasterToast }
  | { type: "DISMISS_TOAST"; toastId?: string }
  | { type: "REMOVE_TOAST"; toastId?: string };

type State = {
  toasts: ToasterToast[];
};

const INITIAL_STATE: State = {
  toasts: [],
};

export function genId() {
  return Math.random().toString(36).substring(2, 9);
}

export const reducer = (state: State, action: ActionType): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [...state.toasts, action.toast],
      };

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case "DISMISS_TOAST": {
      const { toastId } = action;

      // If no id was provided, dismiss all toasts
      if (toastId === undefined) {
        return {
          ...state,
          toasts: state.toasts.map((t) => ({
            ...t,
            open: false,
          })),
        };
      }

      // Dismiss the specific toast
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId ? { ...t, open: false } : t
        ),
      };
    }

    case "REMOVE_TOAST": {
      const { toastId } = action;

      if (toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }

      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== toastId),
      };
    }
  }
};

const listeners: Array<(state: State) => void> = [];

let memoryState: State = INITIAL_STATE;

export function dispatch(action: ActionType) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

export function useToastStore(
  selector: (state: State) => ToasterToast[],
  equalityFn?: (a: ToasterToast[], b: ToasterToast[]) => boolean
) {
  const [state, setState] = React.useState<ToasterToast[]>(selector(memoryState));

  React.useEffect(() => {
    const listener = (state: State) => {
      const newState = selector(state);
      if (!equalityFn || !equalityFn(state.toasts, newState)) {
        setState(newState);
      }
    };

    listeners.push(listener);
    listener(memoryState);

    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [selector, equalityFn]);

  return state;
}
