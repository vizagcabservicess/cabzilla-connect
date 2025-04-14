
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner";
import { MoreVertical, Edit, Trash2, ArrowDown, ArrowUp, User as UserIcon, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { userAPI } from '@/services/api';
import { User } from '@/types/api';

interface DataTableProps {
  data: User[]
}

function DataTable({ data }: DataTableProps) {
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<keyof User>("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [users, setUsers] = useState<User[]>(data);
  const [isDeleting, setIsDeleting] = useState<string | number | null>(null);

  useEffect(() => {
    setUsers(data);
  }, [data]);

  const sortedUsers = React.useMemo(() => {
    const collator = new Intl.Collator(undefined, {
      numeric: true,
      sensitivity: "base",
    })

    return [...users].sort((a, b) => {
      const aValue = a[sortBy]
      const bValue = b[sortBy]

      if (aValue === undefined || bValue === undefined) {
        return 0
      }

      // Ensure both values are of the same type for comparison
      const aString = String(aValue);
      const bString = String(bValue);

      return sortOrder === "asc"
        ? collator.compare(aString, bString)
        : collator.compare(bString, aString)
    })
  }, [users, sortBy, sortOrder])

  const filteredUsers = React.useMemo(() => {
    const lowerCaseSearch = search.toLowerCase();
    return sortedUsers.filter(user =>
      user.name.toLowerCase().includes(lowerCaseSearch) ||
      user.email.toLowerCase().includes(lowerCaseSearch) ||
      user.phone.toLowerCase().includes(lowerCaseSearch) ||
      user.role.toLowerCase().includes(lowerCaseSearch)
    );
  }, [sortedUsers, search]);

  const handleSort = (column: keyof User) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortOrder("asc")
    }
  }

  const handleDeleteUser = async (userId: string | number) => {
    if (window.confirm(`Are you sure you want to delete user ${userId}?`)) {
      try {
        setIsDeleting(userId);
        await userAPI.deleteUser(userId);

        setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
        toast.success(`User ${userId} deleted successfully.`);
      } catch (error) {
        console.error("Delete user error:", error);
        toast.error(`Failed to delete user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsDeleting(null);
      }
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>
          Manage users and their roles.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-4 py-2">
          <Input
            type="search"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <div className="relative">
            <Label htmlFor="sort">Sort by</Label>
            <Select onValueChange={(value) => handleSort(value as keyof User)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="role">Role</SelectItem>
              </SelectContent>
            </Select>
            {sortBy && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-7 rounded-full"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              >
                {sortOrder === "asc" ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                <span className="sr-only">Toggle sort order</span>
              </Button>
            )}
          </div>
        </div>
        <ScrollArea>
          <Table>
            <TableCaption>List of all registered users.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.phone}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => alert("Edit")}
                        >
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled={isDeleting === user.id} >
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" className="w-full justify-start">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete
                                  the user from our servers.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(user.id)}
                                  disabled={isDeleting === user.id}
                                >
                                  {isDeleting === user.id ? (
                                    <>
                                      Deleting...
                                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                                    </>
                                  ) : (
                                    "Delete"
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={5}>
                  {filteredUsers.length} users found.
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

interface AddUserFormProps {
  onUserAdded: (newUser: User) => void;
}

function AddUserForm({ onUserAdded }: AddUserFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"admin" | "user" | "driver">("user");
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!name || !email || !phone) {
      toast.error("Please fill in all fields.");
      return;
    }

    setIsCreating(true);
    try {
      const newUser: User = {
        name,
        email,
        phone,
        role,
      };
      const response = await userAPI.createUser(newUser);

      if (response.status === 'success') {
        toast.success("User created successfully!");
        onUserAdded({
          id: response.timestamp || Date.now(),
          name,
          email,
          phone,
          role,
        });
        setName("");
        setEmail("");
        setPhone("");
        setRole("user");
      } else {
        toast.error(`Failed to create user: ${response.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Create user error:", error);
      toast.error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Add User</CardTitle>
        <CardDescription>
          Create a new user account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as "admin" | "user" | "driver")}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="driver">Driver</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={isCreating}>
            {isCreating ? (
              <>
                Creating...
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              </>
            ) : (
              "Create User"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

interface EditUserFormProps {
  user: User;
  onUserUpdated: (updatedUser: User) => void;
  onCancel: () => void;
}

function EditUserForm({ user, onUserUpdated, onCancel }: EditUserFormProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);
  const [role, setRole] = useState<"admin" | "user" | "driver">(user.role);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!name || !email || !phone) {
      toast.error("Please fill in all fields.");
      return;
    }

    setIsUpdating(true);
    try {
      const updatedUser = {
        ...user,
        name,
        email,
        phone,
        role,
      };
      const response = await userAPI.updateUser(user.id, updatedUser);

      if (response.status === 'success') {
        toast.success("User updated successfully!");
        onUserUpdated(updatedUser);
        onCancel();
      } else {
        toast.error(`Failed to update user: ${response.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Update user error:", error);
      toast.error(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Edit User</CardTitle>
        <CardDescription>
          Modify user details.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as "admin" | "user" | "driver")}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="driver">Driver</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? (
                <>
                  Updating...
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                </>
              ) : (
                "Update User"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await userAPI.getUsers();
      setUsers(data);
    } catch (error) {
      console.error("Fetch users error:", error);
      setError(error instanceof Error ? error : new Error('Failed to fetch users'));
      toast.error(`Failed to fetch users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleUserAdded = (newUser: User) => {
    setUsers(prevUsers => [...prevUsers, newUser]);
    setShowAddForm(false);
  };

  const handleUserUpdated = (updatedUser: User) => {
    setUsers(prevUsers =>
      prevUsers.map(user => (user.id === updatedUser.id ? updatedUser : user))
    );
    setEditingUser(null);
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
  };

  const handleAddUser = async (data: { name: string; email: string; phone: string; role: 'admin' | 'user' | 'driver' }) => {
    setIsCreating(true);
    setError(null);
    
    try {
      const userData: User = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: data.role
      };
      
      const response = await userAPI.createUser(userData);
      
      if (response.status === 'success') {
        toast.success('User created successfully!');
        fetchUsers();
        setIsAddDialogOpen(false);
      } else {
        toast.error(`Failed to add user: ${response.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding user:', error);
      setError(error as Error);
      toast.error('Failed to add user');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRoleChange = async (userId: string | number, newRole: 'admin' | 'user' | 'driver') => {
    try {
      const response = await userAPI.updateUserRole(userId, newRole);
      
      if (response.status === 'success') {
        toast.success(`User role updated to ${newRole}`);
        fetchUsers();
      } else {
        toast.error(`Failed to update role: ${response.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
          <p className="text-gray-500">Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="rounded-md border bg-muted p-4">
          <div className="flex items-center space-x-2">
            <UserIcon className="h-4 w-4" />
            <h4 className="text-sm font-semibold leading-none">
              Error
            </h4>
          </div>
          <p className="text-sm text-muted-foreground">
            {error.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">User Management</h1>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? "Hide Form" : "Add User"}
        </Button>
      </div>

      {showAddForm && (
        <AddUserForm onUserAdded={handleUserAdded} />
      )}

      {editingUser ? (
        <EditUserForm
          user={editingUser}
          onUserUpdated={handleUserUpdated}
          onCancel={handleCancelEdit}
        />
      ) : (
        <DataTable data={users} />
      )}
    </div>
  );
}

export default UserManagement;
