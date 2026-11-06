import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/authAPI';

const STORAGE_KEY = 'super_admin_push_muted';

let muted = false;
const listeners = new Set<(value: boolean) => void>();

export function isSuperAdminPushMuted(): boolean {
  return muted;
}

export function subscribeSuperAdminPushMute(listener: (value: boolean) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function publish(next: boolean): void {
  muted = next;
  listeners.forEach((listener) => listener(next));
}

/** In-memory only. A driver or admin on this phone should still hear their own alerts. */
export function clearSuperAdminPushMuteMemory(): void {
  publish(false);
}

export async function loadSuperAdminPushMute(): Promise<boolean> {
  try {
    const cached = await AsyncStorage.getItem(STORAGE_KEY);
    if (cached === '1' || cached === '0') {
      publish(cached === '1');
    }
  } catch {
    // Keep the current value if local storage is unavailable.
  }
  try {
    const remote = await authAPI.getPushMuted();
    publish(remote);
    await AsyncStorage.setItem(STORAGE_KEY, remote ? '1' : '0');
  } catch {
    // Server file may not be uploaded yet. The cached value still quiets foreground banners.
  }
  return muted;
}

export async function setSuperAdminPushMute(next: boolean): Promise<void> {
  const previous = muted;
  publish(next);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    await authAPI.setPushMuted(next);
  } catch (error) {
    publish(previous);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, previous ? '1' : '0');
    } catch {
      // Ignore a second storage failure while reverting.
    }
    throw error;
  }
}
