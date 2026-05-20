import type { CarpoolSession } from '@/services/api/sharedCarpoolAPI';
import { carpoolLoginPath } from './carpoolAuthRoutes';

/** True when the user completed the employee/student profile form (not commute-only OTP) */
export function hasSubmittedProfileVerification(user: CarpoolSession | null | undefined): boolean {
  if (!user) return false;
  if (user.profileSubmitted) return true;
  if (user.verificationStatus === 'approved') return true;
  if (user.verificationStatus === 'pending' && user.userRole) return true;
  return false;
}

/** Route for the employee/student verification form or status screen */
export function getProfileVerificationPath(user: CarpoolSession | null | undefined): string {
  if (!user?.phoneVerified) return carpoolLoginPath('/shared-carpooling/home');
  if (user.verificationStatus === 'approved') return '/shared-carpooling/account';
  if (hasSubmittedProfileVerification(user) && user.verificationStatus === 'pending') {
    return '/shared-carpooling/profile/pending';
  }
  return '/shared-carpooling/profile/complete';
}

/** Where to send the user immediately after WhatsApp OTP */
export function getPostOtpVerificationPath(
  user: CarpoolSession,
  returnTo = '/shared-carpooling/home',
): string {
  if (user.verificationStatus === 'approved') return returnTo;
  if (hasSubmittedProfileVerification(user) && user.verificationStatus === 'pending') {
    return '/shared-carpooling/profile/pending';
  }
  return `/shared-carpooling/profile/complete?return=${encodeURIComponent(returnTo)}`;
}
