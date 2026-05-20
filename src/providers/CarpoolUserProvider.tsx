import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { sharedCarpoolUserAPI, type CarpoolSession } from '@/services/api/sharedCarpoolAPI';

const STORAGE_KEY = 'carpool_user_session';

type CarpoolUserContextValue = {
  user: CarpoolSession | null;
  loading: boolean;
  isPhoneVerified: boolean;
  isProfileVerified: boolean;
  refreshProfile: () => Promise<void>;
  setSession: (session: CarpoolSession | null) => void;
  logout: () => void;
};

const CarpoolUserContext = createContext<CarpoolUserContextValue | null>(null);

function readStoredSession(): CarpoolSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CarpoolSession;
  } catch {
    return null;
  }
}

function isActiveSession(session: CarpoolSession | null | undefined): session is CarpoolSession {
  return Boolean(session?.phoneVerified && session.userId);
}

export function CarpoolUserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CarpoolSession | null>(() => readStoredSession());
  const [loading, setLoading] = useState(true);

  const persist = useCallback((session: CarpoolSession | null) => {
    if (session && isActiveSession(session)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      setUser(session);
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const stored = readStoredSession();
    if (!stored?.phone) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const profile = await sharedCarpoolUserAPI.getProfile(stored.phone);
      if (!profile.userId || !profile.phoneVerified) {
        persist(null);
        return;
      }
      persist({ ...stored, ...profile, phoneVerified: true });
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      if (status === 404) {
        persist(null);
        return;
      }
      if (isActiveSession(stored)) {
        setUser(stored);
      } else {
        persist(null);
      }
    } finally {
      setLoading(false);
    }
  }, [persist]);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const logout = useCallback(() => persist(null), [persist]);

  const value = useMemo(
    () => ({
      user: isActiveSession(user) ? user : null,
      loading,
      isPhoneVerified: isActiveSession(user),
      isProfileVerified: user?.verificationStatus === 'approved',
      refreshProfile,
      setSession: persist,
      logout,
    }),
    [user, loading, refreshProfile, persist],
  );

  return <CarpoolUserContext.Provider value={value}>{children}</CarpoolUserContext.Provider>;
}

export function useCarpoolUser() {
  const ctx = useContext(CarpoolUserContext);
  if (!ctx) throw new Error('useCarpoolUser must be used within CarpoolUserProvider');
  return ctx;
}

export function useCarpoolUserOptional() {
  return useContext(CarpoolUserContext);
}
