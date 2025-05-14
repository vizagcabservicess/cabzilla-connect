import React, { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { CalendarIcon, Clock, MapPinIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TripMode, TripType, ensureCustomerTripType } from '@/lib/tripTypes';
import { CabPicker } from '@/components/CabPicker';
import { LocationSearchInput } from '@/components/LocationSearchInput';

// Rest of imports...

// Update trip form schema to accept all TripMode values
const tripFormSchema = z.object({
  tripType: z.enum(['local', 'outstation', 'airport', 'tour']),
  tripMode: z.enum(['one-way', 'round-trip', 'pickup', 'drop', 'continued']),
  pickup: z.object({
    address: z.string().min(5, { message: 'Address is required' }),
    lat: z.number().optional(),
    lng: z.number().optional(),
    placeId: z.string().optional(),
  }),
  drop: z.object({
    address: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    placeId: z.string().optional(),
  }).optional(),
  pickupDate: z.date(),
  pickupTime: z.string(),
  returnDate: z.date().optional(),
  returnTime: z.string().optional(),
  distance: z.number().optional(),
  duration: z.number().optional(),
  cabType: z.string(),
  airport: z.enum(['arrivals', 'departures']).optional(),
  flightNumber: z.string().optional(),
  passengers: z.number().default(1),
  packageType: z.string().optional(),
});

interface TripFormValues extends z.infer<typeof tripFormSchema> {}

const Hero = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCab, setSelectedCab] = useState('');
  const [tripDistance, setTripDistance] = useState<number | null>(null);
  const [tripDuration, setTripDuration] = useState<number | null>(null);
  const [dropLocationRequired, setDropLocationRequired] = useState(false);
  const [showCabPicker, setShowCabPicker] = useState(false);
  const [showDistanceWarning, setShowDistanceWarning] = useState(false);
  const [showDurationWarning, setShowDurationWarning] = useState(false);
  const [showDropLocationWarning, setShowDropLocationWarning] = useState(false);
  const [showAirportOptions, setShowAirportOptions] = useState(false);
  const [showFlightNumber, setShowFlightNumber] = useState(false);
  const [showPackageOptions, setShowPackageOptions] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | undefined>(undefined);
  const [selectedPickupDate, setSelectedPickupDate] = useState<Date | undefined>(undefined);
  const [selectedPickupTime, setSelectedPickupTime] = useState<string | undefined>(undefined);
  const [selectedTripType, setSelectedTripType] = useState<TripType>('local');
  const [selectedTripMode, setSelectedTripMode] = useState<TripMode>('one-way');

  const form = useForm<TripFormValues>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: {
      tripType: 'local',
      tripMode: 'one-way',
      pickup: {
        address: '',
        lat: undefined,
        lng: undefined,
        placeId: undefined,
      },
      drop: {
        address: '',
        lat: undefined,
        lng: undefined,
        placeId: undefined,
      },
      pickupDate: new Date(),
      pickupTime: '09:00',
      returnDate: new Date(),
      returnTime: '18:00',
      distance: 0,
      duration: 0,
      cabType: '',
      airport: 'arrivals',
      flightNumber: '',
      passengers: 1,
      packageType: '8hrs-80km',
    },
  });

  useEffect(() => {
    const tripType = form.watch('tripType');
    setSelectedTripType(tripType);

    const tripMode = form.watch('tripMode');
    setSelectedTripMode(tripMode);

    const distance = form.watch('distance');
    setTripDistance(distance);

    const duration = form.watch('duration');
    setTripDuration(duration);

    const cabType = form.watch('cabType');
    setSelectedCab(cabType);

    const pickupDate = form.watch('pickupDate');
    setSelectedPickupDate(pickupDate);

    const pickupTime = form.watch('pickupTime');
    setSelectedPickupTime(pickupTime);

    const packageType = form.watch('packageType');
    setSelectedPackage(packageType);

    setDropLocationRequired(tripType === 'outstation' || tripType === 'airport');
    setShowAirportOptions(tripType === 'airport');
    setShowFlightNumber(tripType === 'airport');
    setShowPackageOptions(tripType === 'local');
  }, [form]);

  useEffect(() => {
    setShowDistanceWarning(tripDistance !== null && tripDistance <= 0);
    setShowDurationWarning(tripDuration !== null && tripDuration <= 0);
    setShowDropLocationWarning(dropLocationRequired && !form.getValues('drop')?.address);
  }, [tripDistance, tripDuration, dropLocationRequired, form]);

  const onSubmit = (values: TripFormValues) => {
    setIsSubmitting(true);
    console.log('Form submitted:', values);

    // Convert type if needed for outstation trip
    let outstationTripMode: "one-way" | "round-trip" = "one-way";
    if (values.tripType === "outstation") {
      if (values.tripMode === "round-trip" || values.tripMode === "continued") {
        outstationTripMode = "round-trip";
      } else if (values.tripMode === "one-way" || values.tripMode === "pickup" || values.tripMode === "drop") {
        outstationTripMode = "one-way";
      }
    }

    const tripData = {
      tripType: ensureCustomerTripType(values.tripType),
      tripMode: values.tripMode,
      pickupAddress: values.pickup.address,
      pickupLat: values.pickup.lat,
      pickupLng: values.pickup.lng,
      dropAddress: values.drop?.address,
      dropLat: values.drop?.lat,
      dropLng: values.drop?.lng,
      pickupDate: values.pickupDate,
      pickupTime: values.pickupTime,
      returnDate: values.returnDate,
      returnTime: values.returnTime,
      distance: values.distance,
      duration: values.duration,
      cabType: values.cabType,
      airport: values.airport,
      flightNumber: values.flightNumber,
      passengers: values.passengers,
      packageType: values.packageType,
    };

    console.log('Trip Data:', tripData);
    setIsSubmitting(false);
  };

  return (
    <div className="container mx-auto py-10">
      <div className="rounded-lg shadow-xl bg-white dark:bg-gray-800">
        <div className="px-6 py-8">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Book a Cab
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Enter your trip details to find the best cab for your needs.
          </p>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="mt-6 space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tripType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trip Type</FormLabel>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex space-x-2"
                      >
                        <FormItem className="flex items-center space-x-2">
                          <RadioGroupItem value="local" id="local" />
                          <FormLabel htmlFor="local">Local</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <RadioGroupItem value="outstation" id="outstation" />
                          <FormLabel htmlFor="outstation">Outstation</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <RadioGroupItem value="airport" id="airport" />
                          <FormLabel htmlFor="airport">Airport</FormLabel>
                        </FormItem>
                      </RadioGroup>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tripMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trip Mode</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <PopoverTrigger className="bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-md px-4 py-2">
                            {field.value === 'one-way' ? 'One Way' :
                              field.value === 'round-trip' ? 'Round Trip' :
                                field.value === 'pickup' ? 'Pickup' :
                                  field.value === 'drop' ? 'Drop' :
                                    field.value === 'continued' ? 'Continued' :
                                      'Select Trip Mode'}
                          </PopoverTrigger>
                        </FormControl>
                        <PopoverContent className="w-auto">
                          <Tabs defaultValue="customer" className="w-[400px]">
                            <TabsList>
                              <TabsTrigger value="customer">Customer</TabsTrigger>
                            </TabsList>
                            <TabsContent value="customer">
                              <div className="grid gap-4">
                                <FormField
                                  control={form.control}
                                  name="tripMode"
                                  render={({ field }) => (
                                    <FormItem className="space-y-1">
                                      <FormLabel>Trip Mode</FormLabel>
                                      <RadioGroup
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        className="flex flex-col space-y-1"
                                      >
                                        <FormItem className="flex items-center space-x-3">
                                          <RadioGroupItem value="one-way" id="one-way" className='cursor-pointer'/>
                                          <FormLabel htmlFor="one-way">One Way</FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-3">
                                          <RadioGroupItem value="round-trip" id="round-trip" className='cursor-pointer'/>
                                          <FormLabel htmlFor="round-trip">Round Trip</FormLabel>
                                        </FormItem>
                                      </RadioGroup>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </TabsContent>
                          </Tabs>
                        </PopoverContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pickup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pickup Location</FormLabel>
                      <FormControl>
                        <LocationSearchInput
                          placeholder="Enter pickup location"
                          onSelectLocation={(location) => {
                            field.onChange(location);
                            form.setValue('pickup.lat', location.lat);
                            form.setValue('pickup.lng', location.lng);
                            form.setValue('pickup.placeId', location.placeId);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="drop"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Drop Location</FormLabel>
                      <FormControl>
                        <LocationSearchInput
                          placeholder="Enter drop location"
                          onSelectLocation={(location) => {
                            field.onChange(location);
                            form.setValue('drop.lat', location.lat);
                            form.setValue('drop.lng', location.lng);
                            form.setValue('drop.placeId', location.placeId);
                          }}
                          required={dropLocationRequired}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pickupDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Pickup Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={'outline'}
                              className={cn(
                                'w-[240px] pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'PPP')
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date()
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pickupTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pickup Time</FormLabel>
                      <FormControl>
                        <input
                          type="time"
                          className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {showAirportOptions && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="airport"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Airport</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <PopoverTrigger className="bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-md px-4 py-2">
                              {field.value === 'arrivals' ? 'Arrivals' :
                                field.value === 'departures' ? 'Departures' :
                                  'Select Airport'}
                            </PopoverTrigger>
                          </FormControl>
                          <PopoverContent className="w-auto">
                            <Tabs defaultValue="airport" className="w-[400px]">
                              <TabsList>
                                <TabsTrigger value="airport">Airport</TabsTrigger>
                              </TabsList>
                              <TabsContent value="airport">
                                <div className="grid gap-4">
                                  <FormField
                                    control={form.control}
                                    name="airport"
                                    render={({ field }) => (
                                      <FormItem className="space-y-1">
                                        <FormLabel>Airport</FormLabel>
                                        <RadioGroup
                                          onValueChange={field.onChange}
                                          defaultValue={field.value}
                                          className="flex flex-col space-y-1"
                                        >
                                          <FormItem className="flex items-center space-x-3">
                                            <RadioGroupItem value="arrivals" id="arrivals" className='cursor-pointer'/>
                                            <FormLabel htmlFor="arrivals">Arrivals</FormLabel>
                                          </FormItem>
                                          <FormItem className="flex items-center space-x-3">
                                            <RadioGroupItem value="departures" id="departures" className='cursor-pointer'/>
                                            <FormLabel htmlFor="departures">Departures</FormLabel>
                                          </FormItem>
                                        </RadioGroup>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </TabsContent>
                            </Tabs>
                          </PopoverContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {showFlightNumber && (
                    <FormField
                      control={form.control}
                      name="flightNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Flight Number</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter flight number"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              )}

              {showPackageOptions && (
                <FormField
                  control={form.control}
                  name="packageType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Package Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <PopoverTrigger className="bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-md px-4 py-2">
                            {field.value === '4hrs-40km' ? '4 Hours / 40 KM' :
                              field.value === '8hrs-80km' ? '8 Hours / 80 KM' :
                                field.value === '10hrs-100km' ? '10 Hours / 100 KM' :
                                  'Select Package'}
                          </PopoverTrigger>
                        </FormControl>
                        <PopoverContent className="w-auto">
                          <Tabs defaultValue="package" className="w-[400px]">
                            <TabsList>
                              <TabsTrigger value="package">Package</TabsTrigger>
                            </TabsList>
                            <TabsContent value="package">
                              <div className="grid gap-4">
                                <FormField
                                  control={form.control}
                                  name="packageType"
                                  render={({ field }) => (
                                    <FormItem className="space-y-1">
                                      <FormLabel>Package Type</FormLabel>
                                      <RadioGroup
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        className="flex flex-col space-y-1"
                                      >
                                        <FormItem className="flex items-center space-x-3">
                                          <RadioGroupItem value="4hrs-40km" id="4hrs-40km" className='cursor-pointer'/>
                                          <FormLabel htmlFor="4hrs-40km">4 Hours / 40 KM</FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-3">
                                          <RadioGroupItem value="8hrs-80km" id="8hrs-80km" className='cursor-pointer'/>
                                          <FormLabel htmlFor="8hrs-80km">8 Hours / 80 KM</FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-3">
                                          <RadioGroupItem value="10hrs-100km" id="10hrs-100km" className='cursor-pointer'/>
                                          <FormLabel htmlFor="10hrs-100km">10 Hours / 100 KM</FormLabel>
                                        </FormItem>
                                      </RadioGroup>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </TabsContent>
                          </Tabs>
                        </PopoverContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Find Cabs'}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default Hero;
