
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommissionSettingsForm } from './CommissionSettingsForm';
import { CommissionPaymentsList } from './CommissionPaymentsList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function CommissionManagement() {
  const [activeTab, setActiveTab] = useState("settings");

  const handleSettingsUpdated = () => {
    // Refresh data if needed
  };

  const handlePaymentUpdated = () => {
    // Refresh data if needed
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Fleet Commission Management</h2>
        <p className="text-muted-foreground">
          Manage commission rates and track commission payments for fleet vehicles
        </p>
      </div>
      
      <Separator />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3 mb-8">
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        
        <TabsContent value="settings">
          <div className="grid gap-4 lg:grid-cols-2">
            <CommissionSettingsForm onSettingUpdated={handleSettingsUpdated} />
            
            <Card>
              <CardHeader>
                <CardTitle>Commission Guidelines</CardTitle>
                <CardDescription>
                  Best practices for managing fleet commissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium">Default Commission Rate</h3>
                    <p className="text-sm text-muted-foreground">
                      Set a standard commission rate that applies to all fleet vehicles. This is typically 10% of the booking amount.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium">Custom Vehicle Rates</h3>
                    <p className="text-sm text-muted-foreground">
                      Override the default commission rate for specific vehicles based on their performance, value, or agreements with vehicle owners.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium">Commission Tracking</h3>
                    <p className="text-sm text-muted-foreground">
                      The system automatically calculates commissions for each booking. Track pending commissions and mark them as paid when processed.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium">Reports</h3>
                    <p className="text-sm text-muted-foreground">
                      Generate commission reports to review performance by vehicle, time period, or payment status.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="payments">
          <CommissionPaymentsList onPaymentUpdated={handlePaymentUpdated} />
        </TabsContent>
        
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Commission Reports</CardTitle>
              <CardDescription>
                Generate and view commission reports for fleet vehicles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  This feature will allow you to generate detailed reports on commission payments,
                  including total earnings, pending payments, and vehicle-specific performance.
                </p>
                
                <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-amber-800">
                  <p className="text-sm">
                    Commission reporting features are coming soon. You can currently track payments
                    in the Payments tab.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
