import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, TrendingDown, X, Download } from 'lucide-react';

export function PaymentTrackingWidgetSimple() {
  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Attempts</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              ₹0.00 total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Successful</p>
                <p className="text-2xl font-bold text-green-600">0</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              0% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Failed</p>
                <p className="text-2xl font-bold text-red-600">0</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              0% failure rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Cancelled</p>
                <p className="text-2xl font-bold text-yellow-600">0</p>
              </div>
              <X className="h-8 w-8 text-yellow-600" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              0% cancellation rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Setup Notice */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Payment Tracking Setup Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800 mb-4">
              The payment tracking system needs to be set up on your production server. 
              To enable payment tracking functionality:
            </p>
            
            <div className="space-y-2 text-sm text-yellow-700">
              <p>1. <strong>Deploy API Endpoint:</strong> Upload <code>track-payment-attempt.php</code> to your server</p>
              <p>2. <strong>Create Database Tables:</strong> Run the payment tracking SQL script</p>
              <p>3. <strong>Test API:</strong> Verify the endpoint is accessible</p>
            </div>
            
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download Setup Files
              </Button>
              <Button variant="outline" size="sm">
                View Documentation
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Payment Attempts (0)</CardTitle>
          <Button disabled>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">No Payment Data Available</p>
            <p className="text-sm">
              Payment tracking will be available once the system is set up on your server.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


























