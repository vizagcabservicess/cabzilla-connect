import React, { createContext, useCallback, useContext, useState } from 'react';
import { smartBudgetAPI, smartBudgetVendorStorage } from '@/services/api/smartBudgetAPI';
import type { SmartBudgetVendor, SmartBudgetVendorAuth } from '@/types/smartBudget';

interface SmartBudgetVendorAuthContextType {
  vendor: SmartBudgetVendor | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { phone?: string; email?: string; password: string }) => Promise<SmartBudgetVendor>;
  applyAuth: (auth: SmartBudgetVendorAuth) => void;
  refreshVendor: (vendor: SmartBudgetVendor) => void;
  logout: () => void;
}

const SmartBudgetVendorAuthContext = createContext<SmartBudgetVendorAuthContextType | undefined>(
  undefined
);

function readStoredVendor(): SmartBudgetVendor | null {
  const token = smartBudgetVendorStorage.getToken();
  const stored = smartBudgetVendorStorage.getVendor();
  if (!token || !stored?.id) return null;
  return stored;
}

export function SmartBudgetVendorAuthProvider({ children }: { children: React.ReactNode }) {
  // Hydrate synchronously so route changes don't flash "logged out" and bounce to login.
  const [vendor, setVendor] = useState<SmartBudgetVendor | null>(() => readStoredVendor());
  const [isLoading, setIsLoading] = useState(false);

  const login = async (credentials: {
    phone?: string;
    email?: string;
    password: string;
  }): Promise<SmartBudgetVendor> => {
    setIsLoading(true);
    try {
      const auth = await smartBudgetAPI.vendor.login(credentials);
      if (!auth?.token || !auth?.vendor?.id) {
        throw new Error('Login succeeded but vendor session was incomplete. Redeploy vendor.php.');
      }
      setVendor(auth.vendor);
      return auth.vendor;
    } finally {
      setIsLoading(false);
    }
  };

  const applyAuth = useCallback((auth: SmartBudgetVendorAuth) => {
    smartBudgetVendorStorage.setAuth(auth);
    setVendor(auth.vendor);
  }, []);

  const refreshVendor = useCallback((next: SmartBudgetVendor) => {
    smartBudgetVendorStorage.setVendor(next);
    setVendor(next);
  }, []);

  const logout = useCallback(() => {
    smartBudgetAPI.vendor.logout();
    setVendor(null);
  }, []);

  return (
    <SmartBudgetVendorAuthContext.Provider
      value={{
        vendor,
        isAuthenticated: Boolean(vendor?.id && smartBudgetVendorStorage.getToken()),
        isLoading,
        login,
        applyAuth,
        refreshVendor,
        logout,
      }}
    >
      {children}
    </SmartBudgetVendorAuthContext.Provider>
  );
}

export function useSmartBudgetVendorAuth(): SmartBudgetVendorAuthContextType {
  const ctx = useContext(SmartBudgetVendorAuthContext);
  if (!ctx) {
    throw new Error('useSmartBudgetVendorAuth must be used within SmartBudgetVendorAuthProvider');
  }
  return ctx;
}
