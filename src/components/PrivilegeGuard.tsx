import React from 'react';
import { usePrivileges } from '@/hooks/usePrivileges';
import { Shield, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface PrivilegeGuardProps {
  children: React.ReactNode;
  privilege?: string;
  role?: 'guest' | 'admin' | 'super_admin';
  fallback?: React.ReactNode;
  showMessage?: boolean;
}

export function PrivilegeGuard({ 
  children, 
  privilege, 
  role, 
  fallback, 
  showMessage = true 
}: PrivilegeGuardProps) {
  const { user, checkPrivilege, isSuperAdmin, isAdmin, isGuest } = usePrivileges();

  // Check role-based access
  let hasAccess = false;

  if (role === 'super_admin') {
    hasAccess = isSuperAdmin();
  } else if (role === 'admin') {
    hasAccess = isAdmin() || isSuperAdmin();
  } else if (role === 'guest') {
    hasAccess = true; // Guests can access guest content
  }

  // Check privilege-based access
  if (privilege) {
    hasAccess = checkPrivilege(privilege);
  }

  // Super admin bypasses all restrictions
  if (isSuperAdmin()) {
    hasAccess = true;
  }

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (!showMessage) {
      return null;
    }

    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Lock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
            <p className="text-gray-600 max-w-sm">
              You don't have the required privileges to access this section. 
              Please contact your administrator if you need access.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: ('guest' | 'admin' | 'super_admin')[];
  fallback?: React.ReactNode;
}

export function RoleGuard({ children, allowedRoles, fallback }: RoleGuardProps) {
  const { user } = usePrivileges();
  
  if (!user || !allowedRoles.includes(user.role)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Unauthorized Access</h3>
            <p className="text-gray-600">
              You don't have the required role to access this section.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}