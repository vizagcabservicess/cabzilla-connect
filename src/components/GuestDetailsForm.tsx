
import { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { EditableContactDetailsForm } from "@/components/EditableContactDetailsForm";
import { ArrowLeft, Edit2, Loader2 } from 'lucide-react';
import { bookingAPI, authAPI } from '@/services/api';
import { BookingRequest } from '@/types/api';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');

  // Check authentication status on component mount
  useState(() => {
    const isAuthenticated = authAPI.isAuthenticated();
    setAuthStatus(isAuthenticated ? 'authenticated' : 'unauthenticated');
    console.log('Authentication status:', isAuthenticated ? 'authenticated' : 'unauthenticated');
  });

  const handleSubmit = async (details: any) => {
    if (isSubmitting || isSaving) return; // Prevent double submission
    
    setIsSaving(true);
    
    try {
      console.log('Starting booking submission with details:', details);
      
      // Check authentication
      const isAuthenticated = authAPI.isAuthenticated();
      console.log('Authentication check result:', isAuthenticated);
      
      if (bookingId && isEditMode) {
        // If editing an existing booking
        console.log("Updating booking with ID:", bookingId);
        
        const updatedData = {
          passengerName: details.name,
          passengerPhone: details.phone,
          passengerEmail: details.email
        };
        
        console.log("Sending contact details update:", updatedData);
        
        // Convert bookingId from string to number
        const bookingIdNumber = parseInt(bookingId, 10);
        if (isNaN(bookingIdNumber)) {
          throw new Error('Invalid booking ID format');
        }
        
        const response = await bookingAPI.updateBooking(bookingIdNumber, updatedData);
        console.log("Update response:", response);
        
        toast({
          title: "Contact Details Updated",
          description: "Your passenger information has been updated successfully",
          duration: 3000,
        });
        
        setIsEditMode(false);
      } else {
        // For new bookings or when parent handles the update
        console.log('Passing details to parent onSubmit handler');
        onSubmit(details);
      }
    } catch (error) {
      console.error("Error in booking operation:", error);
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
      {authStatus === 'unauthenticated' && !bookingId && (
        <Alert className="mb-4 bg-yellow-50 border-yellow-200 text-yellow-800">
          <AlertDescription>
            You are not logged in. Your booking will be created as a guest. 
            <Button 
              variant="link" 
              className="p-0 text-blue-600 h-auto font-medium"
              onClick={() => window.location.href = '/login'}
            >
              Login for a better experience
            </Button>
          </AlertDescription>
        </Alert>
      )}

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
    </div>
  );
}
