import { useAuth } from '@/providers/AuthProvider';
import { hasPrivilege, getUserModules, EnhancedUser } from '@/types/privileges';

export function usePrivileges() {
  const { user } = useAuth();
  
  const enhancedUser: EnhancedUser | null = user ? {
    ...user,
    role: user.role === 'admin' ? 'admin' : user.role === 'driver' ? 'driver' : user.role === 'super_admin' ? 'super_admin' : 'guest'
  } as EnhancedUser : null;

  const checkPrivilege = (privilegeId: string): boolean => {
    return hasPrivilege(enhancedUser, privilegeId);
  };

  const getAccessibleModules = () => {
    return getUserModules(enhancedUser);
  };

  const canAccess = (moduleId: string): boolean => {
    return checkPrivilege(moduleId);
  };

  const isGuest = (): boolean => {
    return enhancedUser?.role === 'guest' || !enhancedUser;
  };

  const isAdmin = (): boolean => {
    return enhancedUser?.role === 'admin';
  };

  const isSuperAdmin = (): boolean => {
    return enhancedUser?.role === 'super_admin';
  };

  const canManageUsers = (): boolean => {
    return isSuperAdmin();
  };

  const canViewBookings = (): boolean => {
    return checkPrivilege('bookings_view') || isSuperAdmin();
  };

  const canCreateBookings = (): boolean => {
    return checkPrivilege('bookings_create') || isSuperAdmin();
  };

  const canManageFleet = (): boolean => {
    return checkPrivilege('fleet_management') || isSuperAdmin();
  };

  const canViewFinancials = (): boolean => {
    return checkPrivilege('payments_view') || checkPrivilege('commission_view') || isSuperAdmin();
  };

  return {
    user: enhancedUser,
    checkPrivilege,
    getAccessibleModules,
    canAccess,
    isGuest,
    isAdmin,
    isSuperAdmin,
    canManageUsers,
    canViewBookings,
    canCreateBookings,
    canManageFleet,
    canViewFinancials
  };
}