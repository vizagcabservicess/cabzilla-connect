/**
 * Auth logic - validation, error mapping, shared utilities
 * Used by LoginForm, SignupForm, AuthProvider
 */
import type { AxiosError } from 'axios';

export const AUTH_API_BASE = '/api/auth';

/** Validation */
export const authValidation = {
  email: (v: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!v?.trim()) return 'Email is required';
    if (!re.test(v.trim())) return 'Invalid email address';
    return null;
  },
  password: (v: string, min = 6) => {
    if (!v) return 'Password is required';
    if (v.length < min) return `Password must be at least ${min} characters`;
    return null;
  },
  name: (v: string, min = 2) => {
    if (!v?.trim()) return 'Name is required';
    if (v.trim().length < min) return `Name must be at least ${min} characters`;
    return null;
  },
  phone: (v: string, min = 10) => {
    if (!v?.trim()) return 'Phone is required';
    const digits = v.replace(/\D/g, '');
    if (digits.length < min) return `Phone must be at least ${min} digits`;
    return null;
  },
} as const;

/** Parse API error into user-friendly message */
export function getAuthErrorMessage(error: unknown): string {
  if (!error) return 'Something went wrong';
  if (typeof error === 'string') return error;
  if (error instanceof Error) {
    if (error.message) return error.message;
  }
  const axiosErr = error as AxiosError<{ error?: string; message?: string; details?: string }>;
  const data = axiosErr?.response?.data;
  if (data?.error) return data.error;
  if (data?.message) return data.message;
  if (data?.details) return data.details;
  const status = axiosErr?.response?.status;
  if (status === 401) return 'Invalid email or password';
  if (status === 403) return 'Account is inactive or email not verified';
  if (status === 429) return 'Too many attempts. Please try again later.';
  if (status === 409) return 'User already exists with this email or phone';
  if (status && status >= 500) return 'Server error. Please try again later.';
  return 'Something went wrong. Please try again.';
}

/** Check if error indicates email verification is required */
export function isEmailVerificationError(error: unknown): boolean {
  const axiosErr = error as AxiosError<{ email_verification_required?: boolean }>;
  return !!axiosErr?.response?.data?.email_verification_required;
}
