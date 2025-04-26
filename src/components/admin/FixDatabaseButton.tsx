
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function FixDatabaseButton() {
  const [isFixing, setIsFixing] = useState(false);

  const fixSchema = async () => {
    setIsFixing(true);
    try {
      const apiBaseUrl = window.location.hostname.includes('localhost') 
        ? `${window.location.protocol}//${window.location.host}`
        : 'https://vizagup.com';
      
      const response = await fetch(`${apiBaseUrl}/api/admin/fix-schema.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fix database schema');
      }
      
      toast.success('Database schema has been fixed successfully');
      
      // Reload the page to reflect changes
      window.location.reload();
    } catch (error) {
      console.error('Error fixing schema:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fix database schema');
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Button 
      onClick={fixSchema} 
      disabled={isFixing}
      variant="destructive"
    >
      {isFixing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Fix Database Schema
    </Button>
  );
}
