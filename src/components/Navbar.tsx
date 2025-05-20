
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { Menu, X, User, ChevronDown } from 'lucide-react';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
} from "@/components/ui/navigation-menu";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  useEffect(() => {
    // Check if user is logged in
    const checkUserLogin = () => {
      try {
        const token = localStorage.getItem('authToken');
        const userInfoStr = localStorage.getItem('userInfo');
        
        if (token && userInfoStr) {
          const userInfo = JSON.parse(userInfoStr);
          setUserInfo(userInfo);
        }
      } catch (error) {
        console.error('Error checking user login:', error);
      }
    };
    
    checkUserLogin();
  }, []);
  
  return (
    <nav
      className={`sticky top-0 left-0 right-0 z-50 transition-all duration-300 bg-white ${
        isScrolled ? 'shadow-md py-2' : 'py-4'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <img 
                src="/lovable-uploads/f403bba2-a984-4a7c-8f77-04dc15363aa8.png" 
                alt="Vizag Taxi Hub" 
                className="h-10 mr-3"
              />
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <Link to="/">
                    <NavigationMenuLink className="px-4 py-2 text-gray-700 hover:text-blue-600 font-medium">
                      Home
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Link to="/cabs">
                    <NavigationMenuLink className="px-4 py-2 text-gray-700 hover:text-blue-600 font-medium">
                      Our Cabs
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Link to="/tours">
                    <NavigationMenuLink className="px-4 py-2 text-gray-700 hover:text-blue-600 font-medium">
                      Tour Packages
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
                
                {userInfo ? (
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="px-4 py-2 text-gray-700 font-medium">
                      My Account
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <div className="w-48 p-2">
                        <div className="mb-2 px-2 py-1">
                          <p className="text-sm font-medium">{userInfo.name || 'User'}</p>
                          <p className="text-xs text-gray-500">{userInfo.email}</p>
                        </div>
                        <Link to="/dashboard" className="block px-2 py-1.5 text-sm rounded-md hover:bg-gray-100">
                          Dashboard
                        </Link>
                        <Link to="/dashboard/bookings" className="block px-2 py-1.5 text-sm rounded-md hover:bg-gray-100">
                          My Bookings
                        </Link>
                        <Link to="/profile" className="block px-2 py-1.5 text-sm rounded-md hover:bg-gray-100">
                          Profile
                        </Link>
                        <button 
                          className="w-full text-left px-2 py-1.5 text-sm text-red-600 rounded-md hover:bg-gray-100"
                          onClick={() => {
                            localStorage.removeItem('authToken');
                            localStorage.removeItem('userInfo');
                            window.location.href = '/';
                          }}
                        >
                          Logout
                        </button>
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                ) : (
                  <NavigationMenuItem>
                    <Link to="/login">
                      <Button variant="ghost" className="flex items-center">
                        <User size={18} className="mr-1" />
                        Login
                      </Button>
                    </Link>
                  </NavigationMenuItem>
                )}
              </NavigationMenuList>
            </NavigationMenu>
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 focus:outline-none rounded-md hover:bg-gray-100"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden animate-fade-in">
          <div className="bg-white shadow-lg rounded-b-lg px-4 py-3 space-y-2">
            <Link 
              to="/" 
              className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              to="/cabs" 
              className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(false)}
            >
              Our Cabs
            </Link>
            <Link 
              to="/tours" 
              className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(false)}
            >
              Tour Packages
            </Link>
            
            <div className="border-t border-gray-200 my-2 pt-2">
              {userInfo ? (
                <div>
                  <div className="px-3 py-2">
                    <p className="font-medium">{userInfo.name || 'User'}</p>
                    <p className="text-xs text-gray-500">{userInfo.email}</p>
                  </div>
                  <Link 
                    to="/dashboard" 
                    className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link 
                    to="/dashboard/bookings" 
                    className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    My Bookings
                  </Link>
                  <Link 
                    to="/profile" 
                    className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <button 
                    className="w-full text-left px-3 py-2 text-red-600 rounded-md hover:bg-gray-100"
                    onClick={() => {
                      localStorage.removeItem('authToken');
                      localStorage.removeItem('userInfo');
                      setMobileMenuOpen(false);
                      window.location.href = '/';
                    }}
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link 
                  to="/login" 
                  className="flex items-center px-3 py-2 rounded-md text-blue-600 hover:bg-blue-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User size={18} className="mr-2" />
                  Login / Sign Up
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
