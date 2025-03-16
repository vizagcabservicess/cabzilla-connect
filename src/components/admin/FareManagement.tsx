
import { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { fareAPI } from '@/services/api';
import { TourFare, FareUpdateRequest } from '@/types/api';
import { availableTours } from '@/lib/cabData';

const formSchema = z.object({
  tourId: z.string(),
  sedan: z.coerce.number().positive(),
  ertiga: z.coerce.number().positive(),
  innova: z.coerce.number().positive(),
  tempo: z.coerce.number().positive(),
  luxury: z.coerce.number().positive(),
});

export function FareManagement() {
  const { toast } = useToast();
  const [tourFares, setTourFares] = useState<TourFare[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTour, setSelectedTour] = useState<TourFare | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FareUpdateRequest>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tourId: "",
      sedan: 0,
      ertiga: 0,
      innova: 0,
      tempo: 0,
      luxury: 0,
    },
  });

  useEffect(() => {
    const fetchTourFares = async () => {
      try {
        // Add cache-busting timestamp (without passing to API)
        console.log("Fetching tour fares with cache busting...");
        const data = await fareAPI.getTourFares();
        console.log("Fetched tour fares:", data);
        setTourFares(data);
        if (data.length > 0) {
          form.reset({
            tourId: data[0].tourId,
            sedan: data[0].sedan,
            ertiga: data[0].ertiga,
            innova: data[0].innova,
            tempo: data[0].tempo,
            luxury: data[0].luxury,
          });
          setSelectedTour(data[0]);
        }
      } catch (error) {
        console.error("Error fetching tour fares:", error);
        toast({
          title: "Error",
          description: "Failed to load tour fares",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTourFares();
  }, [toast, form]);

  const onSubmit = async (values: FareUpdateRequest) => {
    setIsSubmitting(true);
    try {
      console.log("Updating tour fares:", values);
      await fareAPI.updateTourFares(values);
      
      // Update local state
      setTourFares(prev => prev.map(tour => 
        tour.tourId === values.tourId ? { ...tour, ...values } : tour
      ));
      
      toast({
        title: "Success",
        description: "Tour fares updated successfully",
      });
    } catch (error) {
      console.error("Error updating tour fares:", error);
      toast({
        title: "Error",
        description: "Failed to update tour fares",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTourChange = (tourId: string) => {
    const tour = tourFares.find(t => t.tourId === tourId);
    if (tour) {
      form.reset({
        tourId: tour.tourId,
        sedan: tour.sedan,
        ertiga: tour.ertiga,
        innova: tour.innova,
        tempo: tour.tempo,
        luxury: tour.luxury,
      });
      setSelectedTour(tour);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-10">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tour Fare Management</CardTitle>
        <CardDescription>Update pricing for different tour packages</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="tourId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Tour</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleTourChange(value);
                    }} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a tour" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableTours.map((tour) => (
                        <SelectItem key={tour.id} value={tour.id}>
                          {tour.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="sedan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sedan Price (₹)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Enter price" 
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="ertiga"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ertiga Price (₹)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Enter price" 
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="innova"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Innova Crysta Price (₹)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Enter price" 
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="tempo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tempo Traveller (12) Price (₹)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Enter price" 
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="luxury"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tempo Traveller (17) Price (₹)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Enter price" 
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Updating..." : "Update Fares"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
