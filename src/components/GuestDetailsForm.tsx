
import { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { EditableContactDetailsForm } from "@/components/EditableContactDetailsForm";
import { ArrowLeft, Edit2, Loader2, AlertTriangle } from 'lucide-react';
import { bookingAPI, authAPI } from '@/services/api';
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
  const [error, setError] = useState<string | null>(null);

  // Check authentication status on component mount
  useEffect(() => {
    const isAuthenticated = authAPI.isAuthenticated();
    setAuthStatus(isAuthenticated ? 'authenticated' : 'unauthenticated');
    console.log('Authentication status:', isAuthenticated ? 'authenticated' : 'unauthenticated');
  }, []);

  const handleSubmit = async (details: any) => {
    if (isSubmitting || isSaving) return; // Prevent double submission
    
    setIsSaving(true);
    setError(null);
    
    try {
      console.log('Starting booking submission with details:', details);
      
      // Additional validation
      if (!details.name || !details.phone || !details.email) {
        throw new Error("All contact fields are required");
      }
      
      if (details.phone.length < 10) {
        throw new Error("Please enter a valid phone number (minimum 10 digits)");
      }
      
      if (!details.email.includes('@')) {
        throw new Error("Please enter a valid email address");
      }
      
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
        
        const response = await bookingAPI.updateBooking(bookingIdNumber, {
          passengerName: details.name,
          passengerPhone: details.phone,
          passengerEmail: details.email
        });
        console.log("Update response:", response);
        
        toast({
          title: "Contact Details Updated",
          description: "Your passenger information has been updated successfully",
          duration: 3000,
        });
        
        setIsEditMode(false);
      } else {
        // For new bookings, pass details to parent handler
        console.log('Passing validated details to parent onSubmit handler');
        onSubmit({
          name: details.name.trim(),
          phone: details.phone.trim(),
          email: details.email.trim()
        });
      }
    } catch (error) {
      console.error("Error in booking operation:", error);
      setError(error instanceof Error ? error.message : "Something went wrong during the booking process");
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
      {error && (
        <Alert className="mb-4 bg-red-50 border-red-200 text-red-800">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}
    
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
