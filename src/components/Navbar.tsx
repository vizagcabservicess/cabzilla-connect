
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { usePoolingAuth } from '@/providers/PoolingAuthProvider';
import { LogOut, User, Car } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = usePoolingAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/pooling/auth');
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/pooling" className="flex items-center gap-2 font-bold text-xl">
            <Car className="h-6 w-6 text-blue-600" />
            Pooling
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/pooling" className="text-gray-600 hover:text-gray-900">
              Find Rides
            </Link>
            {isAuthenticated && user?.role === 'provider' && (
              <Link to="/pooling/create" className="text-gray-600 hover:text-gray-900">
                Create Ride
              </Link>
            )}
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden md:inline text-sm">
                    {user?.name} ({user?.role})
                  </span>
                </div>
                {user?.role === 'guest' && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/pooling/guest/dashboard">Dashboard</Link>
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                  <span className="hidden md:inline ml-1">Logout</span>
                </Button>
              </>
            ) : (
              <Button asChild>
                <Link to="/pooling/auth">Login / Register</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
