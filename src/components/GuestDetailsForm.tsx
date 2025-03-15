
import { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { EditableContactDetailsForm } from "@/components/EditableContactDetailsForm";
import { ArrowLeft, Edit2 } from 'lucide-react';
import { bookingAPI } from '@/services/api';
import { BookingRequest } from '@/types/api';

interface GuestDetailsFormProps {
  onSubmit: (details: any) => void;
  totalPrice: number;
  onBack?: () => void;
  initialData?: any;
  bookingId?: number;
  isEditing?: boolean;
}

export function GuestDetailsForm({ 
  onSubmit, 
  totalPrice, 
  onBack,
  initialData,
  bookingId,
  isEditing = false
}: GuestDetailsFormProps) {
  const formRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [isEditMode, setIsEditMode] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (details: any) => {
    setIsSaving(true);
    
    try {
      if (bookingId && isEditMode) {
        // If editing an existing booking
        const updatedData = {
          passengerName: details.name,
          passengerPhone: details.phone,
          passengerEmail: details.email,
          ...initialData
        };
        
        await bookingAPI.updateBooking(bookingId, updatedData);
        
        toast({
          title: "Booking Updated",
          description: "Your booking details have been updated successfully",
          duration: 3000,
        });
        
        setIsEditMode(false);
      } else {
        // For new bookings, we need to submit to the API before calling onSubmit
        // This ensures the booking is saved to the database
        
        // Call the parent onSubmit to get data flowing to the next step
        onSubmit(details);
      }
    } catch (error) {
      toast({
        title: "Operation Failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div ref={formRef} className="transition-all duration-300 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        {onBack && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onBack}
            className="flex items-center gap-1"
          >
            <ArrowLeft size={16} /> Back
          </Button>
        )}
        
        {bookingId && !isEditMode && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditMode(true)}
            className="flex items-center gap-1 ml-auto"
          >
            <Edit2 size={16} /> Edit Details
          </Button>
        )}
      </div>
      
      <EditableContactDetailsForm 
        onSubmit={handleSubmit}
        totalPrice={totalPrice}
        initialData={initialData}
        isReadOnly={bookingId !== undefined && !isEditMode}
        isSaving={isSaving}
      />
    </div>
  );
}
