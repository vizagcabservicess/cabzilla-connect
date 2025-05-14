import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Check, CalendarIcon, Clock, Package, AlertTriangle } from 'lucide-react';
import { HourlyPackage } from '@/types/cab';
import { LocalDatePicker } from './LocalDatePicker';
import { LocalTimePicker } from './LocalTimePicker';

interface LocalTripSelectorProps {
  onPackageSelect: (packageName: string) => void;
  onDateTimeSelect: (date: Date, time: string) => void;
  selectedPackage?: string;
  selectedDate?: Date;
  selectedTime?: string;
}

export function LocalTripSelector({
  onPackageSelect,
  onDateTimeSelect,
  selectedPackage,
  selectedDate,
  selectedTime,
}: LocalTripSelectorProps) {
  const [hourlyPackages, setHourlyPackages] = useState<HourlyPackage[]>([
    {
      id: "4hrs-40km",
      name: "4 Hours / 40 KM",
      hours: 4,
      kms: 40
    },
    {
      id: "8hrs-80km",
      name: "8 Hours / 80 KM",
      hours: 8,
      kms: 80
    },
    {
      id: "10hrs-100km",
      name: "10 Hours / 100 KM",
      hours: 10,
      kms: 100
    }
  ]);

  const [activeTab, setActiveTab] = useState("package");
  const [pickupDate, setPickupDate] = useState<Date>(selectedDate || new Date());
  const [pickupTime, setPickupTime] = useState<string>(selectedTime || "09:00");
  const [selectedHourlyPackage, setSelectedHourlyPackage] = useState<string>(selectedPackage || "8hrs-80km");

  // Update parent component when package or date/time changes
  useEffect(() => {
    if (selectedHourlyPackage) {
      onPackageSelect(selectedHourlyPackage);
    }
  }, [selectedHourlyPackage, onPackageSelect]);

  useEffect(() => {
    onDateTimeSelect(pickupDate, pickupTime);
  }, [pickupDate, pickupTime, onDateTimeSelect]);

  // Handle package selection
  const handlePackageSelect = (packageId: string) => {
    setSelectedHourlyPackage(packageId);
  };

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    setPickupDate(date);
  };

  // Handle time selection
  const handleTimeSelect = (time: string) => {
    setPickupTime(time);
  };

  // Get selected package details
  const getSelectedPackage = (): HourlyPackage | undefined => {
    return hourlyPackages.find(pkg => pkg.id === selectedHourlyPackage);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl">Local Trip</CardTitle>
        <CardDescription>Select a package for your local trip</CardDescription>
      </CardHeader>
      <CardContent className="pb-6">
        <Tabs defaultValue="package" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="package" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span>Package</span>
            </TabsTrigger>
            <TabsTrigger value="datetime" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Date & Time</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="package" className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-medium leading-none">Select Package</h3>
              <p className="text-sm text-muted-foreground">Choose a package based on your requirements</p>
            </div>

            <RadioGroup 
              value={selectedHourlyPackage} 
              onValueChange={handlePackageSelect}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              {hourlyPackages.map(pkg => (
                <div key={pkg.id} className="relative">
                  <RadioGroupItem 
                    value={pkg.id} 
                    id={pkg.id}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={pkg.id}
                    className={`
                      flex flex-col border rounded-lg p-4 cursor-pointer
                      peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5
                      hover:bg-gray-50 dark:hover:bg-gray-900 transition-all
                    `}
                  >
                    <span className="font-medium text-base">{pkg.name}</span>
                    <span className="text-sm text-muted-foreground mt-1">
                      {pkg.hours} Hours / {pkg.kms} KM
                    </span>
                    
                    <div className={`
                      absolute top-3 right-3 w-5 h-5 rounded-full
                      border-2 border-primary flex items-center justify-center
                      peer-data-[state=checked]:bg-primary
                      text-white
                    `}>
                      <Check className="h-3 w-3" />
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div className="flex justify-between">
              <div className="text-sm text-muted-foreground">
                <p>Additional charges:</p>
                <ul className="list-disc pl-5">
                  <li>₹{getSelectedPackage()?.basePrice || "N/A"} per extra hour</li>
                  <li>₹{getSelectedPackage()?.basePrice || "N/A"} per extra KM</li>
                </ul>
              </div>
              <Button onClick={() => setActiveTab("datetime")}>
                Next: Date & Time
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="datetime" className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-medium leading-none">Select Date & Time</h3>
              <p className="text-sm text-muted-foreground">Choose when you need the cab</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Label htmlFor="pickupDate" className="block mb-2">Date</Label>
                <LocalDatePicker 
                  selected={pickupDate} 
                  onSelect={handleDateSelect} 
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="pickupTime" className="block mb-2">Time</Label>
                <LocalTimePicker 
                  selected={pickupTime}
                  onSelect={handleTimeSelect}
                  className="w-full"
                />
              </div>
            </div>

            <div className="bg-muted p-3 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium">Important</p>
                  <p className="text-sm text-muted-foreground">
                    For bookings less than 2 hours in advance, please call us to confirm availability.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setActiveTab("package")}>
                Back to Package
              </Button>
              <div>
                <p className="text-sm text-right text-muted-foreground mb-2">
                  Selected: {getSelectedPackage()?.name || "No package selected"}
                </p>
                <Button>
                  Confirm Selection
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
