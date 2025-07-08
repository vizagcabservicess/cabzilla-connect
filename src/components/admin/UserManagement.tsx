import React, { useState, useEffect } from 'react';
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
import { AlertCircle, RefreshCw, Save, User, UserPlus, UserX } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { userAPI } from '@/services/api/userAPI';
import { User as UserType } from '@/types/api';
import { reloadUsers } from '@/lib/userData';

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  phone: z.string().optional(),
  role: z.enum(['guest', 'admin', 'super_admin', 'driver']).default('guest'),
});

export function UserManagement() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [username, setUsername] = useState<string>('');
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role: 'guest',
    },
  });
  
  useEffect(() => {
    fetchUsers();
  }, []);
  
  const fetchUsers = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      
      const data = await userAPI.getAllUsers();
      
      if (Array.isArray(data)) {
        setUsers(data);
      } else if (data && Array.isArray(data.data)) {
        setUsers(data.data);
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
      
      const data = await userAPI.createUser(values);
      
      toast.success("User created successfully");
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

  const handleUserRoleUpdate = async (userId: string | number, role: "guest" | "admin" | "super_admin" | "driver") => {
    try {
      // Convert userId to a number if possible
      const numericId = typeof userId === 'string' && !isNaN(Number(userId)) ? 
        Number(userId) : userId;
      
      setIsLoading(true);
      
      // Call the API with numericId
      await userAPI.updateUserRole(numericId, role);
      
      toast.success(`User role updated to ${role}`);
      
      // Update the local user list
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
                          <SelectItem value="guest">Guest</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                          <SelectItem value="driver">Driver</SelectItem>
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
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" /> Existing Users
          </CardTitle>
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
                        value={user.role}
                        onValueChange={(newRole) => {
                          // Cast the role value to ensure it's one of the allowed types
                          const typedRole = newRole as "guest" | "admin" | "super_admin" | "driver";
                          handleUserRoleUpdate(user.id, typedRole);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={user.role} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="guest">Guest</SelectItem>
<SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                          <SelectItem value="driver">Driver</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
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
