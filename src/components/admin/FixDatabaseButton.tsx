
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, Database } from "lucide-react";
import { toast } from "sonner";
import { useToast } from "@/components/ui/use-toast";

export function FixDatabaseButton() {
  const [isFixing, setIsFixing] = useState(false);
  const { toast: uiToast } = useToast();

  const fixSchema = async () => {
    setIsFixing(true);
    try {
      // Determine API base URL based on environment
      const apiBaseUrl = window.location.hostname.includes('localhost') 
        ? `${window.location.protocol}//${window.location.host}`
        : 'https://vizagup.com';
      
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      console.log(`Fixing schema at ${apiBaseUrl}/api/admin/fix-schema.php?_t=${timestamp}`);
      
      const response = await fetch(`${apiBaseUrl}/api/admin/fix-schema.php?_t=${timestamp}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        // Add a payload to ensure it's treated as POST by all servers
        body: JSON.stringify({ action: 'fix_schema', timestamp })
      });
      
      // Check for network errors first
      if (!response.ok) {
        console.error('Network error:', response.status, response.statusText);
        throw new Error(`Network error: ${response.status} ${response.statusText}`);
      }
      
      let data;
      try {
        data = await response.json();
        console.log('Fix schema response:', data);
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        throw new Error('Invalid server response. Unable to parse JSON.');
      }
      
      if (!data) {
        throw new Error('Empty response from server');
      }
      
      if (data.status === 'success') {
        toast.success('Database schema has been fixed successfully');
        
        // Show detailed toast with operations performed
        if (data.details && data.details.operations && data.details.operations.length > 0) {
          uiToast({
            title: 'Schema Fix Operations',
            description: (
              <ul className="mt-2 text-sm">
                {data.details.operations.slice(0, 5).map((op: string, i: number) => (
                  <li key={i} className="mb-1">✓ {op}</li>
                ))}
                {data.details.operations.length > 5 && (
                  <li>...and {data.details.operations.length - 5} more operations</li>
                )}
              </ul>
            ),
          });
        }
        
        // Reload the page after a short delay to reflect changes
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else if (data.status === 'partial') {
        toast.warning('Database schema has been partially fixed with some issues');
        
        // Show warning toast with errors
        if (data.details && data.details.errors && data.details.errors.length > 0) {
          uiToast({
            variant: "destructive",
            title: 'Schema Fix Warnings',
            description: (
              <ul className="mt-2 text-sm">
                {data.details.errors.slice(0, 3).map((err: string, i: number) => (
                  <li key={i} className="mb-1">⚠️ {err}</li>
                ))}
                {data.details.errors.length > 3 && (
                  <li>...and {data.details.errors.length - 3} more issues</li>
                )}
              </ul>
            ),
          });
        }
        
        // Still reload after a delay as partial fixes may be sufficient
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        throw new Error(data.message || 'Failed to fix database schema');
      }
    } catch (error) {
      console.error('Error fixing schema:', error);
      
      // Provide detailed error toast
      uiToast({
        variant: "destructive",
        title: 'Database Fix Failed',
        description: (
          <div>
            <p>There was an error fixing the database schema:</p>
            <p className="text-sm font-mono mt-2 bg-slate-800 p-2 rounded overflow-auto max-h-32">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
            <p className="text-xs mt-2">Check browser console for more details.</p>
          </div>
        ),
      });
      
      // Also show a simpler toast
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
      className="flex items-center gap-1"
    >
      {isFixing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Database className="h-4 w-4" />
      )}
      <span>Fix Database Schema</span>
    </Button>
  );
}
