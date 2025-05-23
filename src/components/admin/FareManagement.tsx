import { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertCircle, 
  RefreshCw, 
  Save, 
  PlusCircle, 
  Trash2, 
  Edit, 
  Globe,
  Map,
  Car,
  Bookmark
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TourFare, FareUpdateRequest } from '@/types/api';
import { fareAPI } from '@/services/api';
import { reloadCabTypes } from '@/lib/cabData';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LocalFareManagement } from "@/components/admin/LocalFareManagement";
import OutstationFareManagement from "@/components/admin/OutstationFareManagement";
import AirportFareManagement from "@/components/admin/AirportFareManagement";

const formSchema = z.object({
  tourId: z.string().min(1, { message: "Tour is required" }),
  sedan: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  ertiga: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  innova: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  tempo: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  luxury: z.coerce.number().min(0, { message: "Price cannot be negative" }),
});

const newTourFormSchema = z.object({
  tourId: z.string().min(1, { message: "Tour ID is required" }),
  tourName: z.string().min(1, { message: "Tour name is required" }),
  sedan: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  ertiga: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  innova: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  tempo: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  luxury: z.coerce.number().min(0, { message: "Price cannot be negative" }),
});

export default function FareManagement() {
  return (
    <Tabs defaultValue="local" className="w-full">
      <TabsList>
        <TabsTrigger value="local">Local Fares</TabsTrigger>
        <TabsTrigger value="outstation">Outstation Fares</TabsTrigger>
        <TabsTrigger value="airport">Airport Fares</TabsTrigger>
      </TabsList>
      <TabsContent value="local">
        <LocalFareManagement />
      </TabsContent>
      <TabsContent value="outstation">
        <OutstationFareManagement />
      </TabsContent>
      <TabsContent value="airport">
        <AirportFareManagement />
      </TabsContent>
    </Tabs>
  );
}
