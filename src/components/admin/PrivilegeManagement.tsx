import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Settings, Shield, User, Users } from 'lucide-react';
import { AVAILABLE_MODULES, ModulePrivilege, EnhancedUser, UserRole } from '@/types/privileges';
import { userAPI } from '@/services/api/userAPI';

interface PrivilegeManagementProps {
  currentUser: EnhancedUser;
}

export function PrivilegeManagement({ currentUser }: PrivilegeManagementProps) {
  const [users, setUsers] = useState<EnhancedUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<EnhancedUser | null>(null);
  const [selectedPrivileges, setSelectedPrivileges] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await userAPI.getAllUsers();
      const users = response.data; // Unwrap the data property
      if (Array.isArray(users)) {
        // Filter to show only admin and super_admin users for privilege management
        const adminUsers = users.filter(
          user => user.role === 'admin' || user.role === 'super_admin'
        );
        setUsers(adminUsers);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    }
  };

  const handleUserSelect = (userId: string) => {
    const user = users.find(u => u.id.toString() === userId);
    if (user) {
      setSelectedUser(user);
      setSelectedPrivileges(user.privileges?.modulePrivileges || []);
    }
  };

  const handlePrivilegeToggle = (privilegeId: string, checked: boolean) => {
    if (checked) {
      setSelectedPrivileges(prev => [...prev, privilegeId]);
    } else {
      setSelectedPrivileges(prev => prev.filter(id => id !== privilegeId));
    }
  };

  const savePrivileges = async () => {
    if (!selectedUser) return;

    try {
      setIsLoading(true);
      // TODO: Implement API call to save user privileges
      await userAPI.updateUserRole(selectedUser.id, selectedUser.role);
      toast.success('Privileges updated successfully');
    } catch (error) {
      console.error('Error updating privileges:', error);
      toast.error('Failed to update privileges');
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryModules = (category: string) => {
    return AVAILABLE_MODULES.filter(module => module.category === category);
  };

  const categories = ['booking', 'fleet', 'financial', 'system'];

  // Only super admin can access this component
  if (currentUser.role !== 'super_admin') {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <div className="text-center">
            <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Access denied. Super Admin privileges required.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            User Privilege Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Admin User</label>
              <Select onValueChange={handleUserSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an admin user to manage privileges" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{user.name}</span>
                        <Badge variant="secondary">{user.role}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedUser && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Module Privileges for {selectedUser.name}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {categories.map(category => (
                    <div key={category} className="space-y-3">
                      <h4 className="font-medium text-sm uppercase tracking-wide text-gray-700 border-b pb-1">
                        {category.replace('_', ' ')}
                      </h4>
                      <div className="space-y-2">
                        {getCategoryModules(category).map(module => (
                          <div key={module.id} className="flex items-start space-x-3">
                            <Checkbox
                              id={module.id}
                              checked={selectedPrivileges.includes(module.id)}
                              onCheckedChange={(checked) => handlePrivilegeToggle(module.id, checked as boolean)}
                            />
                            <div className="space-y-1">
                              <label
                                htmlFor={module.id}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {module.name}
                              </label>
                              <p className="text-xs text-gray-600">{module.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end mt-6 pt-4 border-t">
                  <Button
                    onClick={savePrivileges}
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isLoading ? 'Saving...' : 'Save Privileges'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}