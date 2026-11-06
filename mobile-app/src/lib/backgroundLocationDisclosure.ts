import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

const STORAGE_KEY = 'backgroundLocationDisclosureChoice';

type Choice = 'accepted' | 'declined';
type Listener = (visible: boolean) => void;

let listener: Listener | null = null;
let pendingResolve: ((accepted: boolean) => void) | null = null;
let accessFlow: Promise<boolean> | null = null;
let initialPrompt: Promise<void> | null = null;
let answeredThisSession = false;

export function subscribeBackgroundLocationDisclosure(fn: Listener): () => void {
  listener = fn;
  return () => {
    if (listener === fn) listener = null;
  };
}

async function readChoice(): Promise<Choice | null> {
  const value = await AsyncStorage.getItem(STORAGE_KEY);
  if (value === 'accepted' || value === 'declined') return value;
  return null;
}

function waitForHost(): Promise<void> {
  if (listener) return Promise.resolve();
  return new Promise((resolve) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (listener || Date.now() - started > 2000) {
        clearInterval(timer);
        resolve();
      }
    }, 16);
  });
}

function presentDisclosure(): Promise<boolean> {
  if (!listener) return Promise.resolve(false);
  return new Promise((resolve) => {
    pendingResolve = resolve;
    listener?.(true);
  });
}

export async function settleBackgroundLocationDisclosure(accepted: boolean): Promise<void> {
  answeredThisSession = true;
  await AsyncStorage.setItem(STORAGE_KEY, accepted ? 'accepted' : 'declined');
  const resolve = pendingResolve;
  pendingResolve = null;
  listener?.(false);
  resolve?.(accepted);
}

async function requestSystemBackgroundLocation(): Promise<boolean> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== 'granted') return false;
  const background = await Location.requestBackgroundPermissionsAsync().catch(() => ({ status: 'denied' as const }));
  return background.status === 'granted';
}

/**
 * Shows the in-app disclosure immediately before a background-location request.
 * First launch shows it to every user so it is part of normal app use.
 */
export function ensureBackgroundLocationAccess(): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(false);
  if (!accessFlow) {
    accessFlow = requestAccess().finally(() => {
      accessFlow = null;
    });
  }
  return accessFlow;
}

async function requestAccess(): Promise<boolean> {
  await waitForHost();
  const choice = await readChoice();
  const current = await Location.getBackgroundPermissionsAsync().catch(() => ({ status: 'undetermined' as const }));
  if (choice === 'accepted' && current.status === 'granted') return true;
  if (answeredThisSession && choice === 'declined') return false;
  if (answeredThisSession && choice === 'accepted') return requestSystemBackgroundLocation();

  const accepted = await presentDisclosure();
  if (!accepted) return false;
  if (current.status === 'granted') return true;
  return requestSystemBackgroundLocation();
}

/** First launch, before any other permission dialog. Later launches stay quiet once the user has chosen. */
export function whenBackgroundLocationDisclosureSettled(): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();
  if (!initialPrompt) {
    initialPrompt = (async () => {
      const choice = await readChoice();
      if (choice) return;
      await ensureBackgroundLocationAccess();
      const after = await readChoice();
      if (!after) initialPrompt = null;
    })();
  }
  return initialPrompt;
}
