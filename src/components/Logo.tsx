
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
      default: return 'h-12';
    }
  };

  // Using the correct uploaded logo
  const logoPath = '/uploads/vizagtaxihub-logo.png';

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
