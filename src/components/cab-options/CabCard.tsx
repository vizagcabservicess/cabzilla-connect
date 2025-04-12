
import React from 'react';
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatPrice } from '@/lib/cabData';
import { Check, X } from 'lucide-react';

interface CabCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const CabCard: React.FC<CabCardProps> = ({ 
  children, 
  className,
  onClick
}) => {
  return (
    <Card 
      className={cn("mb-4 p-4 cursor-pointer hover:shadow-md", className)}
      onClick={onClick}
    >
      {children}
    </Card>
  );
};

export const CabCardLoading = () => {
  return (
    <Card className="mb-4 p-4 animate-pulse">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <div className="w-16 h-16 bg-gray-200 rounded-md"></div>
          <div className="ml-3">
            <div className="h-5 w-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
      <div className="mt-4 flex justify-between items-center">
        <div className="h-6 bg-gray-200 rounded w-20"></div>
        <div className="h-9 bg-gray-200 rounded w-24"></div>
      </div>
    </Card>
  );
};

interface CabCardHeaderProps {
  image?: string;
  name: string;
}

export const CabCardHeader: React.FC<CabCardHeaderProps> = ({ image, name }) => {
  return (
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center">
        {image ? (
          <img src={image} alt={name} className="w-16 h-16 object-cover rounded-md" />
        ) : (
          <div className="w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center text-gray-400">
            Car
          </div>
        )}
        <div className="ml-3">
          <h3 className="text-lg font-semibold">{name}</h3>
        </div>
      </div>
    </div>
  );
};

interface CabCardContentProps {
  capacity: number;
  luggageCapacity: number;
  ac: boolean;
  description?: string;
}

export const CabCardContent: React.FC<CabCardContentProps> = ({ 
  capacity, 
  luggageCapacity, 
  ac, 
  description 
}) => {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-x-4 text-sm text-gray-600">
        <div className="flex items-center">
          <span className="font-medium">{capacity} persons</span>
        </div>
        <div className="flex items-center">
          <span className="font-medium">{luggageCapacity} luggage</span>
        </div>
        <div className="flex items-center">
          {ac ? (
            <span className="flex items-center text-green-600">
              <Check size={16} className="mr-1" />
              AC
            </span>
          ) : (
            <span className="flex items-center text-red-600">
              <X size={16} className="mr-1" />
              Non-AC
            </span>
          )}
        </div>
      </div>
      {description && (
        <p className="text-sm text-gray-500">{description}</p>
      )}
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
    <div className="mt-4 flex justify-between items-center">
      <div className="text-sm text-gray-500">
        {fareDetails}
      </div>
      <div className={cn(
        "px-4 py-1.5 rounded-md flex items-center",
        isSelected ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-900"
      )}>
        <span className="text-lg font-bold">{formatPrice(price)}</span>
        {isSelected && <Check size={18} className="ml-2" />}
      </div>
    </div>
  );
};
