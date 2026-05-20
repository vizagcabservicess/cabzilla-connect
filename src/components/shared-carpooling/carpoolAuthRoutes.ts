/** Shared carpooling auth URLs — OTP is signup-only; returning users use email login. */

export function carpoolLoginPath(returnTo = '/shared-carpooling/home'): string {
  return `/shared-carpooling/auth/login?return=${encodeURIComponent(returnTo)}`;
}

export function carpoolSignupPath(returnTo = '/shared-carpooling/home'): string {
  return `/shared-carpooling/auth/signup?return=${encodeURIComponent(returnTo)}`;
}

export function carpoolOtpSignupPath(returnTo: string, phone: string, name: string): string {
  const params = new URLSearchParams({ return: returnTo, phone, name, mode: 'signup' });
  return `/shared-carpooling/auth/otp?${params.toString()}`;
}
