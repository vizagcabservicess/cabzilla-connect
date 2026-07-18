import React, { createContext, useCallback, useContext, useState } from 'react';
import { smartBudgetAPI, smartBudgetCustomerStorage } from '@/services/api/smartBudgetAPI';
import type { SmartBudgetCustomer, SmartBudgetCustomerAuth } from '@/types/smartBudget';

interface SmartBudgetCustomerAuthContextType {
  customer: SmartBudgetCustomer | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  applyAuth: (auth: SmartBudgetCustomerAuth) => void;
  refreshCustomer: (customer: SmartBudgetCustomer) => void;
  logout: () => void;
}

const SmartBudgetCustomerAuthContext = createContext<SmartBudgetCustomerAuthContextType | undefined>(
  undefined
);

function readStoredCustomer(): SmartBudgetCustomer | null {
  const token = smartBudgetCustomerStorage.getToken();
  const stored = smartBudgetCustomerStorage.getCustomer();
  if (!token || !stored?.id) return null;
  return stored;
}

export function SmartBudgetCustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<SmartBudgetCustomer | null>(() => readStoredCustomer());
  const [isLoading] = useState(false);

  const applyAuth = useCallback((auth: SmartBudgetCustomerAuth) => {
    smartBudgetCustomerStorage.setAuth(auth);
    setCustomer(auth.customer);
  }, []);

  const refreshCustomer = useCallback((next: SmartBudgetCustomer) => {
    smartBudgetCustomerStorage.setCustomer(next);
    setCustomer(next);
  }, []);

  const logout = useCallback(() => {
    smartBudgetAPI.customer.logout();
    setCustomer(null);
  }, []);

  return (
    <SmartBudgetCustomerAuthContext.Provider
      value={{
        customer,
        isAuthenticated: Boolean(customer?.id && smartBudgetCustomerStorage.getToken()),
        isLoading,
        applyAuth,
        refreshCustomer,
        logout,
      }}
    >
      {children}
    </SmartBudgetCustomerAuthContext.Provider>
  );
}

export function useSmartBudgetCustomerAuth(): SmartBudgetCustomerAuthContextType {
  const ctx = useContext(SmartBudgetCustomerAuthContext);
  if (!ctx) {
    throw new Error('useSmartBudgetCustomerAuth must be used within SmartBudgetCustomerAuthProvider');
  }
  return ctx;
}
