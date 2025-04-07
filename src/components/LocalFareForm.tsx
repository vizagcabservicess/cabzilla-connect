
import React, { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LocalFare } from '@/types/cab';
import { FareUpdateError } from './cab-options/FareUpdateError';
import { directApiPost, directApiPostWithFallback } from '@/utils/directApiHelper';

const localFareSchema = z.object({
  price4hrs40km: z.coerce.number().min(0, "4 hours / 40 km price must be a positive number"),
  price8hrs80km: z.coerce.number().min(0, "8 hours / 80 km price must be a positive number"),
  price10hrs100km: z.coerce.number().min(0, "10 hours / 100 km price must be a positive number"),
  priceExtraKm: z.coerce.number().min(0, "Extra km price must be a positive number"),
  priceExtraHour: z.coerce.number().min(0, "Extra hour price must be a positive number"),
});

type LocalFareFormValues = z.infer<typeof localFareSchema>;

interface LocalFareFormProps {
  vehicleId: string;
  initialData: LocalFare | null;
  onSuccess?: () => void;
  onError?: (err: any) => void;
}

export function LocalFareForm({ vehicleId, initialData, onSuccess, onError }: LocalFareFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastSubmitTime, setLastSubmitTime] = useState<number | null>(null);

  const form = useForm<LocalFareFormValues>({
    resolver: zodResolver(localFareSchema),
    defaultValues: {
      price4hrs40km: 0,
      price8hrs80km: 0,
      price10hrs100km: 0,
      priceExtraKm: 0,
      priceExtraHour: 0,
    },
  });

  // Update form when initial data changes
  useEffect(() => {
    if (initialData) {
      console.log("Setting initial local fare data:", initialData);
      form.reset({
        price4hrs40km: initialData.price4hrs40km || 0,
        price8hrs80km: initialData.price8hrs80km || 0,
        price10hrs100km: initialData.price10hrs100km || 0,
        priceExtraKm: initialData.priceExtraKm || 0,
        priceExtraHour: initialData.priceExtraHour || 0,
      });
    }
  }, [initialData, form]);

  async function onSubmit(values: LocalFareFormValues) {
    // Prevent double submissions
    const now = Date.now();
    if (lastSubmitTime && now - lastSubmitTime < 2000) {
      console.log("Preventing duplicate submission");
      return;
    }
    setLastSubmitTime(now);
    
    if (!vehicleId) {
      const newError = new Error("Vehicle ID is required");
      setError(newError);
      if (onError) onError(newError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("Submitting local fare form for vehicle:", vehicleId);
      
      let errorMsg = "";
      let success = false;
      
      // Try all available methods to update the fare
      try {
        // Method 1: Direct API call
        console.log("Attempting direct API update...");
        const data = {
          vehicleId,
          ...values
        };
        
        const directResponse = await directApiPostWithFallback(
          '/api/direct-local-fares.php',
          '/api/admin/direct-local-fares-update.php',
          data,
          {
            headers: {
              'X-Admin-Mode': 'true',
              'X-Debug': 'true'
            }
          }
        );
        
        if (directResponse && directResponse.status === 'success') {
          console.log("Direct API update successful:", directResponse);
          success = true;
        } else {
          errorMsg += "Direct API failed: " + (directResponse?.message || "Unknown error") + ". ";
        }
      } catch (directError: any) {
        console.error("Direct API update failed:", directError);
        errorMsg += "Direct API failed: " + (directError?.message || directError) + ". ";
      }
      
      // If direct method failed, try fallback method
      if (!success) {
        try {
          console.log("Attempting fallback API update...");
          
          // Try the traditional admin API
          const response = await fetch('/api/admin/local-fares-update.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Admin-Mode': 'true',
              'X-Debug': 'true'
            },
            body: JSON.stringify({
              vehicleId,
              ...values
            })
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          
          const responseText = await response.text();
          console.log("Fallback API response text:", responseText);
          
          try {
            const fallbackResponse = JSON.parse(responseText);
            if (fallbackResponse && fallbackResponse.status === 'success') {
              console.log("Fallback API update successful:", fallbackResponse);
              success = true;
            } else {
              errorMsg += "Fallback API failed: " + (fallbackResponse?.message || "Unknown error") + ". ";
            }
          } catch (jsonError) {
            errorMsg += "Fallback API failed: Invalid JSON response. ";
          }
        } catch (fallbackError: any) {
          console.error("Fallback API update failed:", fallbackError);
          errorMsg += "Fallback API failed: " + (fallbackError?.message || fallbackError) + ". ";
        }
      }
      
      // If all methods failed, throw an error
      if (!success) {
        throw new Error(errorMsg || "Failed to update local fares through all available methods");
      }
      
      toast.success(`Local fare for ${vehicleId} updated successfully`);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error("Error updating local fares:", err);
      setError(err);
      if (onError) onError(err);
      toast.error(`Failed to update local fares: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  const handleRetry = () => {
    setError(null);
    form.handleSubmit(onSubmit)();
  };

  if (error) {
    return (
      <FareUpdateError 
        error={error} 
        onRetry={handleRetry} 
        isAdmin={true}
        title="Error Updating Local Fares"
        description="There was a problem updating the local fares. Please try again."
        fixDatabaseHandler={async () => {
          try {
            const response = await fetch('/api/admin/fix-database.php', {
              method: 'GET',
              headers: {
                'X-Admin-Mode': 'true',
                'X-Debug': 'true'
              }
            });
            
            if (!response.ok) {
              throw new Error(`Failed with status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.status === 'success') {
              toast.success('Database fixed successfully');
              handleRetry();
            } else {
              toast.error(`Database fix failed: ${data.message}`);
            }
          } catch (err: any) {
            toast.error(`Database fix error: ${err.message}`);
          }
        }}
        directDatabaseAccess={async () => {
          try {
            const response = await fetch(`/api/admin/direct-db-access.php?table=local_package_fares&vehicle_id=${vehicleId}`, {
              method: 'GET',
              headers: {
                'X-Admin-Mode': 'true',
                'X-Debug': 'true'
              }
            });
            
            if (!response.ok) {
              throw new Error(`Failed with status: ${response.status}`);
            }
            
            const data = await response.json();
            toast.info('Direct database access results available in console');
            console.log('Direct DB access results:', data);
          } catch (err: any) {
            toast.error(`Direct DB access error: ${err.message}`);
          }
        }}
      />
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="price4hrs40km"
            render={({ field }) => (
              <FormItem>
                <FormLabel>4 Hours / 40 KM Package Price (₹)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} min="0" step="1" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="price8hrs80km"
            render={({ field }) => (
              <FormItem>
                <FormLabel>8 Hours / 80 KM Package Price (₹)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} min="0" step="1" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="price10hrs100km"
            render={({ field }) => (
              <FormItem>
                <FormLabel>10 Hours / 100 KM Package Price (₹)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} min="0" step="1" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="priceExtraKm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Extra KM Charge (₹)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} min="0" step="0.5" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priceExtraHour"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Extra Hour Charge (₹)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} min="0" step="1" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {form.formState.isDirty && (
          <Alert className="bg-amber-50 text-amber-800 border-amber-200">
            <AlertDescription>
              You have unsaved changes to the local fare settings.
            </AlertDescription>
          </Alert>
        )}

        <Button 
          type="submit" 
          className="w-full"
          disabled={isLoading || !form.formState.isDirty}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Local Fare
        </Button>
      </form>
    </Form>
  );
}
