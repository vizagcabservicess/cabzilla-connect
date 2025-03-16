
import { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { EditableContactDetailsForm } from "@/components/EditableContactDetailsForm";
import { ArrowLeft, Edit2, Loader2, CheckCircle } from 'lucide-react';
import { bookingAPI } from '@/services/api';
import { BookingRequest } from '@/types/api';

interface GuestDetailsFormProps {
  onSubmit: (details: any) => void;
  totalPrice: number;
  onBack?: () => void;
  initialData?: any;
  bookingId?: string;
  isEditing?: boolean;
  isSubmitting?: boolean;
}

export function GuestDetailsForm({ 
  onSubmit, 
  totalPrice, 
  onBack,
  initialData,
  bookingId,
  isEditing = false,
  isSubmitting = false
}: GuestDetailsFormProps) {
  const formRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [isEditMode, setIsEditMode] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  useEffect(() => {
    // Reset success state when edit mode changes
    if (isEditMode) {
      setUpdateSuccess(false);
    }
  }, [isEditMode]);

  const handleSubmit = async (details: any) => {
    if (isSubmitting || isSaving) return; // Prevent double submission
    
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
        
        // Try to update the booking with retries
        try {
          const result = await bookingAPI.updateBooking(bookingId.toString(), updatedData);
          
          toast({
            title: "Booking Updated",
            description: "Your booking details have been updated successfully",
            duration: 3000,
          });
          
          setUpdateSuccess(true);
          setIsEditMode(false);
        } catch (error) {
          // If we haven't reached max retries yet, try again
          if (retryCount < maxRetries) {
            setRetryCount(retryCount + 1);
            toast({
              title: "Retrying update",
              description: `Attempt ${retryCount + 1} of ${maxRetries}...`,
              duration: 2000,
            });
            
            // Wait a moment before retrying
            setTimeout(() => handleSubmit(details), 2000);
            return;
          } else {
            // Max retries reached, show error
            throw error;
          }
        }
      } else {
        // For new bookings
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
            disabled={isSubmitting || isSaving}
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
            disabled={isSubmitting || isSaving}
          >
            <Edit2 size={16} /> Edit Details
          </Button>
        )}
      </div>
      
      {updateSuccess && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 flex items-center">
          <CheckCircle size={18} className="mr-2" />
          <p>Your changes have been saved successfully.</p>
        </div>
      )}
      
      <EditableContactDetailsForm 
        onSubmit={handleSubmit}
        totalPrice={totalPrice}
        initialData={initialData}
        isReadOnly={bookingId !== undefined && !isEditMode}
        isSaving={isSaving || isSubmitting}
      />
      
      {(isSubmitting || isSaving) && (
        <div className="mt-4 flex items-center justify-center bg-blue-50 p-2 rounded text-blue-700">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          <p>Processing your booking...</p>
        </div>
      )}
      
      {retryCount > 0 && (
        <div className="mt-2 text-xs text-amber-600">
          Update retry attempt {retryCount} of {maxRetries}
        </div>
      )}
    </div>
  );
}
