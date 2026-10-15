import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Eye, RefreshCw, Save, User, UserPlus, UserX } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { userAPI } from '@/services/api/userAPI';
import { User as UserType } from '@/types/api';
import { reloadUsers } from '@/lib/userData';

type AppAccess = 'full' | 'event_manager' | 'event_driver';
type AccountChoice = 'guest' | 'admin' | 'super_admin' | 'driver' | 'event_manager' | 'event_driver';
type StoredRole = 'guest' | 'admin' | 'super_admin' | 'driver';

function storedRole(choice: AccountChoice): StoredRole {
  if (choice === 'event_manager') return 'admin';
  if (choice === 'event_driver') return 'driver';
  return choice;
}

function shownRole(role: string, access?: AppAccess): string {
  if (access === 'event_manager' || access === 'event_driver') return access;
  return role;
}

function RoleChoices() {
  return (
    <>
      <SelectItem value="guest">Guest</SelectItem>
      <SelectItem value="admin">Admin</SelectItem>
      <SelectItem value="super_admin">Super Admin</SelectItem>
      <SelectItem value="driver">Driver</SelectItem>
      <SelectItem value="event_manager">Event manager</SelectItem>
      <SelectItem value="event_driver">Event driver</SelectItem>
    </>
  );
}

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  phone: z.string().optional(),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  role: z.enum(['guest', 'admin', 'super_admin', 'driver', 'event_manager', 'event_driver']).default('guest'),
});

export function UserManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [username, setUsername] = useState<string>('');
  const [appAccess, setAppAccess] = useState<Record<string, AppAccess>>({});
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      role: 'guest',
    },
  });
  
  useEffect(() => {
    fetchUsers();
  }, []);

  const rememberAccess = (rows: Array<UserType & { appAccess?: string }>) => {
    const next: Record<string, AppAccess> = {};
    for (const row of rows) {
      if (row.appAccess === 'event_manager' || row.appAccess === 'event_driver' || row.appAccess === 'full') {
        next[String(row.id)] = row.appAccess;
      }
    }
    setAppAccess(next);
  };
  
  const fetchUsers = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      
      const data = await userAPI.getAllUsers();
      
      const rows = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : null);
      if (rows) {
        setUsers(rows);
        rememberAccess(rows);
      } else {
        console.warn("Invalid user data format:", data);
        setError("Failed to load users. Invalid data format.");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setError("Failed to load users. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      
      localStorage.removeItem('users');
      sessionStorage.removeItem('users');
      
      await reloadUsers();
      
      const access = values.role === 'event_manager' || values.role === 'event_driver' ? values.role : 'full';
      await userAPI.createUser({ ...values, role: storedRole(values.role), access });

      toast.success(values.role === 'event_manager' || values.role === 'event_driver'
        ? 'User created. This login sees only the event screens after signing in.'
        : 'User created successfully');
      fetchUsers();
      form.reset();
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error("Failed to create user. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleUserDelete = async (userId: string | number) => {
    try {
      // Convert userId to a number if possible, otherwise leave it as string
      const numericId = typeof userId === 'string' && !isNaN(Number(userId)) ? 
        Number(userId) : userId;
      
      // Handle confirmation dialog
      if (!window.confirm(`Are you sure you want to delete user ${username}?`)) {
        return;
      }
      
      setIsLoading(true);
      
      // Call the API with numericId
      await userAPI.deleteUser(numericId);
      
      toast.success("User deleted successfully");
      setUsers(prev => prev.filter(u => u.id !== userId));
      
      // Refresh user list after deletion
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error("Failed to delete user. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserRoleUpdate = async (userId: string | number, choice: AccountChoice) => {
    try {
      const numericId = typeof userId === 'string' && !isNaN(Number(userId)) ?
        Number(userId) : userId;
      const role = storedRole(choice);

      setIsLoading(true);

      const access: AppAccess = choice === 'event_manager' || choice === 'event_driver' ? choice : 'full';
      const updated = await userAPI.updateUserRole(numericId, role, access);
      if ((choice === 'event_manager' || choice === 'event_driver') && updated?.accessSaved !== true) {
        toast.error('Upload api/admin/users.php, then set this role again. The event limit was not saved.');
        return;
      }

      const label = choice.replace(/_/g, ' ');
      toast.success(`User role updated to ${label}`);
      setAppAccess((prev) => ({ ...prev, [String(userId)]: access }));

      setUsers(prev => prev.map(user =>
        user.id === userId ? { ...user, role } : user
      ));
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error("Failed to update user role. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto py-10">
      {/* Add User Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" /> Add New User
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchUsers} 
              disabled={isRefreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} onChange={(e) => {
                        field.onChange(e);
                        setUsername(e.target.value);
                      }} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="johndoe@example.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="123-456-7890" type="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input placeholder="At least 6 characters" type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                        <SelectContent>
                          <RoleChoices />
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Create User
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {/* Users Table Card */}
      <Card className="mt-8">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" /> Existing Users
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2"
              title="View your own customer dashboard"
            >
              <Eye className="h-4 w-4" />
              View Customer Dashboard
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isRefreshing ? (
            <div className="flex justify-center p-10">
              <RefreshCw className="h-10 w-10 animate-spin text-gray-400" />
            </div>
          ) : users.length > 0 ? (
            <Table>
              <TableCaption>A list of all registered users.</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Auth</TableHead>
                  <TableHead className="text-center w-24">Bookings</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone || '-'}</TableCell>
                    <TableCell>
                      <Select
                        value={shownRole(user.role, appAccess[String(user.id)])}
                        onValueChange={(newRole) => {
                          void handleUserRoleUpdate(user.id, newRole as AccountChoice);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={user.role} />
                        </SelectTrigger>
                        <SelectContent>
                          <RoleChoices />
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-gray-500 capitalize">
                        {user.authProvider === 'google' ? 'Google' : 'Email'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-medium">{user.bookingsCount ?? 0}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/dashboard?viewAs=${user.id}`, { state: { viewAsName: user.name } })}
                          title={`View ${user.name}'s dashboard`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setUsername(user.name);
                            handleUserDelete(user.id);
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-10 text-gray-500">
              No users found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
