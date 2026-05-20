import type { CarpoolSearchParams } from './types';

const STORAGE_KEY = 'carpool_pending_commute_search';

/** Return URL after OTP — landing page resumes the ride search */
export const COMMUTE_SEARCH_RETURN = '/shared-carpooling?resume=1';

export function savePendingCommuteSearch(search: CarpoolSearchParams): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(search));
  } catch {
    /* ignore quota errors */
  }
}

export function loadPendingCommuteSearch(): CarpoolSearchParams | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CarpoolSearchParams;
  } catch {
    return null;
  }
}

export function clearPendingCommuteSearch(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function isCommuteSearchResume(returnTo: string): boolean {
  return returnTo.includes('resume=1');
}
