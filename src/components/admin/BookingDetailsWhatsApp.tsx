
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Share2, Send, Users, Receipt, Car, Smartphone } from "lucide-react";
import { Booking } from '@/types/api';
import { WhatsAppButton } from '@/components/ui/whatsapp-button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { 
  generateBookingConfirmationMessage, 
  generateDriverAssignmentMessage, 
  generateInvoiceMessage,
  generateDriverNotificationMessage,
  formatPhoneNumber
} from '@/services/whatsappService';
import { getApiUrl } from '@/config/api';

interface BookingDetailsWhatsAppProps {
  booking: Booking;
  onClose: () => void;
}

export function BookingDetailsWhatsApp({ booking, onClose }: BookingDetailsWhatsAppProps) {
  const [activeTab, setActiveTab] = useState('customer');
  const [customMessage, setCustomMessage] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const { toast } = useToast();
  
  // Generate invoice URL
  const invoiceUrl = getApiUrl(`/api/download-invoice.php?id=${booking.id}&direct_download=1`);
  
  // Message templates
  const bookingConfirmationMsg = generateBookingConfirmationMessage(booking);
  const driverAssignmentMsg = booking.driverName ? generateDriverAssignmentMessage(booking) : '';
  const invoiceMsg = generateInvoiceMessage(booking, invoiceUrl);
  const driverNotificationMsg = booking.driverName ? generateDriverNotificationMessage(booking) : '';
  
  const handleCopyMessage = (message: string) => {
    navigator.clipboard.writeText(message);
    toast({
      title: "Message copied",
      description: "The message has been copied to your clipboard."
    });
  };
  
  const handleCustomPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits, plus sign, and spaces
    const value = e.target.value.replace(/[^\d\s+]/g, '');
    setCustomPhone(value);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageCircle className="mr-2" />
          WhatsApp Messaging
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="customer" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="customer" className="flex-1">
              <Users className="w-4 h-4 mr-2" />
              Customer
            </TabsTrigger>
            {booking.driverPhone && (
              <TabsTrigger value="driver" className="flex-1">
                <Car className="w-4 h-4 mr-2" />
                Driver
              </TabsTrigger>
            )}
            <TabsTrigger value="custom" className="flex-1">
              <Smartphone className="w-4 h-4 mr-2" />
              Custom
            </TabsTrigger>
          </TabsList>
          
          {/* Customer Tab */}
          <TabsContent value="customer">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Send to: {booking.passengerName}</h3>
                <p className="text-sm text-gray-500">{booking.passengerPhone}</p>
              </div>
              
              <div className="space-y-4">
                {/* Booking Confirmation */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium">Booking Confirmation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs whitespace-pre-line bg-gray-50 p-3 rounded-md mb-3 max-h-40 overflow-y-auto">
                      {bookingConfirmationMsg}
                    </div>
                    <div className="flex justify-between">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCopyMessage(bookingConfirmationMsg)}
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                      <WhatsAppButton 
                        phone={booking.passengerPhone} 
                        message={bookingConfirmationMsg}
                        size="sm"
                      >
                        Send via WhatsApp
                      </WhatsAppButton>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Invoice */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium">Invoice</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs whitespace-pre-line bg-gray-50 p-3 rounded-md mb-3 max-h-40 overflow-y-auto">
                      {invoiceMsg}
                    </div>
                    <div className="flex justify-between">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCopyMessage(invoiceMsg)}
                      >
                        <Receipt className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                      <WhatsAppButton 
                        phone={booking.passengerPhone} 
                        message={invoiceMsg}
                        size="sm"
                      >
                        Send Invoice
                      </WhatsAppButton>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Driver Assignment */}
                {booking.driverName && booking.driverPhone && booking.vehicleNumber && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm font-medium">Driver Assignment</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xs whitespace-pre-line bg-gray-50 p-3 rounded-md mb-3 max-h-40 overflow-y-auto">
                        {driverAssignmentMsg}
                      </div>
                      <div className="flex justify-between">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleCopyMessage(driverAssignmentMsg)}
                        >
                          <Share2 className="w-4 h-4 mr-2" />
                          Copy
                        </Button>
                        <WhatsAppButton 
                          phone={booking.passengerPhone} 
                          message={driverAssignmentMsg}
                          size="sm"
                        >
                          Send Assignment
                        </WhatsAppButton>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
          
          {/* Driver Tab */}
          {booking.driverPhone && (
            <TabsContent value="driver">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Send to: {booking.driverName}</h3>
                  <p className="text-sm text-gray-500">{booking.driverPhone}</p>
                </div>
                
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium">Trip Assignment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs whitespace-pre-line bg-gray-50 p-3 rounded-md mb-3 max-h-40 overflow-y-auto">
                      {driverNotificationMsg}
                    </div>
                    <div className="flex justify-between">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCopyMessage(driverNotificationMsg)}
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                      <WhatsAppButton 
                        phone={booking.driverPhone} 
                        message={driverNotificationMsg}
                        size="sm"
                      >
                        Send to Driver
                      </WhatsAppButton>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
          
          {/* Custom Tab */}
          <TabsContent value="custom">
            <div className="space-y-4">
              <div>
                <Label htmlFor="customPhone">Phone Number</Label>
                <Input
                  id="customPhone"
                  placeholder="Enter phone number"
                  value={customPhone}
                  onChange={handleCustomPhoneChange}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Include country code or add +91 for India
                </p>
              </div>
              
              <div>
                <Label htmlFor="customMessage">Message</Label>
                <Textarea
                  id="customMessage"
                  placeholder="Type your custom message here..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="min-h-32"
                />
              </div>
              
              {(!customPhone || !customMessage) && (
                <Alert className="bg-amber-50">
                  <AlertDescription className="text-amber-700">
                    Please enter both a phone number and a message to continue.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="flex justify-between">
                <Button 
                  variant="outline"
                  disabled={!customMessage}
                  onClick={() => handleCopyMessage(customMessage)}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Copy Message
                </Button>
                <WhatsAppButton
                  phone={customPhone}
                  message={customMessage}
                  disabled={!customPhone || !customMessage}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Custom Message
                </WhatsAppButton>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="mt-6 flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </CardContent>
    </Card>
  );
}
