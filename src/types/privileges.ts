export type UserRole = 'guest' | 'admin' | 'super_admin';

export interface ModulePrivilege {
  id: string;
  name: string;
  description: string;
  category: 'booking' | 'fleet' | 'financial' | 'system';
}

export const AVAILABLE_MODULES: ModulePrivilege[] = [
  // Booking Management
  { id: 'bookings_view', name: 'View Bookings', description: 'View all bookings', category: 'booking' },
  { id: 'bookings_create', name: 'Create Bookings', description: 'Create new bookings', category: 'booking' },
  { id: 'bookings_edit', name: 'Edit Bookings', description: 'Edit existing bookings', category: 'booking' },
  { id: 'bookings_delete', name: 'Delete Bookings', description: 'Delete bookings', category: 'booking' },
  
  // Fleet Management
  { id: 'vehicles_view', name: 'View Vehicles', description: 'View vehicle fleet', category: 'fleet' },
  { id: 'vehicles_manage', name: 'Manage Vehicles', description: 'Add, edit, delete vehicles', category: 'fleet' },
  { id: 'drivers_view', name: 'View Drivers', description: 'View driver information', category: 'fleet' },
  { id: 'drivers_manage', name: 'Manage Drivers', description: 'Add, edit, delete drivers', category: 'fleet' },
  { id: 'fleet_management', name: 'Fleet Management', description: 'Access fleet management module', category: 'fleet' },
  
  // Financial
  { id: 'fares_view', name: 'View Fares', description: 'View pricing and fares', category: 'financial' },
  { id: 'fares_manage', name: 'Manage Fares', description: 'Update pricing and fares', category: 'financial' },
  { id: 'payments_view', name: 'View Payments', description: 'View payment records', category: 'financial' },
  { id: 'payments_manage', name: 'Manage Payments', description: 'Process payments and refunds', category: 'financial' },
  { id: 'commission_view', name: 'View Commission', description: 'View commission data', category: 'financial' },
  { id: 'commission_manage', name: 'Manage Commission', description: 'Set commission rates', category: 'financial' },
  { id: 'expenses_view', name: 'View Expenses', description: 'View expense records', category: 'financial' },
  { id: 'expenses_manage', name: 'Manage Expenses', description: 'Add, edit expense records', category: 'financial' },
  { id: 'payroll_view', name: 'View Payroll', description: 'View payroll information', category: 'financial' },
  { id: 'payroll_manage', name: 'Manage Payroll', description: 'Process payroll', category: 'financial' },
  { id: 'ledger_view', name: 'View Ledger', description: 'View financial ledger', category: 'financial' },
  
  // System Management
  { id: 'maintenance_view', name: 'View Maintenance', description: 'View maintenance records', category: 'system' },
  { id: 'maintenance_manage', name: 'Manage Maintenance', description: 'Manage vehicle maintenance', category: 'system' },
  { id: 'fuel_view', name: 'View Fuel Records', description: 'View fuel consumption', category: 'system' },
  { id: 'fuel_manage', name: 'Manage Fuel Records', description: 'Manage fuel records', category: 'system' },
  { id: 'reports_view', name: 'View Reports', description: 'View system reports', category: 'system' },
  { id: 'users_manage', name: 'Manage Users', description: 'Add, edit, delete users (Super Admin only)', category: 'system' },
];

export interface UserPrivileges {
  userId: number;
  role: UserRole;
  modulePrivileges: string[]; // Array of module IDs the user has access to
  customPermissions?: {
    canAssignDrivers?: boolean;
    canViewAllBookings?: boolean;
    canProcessPayments?: boolean;
  };
}

export interface EnhancedUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  is_active: boolean;
  imageUrl?: string;
  privileges?: UserPrivileges;
  createdAt?: string;
  lastLogin?: string;
}

// Helper function to check if user has specific privilege
export const hasPrivilege = (user: EnhancedUser | null, privilegeId: string): boolean => {
  if (!user) return false;
  
  // Super admin has all privileges
  if (user.role === 'super_admin') return true;
  
  // Guest users have no admin privileges
  if (user.role === 'guest') return false;
  
  // Check if admin has specific privilege
  return user.privileges?.modulePrivileges?.includes(privilegeId) || false;
};

// Helper function to get user's accessible modules
export const getUserModules = (user: EnhancedUser | null): ModulePrivilege[] => {
  if (!user) return [];
  
  // Super admin gets all modules
  if (user.role === 'super_admin') return AVAILABLE_MODULES;
  
  // Guest gets no admin modules
  if (user.role === 'guest') return [];
  
  // Filter modules based on user's privileges
  const userPrivilegeIds = user.privileges?.modulePrivileges || [];
  return AVAILABLE_MODULES.filter(module => userPrivilegeIds.includes(module.id));
};