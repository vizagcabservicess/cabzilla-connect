
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { poolingAuthAPI } from '@/services/api/poolingAuthAPI';
import { User, Car } from 'lucide-react';
import { PoolingUserRole } from '@/types/poolingAuth';
import { toast } from 'sonner';

export const PoolingRegisterForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    confirmPassword: ''
  });
  const [selectedRole, setSelectedRole] = useState<PoolingUserRole>('guest');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const response = await poolingAuthAPI.register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        role: selectedRole
      });

      if (response.success) {
        toast.success('Registration successful! Please login to continue.');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Create Account</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedRole} onValueChange={(value) => setSelectedRole(value as PoolingUserRole)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="guest" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Guest
            </TabsTrigger>
            <TabsTrigger value="provider" className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              Provider
            </TabsTrigger>
          </TabsList>

          <TabsContent value="guest" className="mt-4">
            <div className="text-center mb-4">
              <h3 className="font-semibold">Guest Account</h3>
              <p className="text-sm text-gray-600">Search and book rides</p>
            </div>
          </TabsContent>

          <TabsContent value="provider" className="mt-4">
            <div className="text-center mb-4">
              <h3 className="font-semibold">Provider Account</h3>
              <p className="text-sm text-gray-600">Offer rides and earn money</p>
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Full Name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            required
          />
          <Input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            required
          />
          <Input
            placeholder="Phone Number"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
            required
          />
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
