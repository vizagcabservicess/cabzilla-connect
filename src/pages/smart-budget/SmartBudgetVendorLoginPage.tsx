import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSmartBudgetVendorAuth } from '@/providers/SmartBudgetVendorAuthProvider';

export default function SmartBudgetVendorLoginPage() {
  const { login, isAuthenticated, isLoading } = useSmartBudgetVendorAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/smart-budget/vendor" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login({ phone: phone.trim(), password });
      toast.success('Welcome back');
      navigate('/smart-budget/vendor', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 rounded-2xl border bg-white p-6 shadow-sm"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-800">
            Vizag Taxi Hub
          </p>
          <h1 className="text-xl font-bold">Vendor portal</h1>
          <p className="text-sm text-muted-foreground">Sign in to claim Smart Budget leads</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            autoComplete="tel"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        <Button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800" disabled={submitting}>
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Sign in
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          New vendor?{' '}
          <Link className="text-emerald-800 underline" to="/smart-budget/vendor/signup">
            Sign up
          </Link>
        </p>
        <p className="text-center text-xs text-muted-foreground">
          Looking for vendor login?{' '}
          <Link className="text-emerald-800 underline" to="/smart-budget/vendor/login">
            Vendor portal
          </Link>
          {' · '}
          <Link className="text-emerald-800 underline" to="/smart-budget/customer/login">
            Customer portal
          </Link>
        </p>
      </form>
    </div>
  );
}
