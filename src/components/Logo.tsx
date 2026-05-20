
import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  variant?: 'default' | 'white' | 'dark';
  size?: 'small' | 'medium' | 'large';
  className?: string;
  to?: string;
  linkless?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'default',
  size = 'medium',
  className = '',
  to = '/',
  linkless = false,
}) => {
  const getSizeClass = () => {
    switch (size) {
      case 'small': return 'h-8';
      case 'large': return 'h-14';
      default: return 'h-12';
    }
  };

  const logoPath = '/uploads/vizagtaxihub-logo.png';

  const img = (
    <img
      src={logoPath}
      alt="Vizag Taxi Hub"
      className={`${getSizeClass()} w-auto ${variant === 'white' ? 'brightness-0 invert' : ''}`}
    />
  );

  if (linkless) {
    return <span className={`inline-block ${className}`}>{img}</span>;
  }

  return (
    <Link to={to} className={`block ${className}`}>
      {img}
    </Link>
  );
};
