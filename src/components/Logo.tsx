
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

  // Using the correct uploaded logo
  const logoPath = '/lovable-uploads/f403bba2-a984-4a7c-8f77-04dc15363aa8.png';

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
