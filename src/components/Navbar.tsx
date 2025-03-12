
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 w-full z-50 transition-all duration-300 h-16',
        isScrolled
          ? 'bg-white/90 backdrop-blur-md shadow-sm'
          : 'bg-transparent'
      )}
    >
      <div className="container mx-auto px-4 h-full flex items-center justify-between">
        <Link 
          to="/" 
          className="flex items-center space-x-2"
        >
          <div className="w-10 h-10 rounded-lg bg-cabBlue-500 text-white flex items-center justify-center font-bold text-xl">
            CC
          </div>
          <span className="font-bold text-xl text-cabBlue-800 hidden sm:inline-block">
            CabZilla
          </span>
        </Link>

        <nav className="hidden md:flex items-center space-x-8">
          <NavLink href="/">Home</NavLink>
          <NavLink href="/cabs">Cabs</NavLink>
          <NavLink href="/offers">Offers</NavLink>
          <NavLink href="/about">About</NavLink>
        </nav>

        <div className="hidden md:flex items-center space-x-4">
          <a 
            href="tel:+1800123456" 
            className="flex items-center space-x-2 text-cabBlue-600 hover:text-cabBlue-800 transition-colors"
          >
            <Phone size={18} />
            <span>1800-123-456</span>
          </a>
          <Button>Login</Button>
        </div>

        <button 
          className="md:hidden text-cabBlue-800" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full bg-white shadow-lg animate-slide-down">
          <div className="px-4 py-4 space-y-4">
            <MobileNavLink href="/" onClick={() => setIsMobileMenuOpen(false)}>Home</MobileNavLink>
            <MobileNavLink href="/cabs" onClick={() => setIsMobileMenuOpen(false)}>Cabs</MobileNavLink>
            <MobileNavLink href="/offers" onClick={() => setIsMobileMenuOpen(false)}>Offers</MobileNavLink>
            <MobileNavLink href="/about" onClick={() => setIsMobileMenuOpen(false)}>About</MobileNavLink>
            
            <div className="pt-4 border-t border-cabGray-200">
              <a 
                href="tel:+1800123456" 
                className="flex items-center space-x-2 text-cabBlue-600 py-2"
              >
                <Phone size={18} />
                <span>1800-123-456</span>
              </a>
              <Button className="w-full mt-4">Login</Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
}

function NavLink({ href, children }: NavLinkProps) {
  return (
    <Link 
      to={href} 
      className="text-cabGray-700 hover:text-cabBlue-600 font-medium transition-colors relative group"
    >
      {children}
      <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-cabBlue-500 transition-all duration-300 group-hover:w-full"></span>
    </Link>
  );
}

interface MobileNavLinkProps extends NavLinkProps {
  onClick?: () => void;
}

function MobileNavLink({ href, children, onClick }: MobileNavLinkProps) {
  return (
    <Link 
      to={href} 
      className="block py-2 text-cabGray-800 font-medium"
      onClick={onClick}
    >
      {children}
    </Link>
  );
}
