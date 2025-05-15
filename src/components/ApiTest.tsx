
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MessageCircle, Terminal, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatPhoneNumber } from '@/services/whatsappService';
import { WhatsAppButton } from '@/components/ui/whatsapp-button';

export default function ApiTest() {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("Hello, this is a test message from the WhatsApp integration!");
  const [responseData, setResponseData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only digits, plus sign, and spaces
    const value = e.target.value.replace(/[^\d\s+]/g, '');
    setPhone(value);
  };

  const testWhatsAppAPI = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      
      // Format the phone number
      const formattedPhone = formatPhoneNumber(phone);
      
      // Call the backend API
      const response = await fetch('/api/admin/send-whatsapp.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: formattedPhone,
          messageType: 'custom',
          data: {
            message
          }
        }),
      });
      
      const data = await response.json();
      setResponseData(data);
      
      if (response.ok) {
        toast({
          title: "API Test Successful",
          description: "WhatsApp API test was successful.",
        });
      } else {
        setErrorMessage(data.message || "Unknown error occurred");
        toast({
          variant: "destructive",
          title: "API Test Failed",
          description: data.message || "Failed to test WhatsApp API",
        });
      }
    } catch (error) {
      console.error("WhatsApp API test error:", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to connect to WhatsApp API");
      toast({
        variant: "destructive",
        title: "API Test Failed",
        description: "Failed to test WhatsApp API. Check console for details.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openWhatsAppDirectly = () => {
    const formattedPhone = formatPhoneNumber(phone);
    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    window.open(url, '_blank');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageCircle className="mr-2" />
          WhatsApp API Test
        </CardTitle>
        <CardDescription>
          Test the WhatsApp integration by sending messages via the API or directly
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="direct">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="direct" className="flex-1">
              Direct Integration
            </TabsTrigger>
            <TabsTrigger value="api" className="flex-1">
              API Test
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="direct" className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Phone Number</label>
                <Input
                  placeholder="Enter phone number (with country code)"
                  value={phone}
                  onChange={handlePhoneChange}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Include country code or add +91 for India
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium">Message</label>
                <Input
                  placeholder="Enter your message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              
              <div className="pt-2">
                <WhatsAppButton 
                  phone={phone} 
                  message={message}
                  disabled={!phone || !message} 
                  variant="whatsapp" 
                  fullWidth
                >
                  Open in WhatsApp
                </WhatsAppButton>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="api" className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Phone Number</label>
                <Input
                  placeholder="Enter phone number (with country code)"
                  value={phone}
                  onChange={handlePhoneChange}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Include country code or add +91 for India
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium">Message</label>
                <Input
                  placeholder="Enter your message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              
              <div className="pt-2">
                <Button 
                  onClick={testWhatsAppAPI} 
                  disabled={isLoading || !phone || !message}
                  className="w-full"
                >
                  {isLoading ? "Testing..." : "Test WhatsApp API"}
                </Button>
              </div>
              
              {errorMessage && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}
              
              {responseData && (
                <div className="mt-4 border rounded-md p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">API Response</h3>
                    <Badge variant={responseData.status === "success" ? "default" : "destructive"}>
                      {responseData.status}
                    </Badge>
                  </div>
                  <div className="bg-black text-white p-3 rounded-md overflow-auto max-h-40">
                    <pre className="text-xs">
                      {JSON.stringify(responseData, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
