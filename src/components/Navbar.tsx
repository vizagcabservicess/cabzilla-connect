import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePoolingAuth } from '@/providers/PoolingAuthProvider';
import { Logo } from './Logo';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  ChevronDown,
  Menu,
  Home,
  LogOut,
  User,
  Phone,
  Car,
  Info,
  UserPlus,
  MapPin,
  Plane,
  Calendar
} from 'lucide-react';

interface NavLink {
  to: string;
  label: string;
}

export function Navbar() {
  const { user, logout } = usePoolingAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleDashboard = () => {
    if (user?.role === 'guest') navigate('/pooling/guest');
    else if (user?.role === 'provider') navigate('/pooling/provider');
    else if (user?.role === 'admin') navigate('/pooling/admin');
    else navigate('/dashboard');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Logo />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center text-gray-700 hover:text-blue-600 transition-colors font-medium">
                Services
                <ChevronDown className="ml-1 h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuItem className="flex items-center space-x-2">
                  <Car className="h-4 w-4" />
                  <span>Local Trips</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4" />
                  <span>Outstation</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center space-x-2">
                  <Plane className="h-4 w-4" />
                  <span>Airport Transfer</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Tour Packages</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center text-gray-700 hover:text-blue-600 transition-colors font-medium">
                Destinations
                <ChevronDown className="ml-1 h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuItem>Hyderabad</DropdownMenuItem>
                <DropdownMenuItem>Chennai</DropdownMenuItem>
                <DropdownMenuItem>Bangalore</DropdownMenuItem>
                <DropdownMenuItem>Araku Valley</DropdownMenuItem>
                <DropdownMenuItem>Tirupati</DropdownMenuItem>
                <DropdownMenuItem>Vijayawada</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center text-gray-700 hover:text-blue-600 transition-colors font-medium">
                Company
                <ChevronDown className="ml-1 h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuItem asChild>
                  <Link to="/about">About Us</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/contact">Contact</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>Fleet</DropdownMenuItem>
                <DropdownMenuItem>Careers</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center text-gray-700 hover:text-blue-600 transition-colors font-medium">
                Support
                <ChevronDown className="ml-1 h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuItem>Help Center</DropdownMenuItem>
                <DropdownMenuItem>Terms & Conditions</DropdownMenuItem>
                <DropdownMenuItem>Privacy Policy</DropdownMenuItem>
                <DropdownMenuItem>Refund Policy</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Contact Information */}
            <div className="flex items-center space-x-4 text-sm">
              <a 
                href="tel:+919966363662" 
                className="flex items-center text-blue-600 hover:text-blue-700 transition-colors font-medium"
              >
                <Phone className="h-4 w-4 mr-1" />
                9966363662
              </a>
            </div>

            {/* Auth Section */}
            {user ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 px-2 rounded-full">
                      <Avatar className="mr-2 h-8 w-8">
                        <AvatarImage src={user.imageUrl || ''} alt={user.name} />
                        <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span>{user.name}</span>
                      <ChevronDown className="ml-1 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleDashboard}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="text-blue-600 hover:text-blue-700 transition-colors font-medium">
                  Login
                </Link>
                <Link to="/signup" className="bg-blue-600 text-white py-2 px-4 rounded-full hover:bg-blue-700 transition-colors font-medium">
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" className="p-2">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="sm:max-w-sm">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                  <SheetDescription>
                    Explore Vizag Taxi Hub
                  </SheetDescription>
                </SheetHeader>
                <div className="grid gap-4 py-4">
                  <Link to="/" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors">
                    <Home className="h-5 w-5" />
                    <span>Home</span>
                  </Link>
                  <Link to="/about" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors">
                    <Info className="h-5 w-5" />
                    <span>About</span>
                  </Link>
                  <Link to="/contact" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors">
                    <Phone className="h-5 w-5" />
                    <span>Contact</span>
                  </Link>
                  {user ? (
                    <>
                      <Button variant="ghost" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors" onClick={handleDashboard}>
                        <User className="h-5 w-5" />
                        <span>Dashboard</span>
                      </Button>
                      <Button variant="ghost" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors" onClick={handleLogout}>
                        <LogOut className="h-5 w-5" />
                        <span>Logout</span>
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors">
                        <User className="h-5 w-5" />
                        <span>Login</span>
                      </Link>
                      <Link to="/signup" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors">
                        <UserPlus className="h-5 w-5" />
                        <span>Sign Up</span>
                      </Link>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
