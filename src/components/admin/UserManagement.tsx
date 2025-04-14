import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowDownUp, 
  AlertCircle,
  Database,
  RefreshCw, 
  Search, 
  Shield, 
  ShieldAlert, 
  UserCheck, 
  Users 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ApiErrorFallback } from '@/components/ApiErrorFallback';
import { authAPI } from '@/services/api/authAPI';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { User } from '@/types/api';
import { format } from 'date-fns';
import { getApiUrl, forceRefreshHeaders } from '@/config/api';
import axios from 'axios';

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [sortField, setSortField] = useState<'name' | 'email' | 'createdAt'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const { toast: uiToast } = useToast();
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [dataSource, setDataSource] = useState<'database' | 'sample' | 'cache'>('sample');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);

  const sampleUsers: User[] = [
    {
      id: 101,
      name: 'Admin User',
      email: 'admin@example.com',
      phone: '9876543210',
      role: 'admin',
      createdAt: new Date().toISOString()
    },
    {
      id: 102,
      name: 'Test User',
      email: 'user@example.com',
      phone: '8765432109',
      role: 'user',
      createdAt: new Date().toISOString()
    }
  ];

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const userData = await authAPI.getCurrentUser();
        if (userData) {
          setCurrentUserId(userData.id);
        }
      } catch (error) {
        console.error('Error getting current user:', error);
      }
    };

    getCurrentUser();
    fetchUsers();
  }, []);

  const fetchUsers = async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!forceRefresh) {
        try {
          const cachedUsers = localStorage.getItem('cachedUsers');
          if (cachedUsers) {
            const parsedUsers = JSON.parse(cachedUsers);
            console.log('Using cached users from localStorage:', parsedUsers);
            setUsers(parsedUsers);
            setDataSource('cache');
            setIsLoading(false);

            setTimeout(() => {
              fetchFreshUsers();
            }, 500);

            return;
          }
        } catch (cacheError) {
          console.error('Error using cached users:', cacheError);
        }
      }

      fetchFreshUsers();
    } catch (error) {
      console.error('Error fetching users:', error);
      handleFetchError(error);
    }
  };

  const fetchFreshUsers = async () => {
    try {
      console.log('Fetching fresh users via authAPI.getAllUsers...');
      const userData = await authAPI.getAllUsers();

      if (userData && userData.length > 0) {
        console.log('Users fetched successfully via authAPI:', userData);
        setUsers(userData);
        setDataSource(userData === sampleUsers ? 'sample' : 'database');

        localStorage.setItem('cachedUsers', JSON.stringify(userData));

        setIsLoading(false);
        return;
      }
    } catch (error) {
      console.error('Error fetching fresh users:', error);
      handleFetchError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchError = (error: any) => {
    const errorMessage = error instanceof Error ? error.message : 'Failed to load users';
    setError(errorMessage);

    uiToast({
      title: "Error",
      description: errorMessage,
      variant: "destructive",
    });

    try {
      const cachedUsers = localStorage.getItem('cachedUsers');
      if (cachedUsers) {
        const parsedUsers = JSON.parse(cachedUsers);
        setUsers(parsedUsers);
        setDataSource('cache');
        toast.info('Using cached user data due to connection error');
        return;
      }
    } catch (cacheError) {
      console.error('Error using cached users:', cacheError);
    }

    const sampleUsers: User[] = [
      {
        id: 101,
        name: 'Admin User',
        email: 'admin@example.com',
        phone: '9876543210',
        role: 'admin',
        createdAt: new Date().toISOString()
      },
      {
        id: 102,
        name: 'Test User',
        email: 'user@example.com',
        phone: '8765432109',
        role: 'user',
        createdAt: new Date().toISOString()
      }
    ];

    setUsers(sampleUsers);
    setDataSource('sample');
    toast.warning('Using sample data due to connection error');
  };

  const handlePromoteToAdmin = async (userId: number) => {
    if (userId === currentUserId) {
      toast.error("You cannot modify your own admin status");
      return;
    }

    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const isCurrentlyAdmin = user.role === 'admin';
      const newRole = isCurrentlyAdmin ? 'user' : 'admin' as 'admin' | 'user';
      const actionText = isCurrentlyAdmin ? 'Remove admin' : 'Make admin';

      if (!confirm(`Are you sure you want to ${actionText.toLowerCase()} for ${user.name}?`)) {
        return;
      }

      setUsers(users.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));

      try {
        await authAPI.updateUserRole(userId, newRole);

        toast.success(`User ${isCurrentlyAdmin ? 'removed from' : 'promoted to'} admin successfully`);

        localStorage.setItem('cachedUsers', JSON.stringify(users.map(u => 
          u.id === userId ? { ...u, role: newRole } : u
        )));
      } catch (updateError) {
        console.error('Error updating user role on server:', updateError);

        toast.warning(`Role updated in UI only. Server update failed: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`);

        localStorage.setItem('cachedUsers', JSON.stringify(users.map(u => 
          u.id === userId ? { ...u, role: newRole } : u
        )));
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update user role');
    }
  };

  const handleEdit = (userId: string | number) => {
    const userToEdit = users.find(user => user.id === userId || user.id.toString() === userId.toString());
    if (userToEdit) {
      setCurrentUser(userToEdit);
      setShowEditForm(true);
    }
  };

  const handleDeleteUser = async (userId: string | number) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }

    try {
      const userIdStr = userId.toString();
      if (currentUser && currentUser.id.toString() === userIdStr) {
        setShowEditForm(false);
      }

      try {
        await authAPI.deleteUser(userId);
        toast.success('User deleted successfully');

        const updatedUsers = users.filter(user => user.id !== userId);
        setUsers(updatedUsers);

        localStorage.setItem('cachedUsers', JSON.stringify(updatedUsers));
      } catch (deleteError) {
        console.error('Error deleting user:', deleteError);
        toast.error('Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete user');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phone && user.phone.includes(searchTerm));

    const matchesRole = roleFilter === 'all' || 
      (roleFilter === 'admin' && user.role === 'admin') ||
      (roleFilter === 'user' && user.role === 'user');

    return matchesSearch && matchesRole;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'email':
        comparison = a.email.localeCompare(b.email);
        break;
      case 'createdAt':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const toggleSort = (field: 'name' | 'email' | 'createdAt') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getDataSourceBadge = () => {
    switch(dataSource) {
      case 'database':
        return <span className="bg-green-100 text-green-800 px-2 py-1 text-xs rounded-full flex items-center gap-1">
          <Database className="h-3 w-3" /> Live Data
        </span>;
      case 'cache':
        return <span className="bg-blue-100 text-blue-800 px-2 py-1 text-xs rounded-full flex items-center gap-1">
          <UserCheck className="h-3 w-3" /> Cached Data
        </span>;
      case 'sample':
        return <span className="bg-amber-100 text-amber-800 px-2 py-1 text-xs rounded-full flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> Sample Data
        </span>;
    }
  };

  if (error && !users.length) {
    return (
      <ApiErrorFallback 
        error={error} 
        onRetry={() => fetchUsers(true)} 
        title="User Management Error" 
        description="Unable to load user data. This may be due to a network issue or server problem."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> User Management
          </CardTitle>
          <div className="flex items-center gap-2">
            {getDataSourceBadge()}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fetchUsers(true)} 
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-4">
            <AlertDescription>
              {error} - Showing {dataSource === 'database' ? 'live' : dataSource === 'cache' ? 'cached' : 'sample'} data.
            </AlertDescription>
          </Alert>
        )}
        
        <Tabs defaultValue="list">
          <TabsList className="mb-4">
            <TabsTrigger value="list" className="flex items-center gap-1">
              <Users className="h-4 w-4" /> User List
            </TabsTrigger>
            <TabsTrigger value="admins" className="flex items-center gap-1">
              <ShieldAlert className="h-4 w-4" /> Admins
            </TabsTrigger>
          </TabsList>
          
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as 'all' | 'admin' | 'user')}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
                <SelectItem value="user">Users</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <TabsContent value="list">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : sortedUsers.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50" 
                        onClick={() => toggleSort('name')}
                      >
                        <div className="flex items-center gap-1">
                          Name
                          {sortField === 'name' && (
                            <ArrowDownUp className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50" 
                        onClick={() => toggleSort('email')}
                      >
                        <div className="flex items-center gap-1">
                          Email
                          {sortField === 'email' && (
                            <ArrowDownUp className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50" 
                        onClick={() => toggleSort('createdAt')}
                      >
                        <div className="flex items-center gap-1">
                          Created
                          {sortField === 'createdAt' && (
                            <ArrowDownUp className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.phone || '-'}</TableCell>
                        <TableCell>
                          {user.role === 'admin' ? (
                            <div className="flex items-center gap-1 text-purple-600">
                              <Shield className="h-4 w-4" />
                              Admin
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-gray-600">
                              <UserCheck className="h-4 w-4" />
                              User
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant={user.role === 'admin' ? "destructive" : "default"}
                            size="sm"
                            onClick={() => handlePromoteToAdmin(user.id)}
                            disabled={user.id === currentUserId}
                            title={user.id === currentUserId ? "You cannot modify your own admin status" : ""}
                          >
                            {user.role === 'admin' ? (
                              <>
                                <Shield className="h-4 w-4 mr-1" />
                                Remove Admin
                              </>
                            ) : (
                              <>
                                <ShieldAlert className="h-4 w-4 mr-1" />
                                Make Admin
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="py-2 px-4 text-sm text-gray-500 border-t">
                  Showing {sortedUsers.length} of {users.length} users
                </div>
              </div>
            ) : (
              <Alert>
                <AlertDescription>
                  {searchTerm || roleFilter !== 'all' 
                    ? "No users matching your filters" 
                    : "No users found in the system"}
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
          
          <TabsContent value="admins">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-4">
                <Alert>
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5" />
                    <AlertDescription>
                      <strong>Admin users</strong> have full access to all dashboard features including user management, fare control, and booking operations.
                    </AlertDescription>
                  </div>
                </Alert>
                
                {sortedUsers.filter(user => user.role === 'admin').length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedUsers
                          .filter(user => user.role === 'admin')
                          .map((admin) => (
                            <TableRow key={admin.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <Shield className="h-4 w-4 text-purple-600" />
                                  {admin.name}
                                  {admin.id === currentUserId && (
                                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                                      You
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{admin.email}</TableCell>
                              <TableCell>{admin.phone || '-'}</TableCell>
                              <TableCell>
                                {admin.createdAt ? format(new Date(admin.createdAt), 'MMM d, yyyy') : 'N/A'}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handlePromoteToAdmin(admin.id)}
                                  disabled={admin.id === currentUserId}
                                  title={admin.id === currentUserId ? "You cannot remove your own admin status" : ""}
                                >
                                  <Shield className="h-4 w-4 mr-1" />
                                  Remove Admin
                                </Button>
                              </TableCell>
                            </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No admin users found
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
