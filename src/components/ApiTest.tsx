
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

const ApiTest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const testApiEndpoint = async (endpoint: string, method: string = 'GET', data?: any) => {
    setIsLoading(true);
    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      const result = await response.json();
      setResults({ endpoint, method, status: response.status, data: result });
      
      toast({
        title: "API Test Complete",
        description: `${method} ${endpoint} - Status: ${response.status}`,
      });
    } catch (error) {
      setResults({ endpoint, method, error: error instanceof Error ? error.message : 'Unknown error' });
      toast({
        title: "API Test Failed",
        description: `Failed to test ${endpoint}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>API Testing Tool</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Button 
            onClick={() => testApiEndpoint('/api/pooling/search.php?type=carpool&from=Hyderabad&to=Visakhapatnam&date=2024-12-30&passengers=2')}
            disabled={isLoading}
          >
            Test Search API
          </Button>
          
          <Button 
            onClick={() => testApiEndpoint('/api/pooling/rides.php')}
            disabled={isLoading}
          >
            Test Rides API
          </Button>
          
          <Button 
            onClick={() => testApiEndpoint('/api/pooling/bookings.php')}
            disabled={isLoading}
          >
            Test Bookings API
          </Button>
          
          <Button 
            onClick={() => testApiEndpoint('/api/pooling/payments.php?action=create-order', 'POST', { booking_id: 1 })}
            disabled={isLoading}
          >
            Test Payments API
          </Button>
        </div>

        <Separator />

        {results && (
          <div className="space-y-2">
            <h3 className="font-semibold">Test Results:</h3>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export { ApiTest };
