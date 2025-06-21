import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { usePoolingAuth } from '@/contexts/PoolingAuthContext';

export const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { user: poolingUser, logout: poolingLogout } = usePoolingAuth();
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handlePoolingLogout = async () => {
    await poolingLogout();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="font-bold text-xl">
          Vizag Taxis
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <Link to="/local-taxi" className="hover:text-blue-500">Local Taxi</Link>
          <Link to="/outstation-taxi" className="hover:text-blue-500">Outstation</Link>
          <Link to="/airport-taxi" className="hover:text-blue-500">Airport Taxi</Link>
          <Link to="/rentals" className="hover:text-blue-500">Rentals</Link>
          <Link to="/tours" className="hover:text-blue-500">Tours</Link>
          <Link to="/cabs" className="hover:text-blue-500">Cabs</Link>
          <Link to="/pooling" className="hover:text-blue-500">Pooling</Link>
        </div>

        {/* User Profile Section - fix the imageUrl issue */}
        {user && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <span className="text-sm text-gray-700">{user.name}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>Logout</Button>
          </div>
        )}

        {poolingUser && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {poolingUser.name ? poolingUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <span className="text-sm text-gray-700">{poolingUser.name}</span>
            <Button variant="outline" size="sm" onClick={handlePoolingLogout}>Logout</Button>
          </div>
        )}

        {!user && !poolingUser && (
          <div className="hidden md:flex items-center gap-4">
            <Link to="/login">
              <Button variant="outline" size="sm">Log In</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">Sign Up</Button>
            </Link>
          </div>
        )}

        <Sheet>
          <SheetTrigger className="md:hidden">
            <Menu />
          </SheetTrigger>
          <SheetContent className="sm:max-w-xs">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
              <SheetDescription>
                Explore our services and options.
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 py-4">
              <Link to="/local-taxi" className="hover:text-blue-500">Local Taxi</Link>
              <Link to="/outstation-taxi" className="hover:text-blue-500">Outstation</Link>
              <Link to="/airport-taxi" className="hover:text-blue-500">Airport Taxi</Link>
              <Link to="/rentals" className="hover:text-blue-500">Rentals</Link>
              <Link to="/tours" className="hover:text-blue-500">Tours</Link>
              <Link to="/cabs" className="hover:text-blue-500">Cabs</Link>
              <Link to="/pooling" className="hover:text-blue-500">Pooling</Link>

              {!user && !poolingUser && (
                <>
                  <Link to="/login">
                    <Button variant="outline" size="sm">Log In</Button>
                  </Link>
                  <Link to="/signup">
                    <Button size="sm">Sign Up</Button>
                  </Link>
                </>
              )}

              {user && (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <span className="text-sm text-gray-700">{user.name}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleLogout}>Logout</Button>
                </>
              )}

              {poolingUser && (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {poolingUser.name ? poolingUser.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <span className="text-sm text-gray-700">{poolingUser.name}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={handlePoolingLogout}>Logout</Button>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
};
