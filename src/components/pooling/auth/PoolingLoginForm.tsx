
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePoolingAuth } from '@/providers/PoolingAuthProvider';
import { User, Car, Shield } from 'lucide-react';
import { PoolingUserRole } from '@/types/poolingAuth';

export const PoolingLoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<PoolingUserRole>('guest');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = usePoolingAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(email, password, selectedRole);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const roleConfig = {
    guest: {
      icon: User,
      title: 'Guest Login',
      description: 'Search and book rides'
    },
    provider: {
      icon: Car,
      title: 'Provider Login',
      description: 'Offer rides and manage bookings'
    },
    admin: {
      icon: Shield,
      title: 'Admin Login',
      description: 'System administration'
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Pooling Login</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedRole} onValueChange={(value) => setSelectedRole(value as PoolingUserRole)}>
          <TabsList className="grid w-full grid-cols-3">
            {Object.entries(roleConfig).map(([role, config]) => {
              const Icon = config.icon;
              return (
                <TabsTrigger key={role} value={role} className="flex flex-col gap-1 py-2">
                  <Icon className="h-4 w-4" />
                  <span className="text-xs">{role}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {Object.entries(roleConfig).map(([role, config]) => (
            <TabsContent key={role} value={role} className="mt-4">
              <div className="text-center mb-4">
                <h3 className="font-semibold">{config.title}</h3>
                <p className="text-sm text-gray-600">{config.description}</p>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
