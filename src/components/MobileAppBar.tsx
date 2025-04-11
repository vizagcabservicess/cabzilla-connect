
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MobileAppBar() {
  const navigate = useNavigate();
  
  return (
    <div className="bg-blue-50 px-4 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center">
        <div 
          className="w-10 h-10 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold cursor-pointer"
          onClick={() => navigate('/')}
        >
          CC
        </div>
      </div>
      
      <Button variant="ghost" size="icon" className="text-gray-700">
        <Menu size={24} />
      </Button>
    </div>
  );
}
