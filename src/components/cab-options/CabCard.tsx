
import React, { ReactNode } from 'react';
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatPrice } from '@/lib/cabData';
import { Check } from 'lucide-react';

interface CabCardProps {
  className?: string;
  onClick?: () => void;
  children: ReactNode;
}

export const CabCard: React.FC<CabCardProps> = ({ 
  className, 
  onClick, 
  children 
}) => {
  return (
    <Card 
      className={cn("mb-4 overflow-hidden", className)} 
      onClick={onClick}
    >
      {children}
    </Card>
  );
};

interface CabCardHeaderProps {
  image?: string;
  name: string;
}

export const CabCardHeader: React.FC<CabCardHeaderProps> = ({ 
  image, 
  name 
}) => {
  return (
    <div className="px-4 pt-4 flex items-center space-x-4">
      <div 
        className="w-12 h-12 rounded-md bg-gray-100 flex items-center justify-center bg-cover bg-center"
        style={{ backgroundImage: image ? `url(${image})` : 'none' }}
      >
        {!image && <span className="text-gray-500 text-xs">{name.charAt(0)}</span>}
      </div>
      <h3 className="font-semibold text-lg">{name}</h3>
    </div>
  );
};

interface CabCardContentProps {
  capacity: number;
  luggageCapacity: number;
  ac: boolean;
  description: string;
}

export const CabCardContent: React.FC<CabCardContentProps> = ({ 
  capacity, 
  luggageCapacity, 
  ac, 
  description 
}) => {
  return (
    <div className="p-4">
      <p className="text-sm text-gray-600 mb-2">{description}</p>
      <div className="flex flex-wrap gap-2">
        <span className="text-xs bg-gray-100 px-2 py-1 rounded">{capacity} persons</span>
        <span className="text-xs bg-gray-100 px-2 py-1 rounded">{luggageCapacity} luggage</span>
        {ac && <span className="text-xs bg-gray-100 px-2 py-1 rounded">AC</span>}
      </div>
    </div>
  );
};

interface CabCardFooterProps {
  price: number;
  fareDetails: string;
  isSelected: boolean;
}

export const CabCardFooter: React.FC<CabCardFooterProps> = ({ 
  price, 
  fareDetails, 
  isSelected 
}) => {
  return (
    <div className="px-4 pb-4 flex justify-between items-center border-t pt-3">
      <div>
        <div className="font-bold text-lg">{formatPrice(price)}</div>
        <div className="text-xs text-blue-600">{fareDetails}</div>
      </div>
      {isSelected && (
        <div className="flex items-center text-blue-600 text-sm font-medium">
          <Check size={16} className="mr-1" />
          Selected
        </div>
      )}
    </div>
  );
};

export const CabCardLoading = () => {
  return (
    <Card className="mb-4 overflow-hidden animate-pulse">
      <div className="p-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-md bg-gray-200"></div>
          <div className="h-5 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-3 bg-gray-200 rounded w-full"></div>
          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
        </div>
        <div className="mt-4 flex gap-2">
          <div className="h-5 bg-gray-200 rounded w-16"></div>
          <div className="h-5 bg-gray-200 rounded w-16"></div>
        </div>
        <div className="mt-4 border-t pt-3 flex justify-between">
          <div className="h-6 bg-gray-200 rounded w-20"></div>
          <div className="h-6 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
    </Card>
  );
};
