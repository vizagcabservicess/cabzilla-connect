
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut, Wallet, User } from 'lucide-react';
import { usePoolingAuth } from '@/providers/PoolingAuthProvider';

interface GuestDashboardHeaderProps {
  onLogout: () => void;
}

export function GuestDashboardHeader({ onLogout }: GuestDashboardHeaderProps) {
  const { user, walletData } = usePoolingAuth();

  return (
    <div className="bg-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold">Pooling Platform</h1>
            <Badge variant="secondary" className="bg-blue-500 text-white border-blue-400">
              Guest Dashboard
            </Badge>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm">
              <User className="h-4 w-4" />
              <span>Welcome, {user?.name}</span>
            </div>
            
            <Badge variant="outline" className="bg-white/10 text-white border-white/20">
              <Wallet className="h-4 w-4 mr-1" />
              ₹{walletData?.data?.balance || 0}
            </Badge>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onLogout}
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
