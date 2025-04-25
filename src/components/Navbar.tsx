
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
        'sticky top-0 w-full z-50 transition-all duration-300',
        isScrolled
          ? 'bg-white/90 backdrop-blur-md shadow-sm'
          : 'bg-white'
      )}
    >
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <Link 
          to="/" 
          className="flex items-center space-x-2"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
            CC
          </div>
          <span className="font-bold text-lg text-gray-900 hidden sm:inline-block">
            CabZilla
          </span>
        </Link>

        <div className="flex items-center space-x-4">
          <a 
            href="tel:+919966363662" 
            className="flex items-center space-x-2 text-blue-600"
          >
            <Phone size={18} />
            <span className="hidden sm:inline">+91 9966363662</span>
          </a>
          <Button 
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="fixed inset-x-0 top-14 bg-white border-t border-gray-100 animate-enter">
          <nav className="container mx-auto px-4 py-4 space-y-2">
            <MobileNavLink href="/" onClick={() => setIsMobileMenuOpen(false)}>Home</MobileNavLink>
            <MobileNavLink href="/cabs" onClick={() => setIsMobileMenuOpen(false)}>Book Cab</MobileNavLink>
            <MobileNavLink href="/offers" onClick={() => setIsMobileMenuOpen(false)}>Offers</MobileNavLink>
          </nav>
        </div>
      )}
    </header>
  );
}

interface MobileNavLinkProps {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
}

function MobileNavLink({ href, children, onClick }: MobileNavLinkProps) {
  return (
    <Link 
      to={href} 
      className="block py-3 px-4 text-gray-800 font-medium rounded-lg hover:bg-gray-50 active:bg-gray-100"
      onClick={onClick}
    >
      {children}
    </Link>
  );
}
