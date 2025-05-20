
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

  const logoPath = '/lovable-uploads/63c26b4c-04c7-432a-ba0a-2195cb7068e5.png';

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
