
import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  variant?: 'default' | 'white' | 'dark';
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'default',
  size = 'medium',
  className = ''
}) => {
  const getSizeClass = () => {
    switch (size) {
      case 'small': return 'h-6';
      case 'large': return 'h-12';
      default: return 'h-8';
    }
  };

  // Using the uploaded logo
  const logoPath = '/lovable-uploads/a7c4aa76-7528-425a-8dcc-2168607d3fe2.png';

  return (
    <Link to="/" className={`block ${className}`}>
      <img 
        src={logoPath} 
        alt="Vizag Taxi Hub" 
        className={`${getSizeClass()} w-auto`} 
      />
    </Link>
  );
};
