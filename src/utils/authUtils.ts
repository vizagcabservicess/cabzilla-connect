import { User } from '@/services/api/authAPI';

/**
 * Get the appropriate dashboard URL based on user role
 * @param user - The authenticated user object
 * @returns The dashboard URL for the user's role
 */
export function getDashboardUrl(user: User | null): string {
  if (!user) {
    return '/login';
  }

  switch (user.role) {
    case 'admin':
    case 'super_admin':
      return '/admin';
    case 'driver':
      return '/driver';
    case 'provider':
      return '/pooling/provider';
    case 'guest':
      return '/dashboard'; // Changed from '/pooling/guest' to '/dashboard'
    default:
      return '/dashboard';
  }
}

/**
 * Navigate to the appropriate dashboard based on user role
 * @param user - The authenticated user object
 * @param navigate - React Router's navigate function
 */
export function navigateToDashboard(user: User | null, navigate: (path: string) => void): void {
  const dashboardUrl = getDashboardUrl(user);
  navigate(dashboardUrl);
}
