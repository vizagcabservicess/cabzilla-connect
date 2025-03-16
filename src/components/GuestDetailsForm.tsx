import { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { EditableContactDetailsForm } from "@/components/EditableContactDetailsForm";
import { ArrowLeft, Edit2, Loader2, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { bookingAPI } from '@/services/api';
import { BookingRequest } from '@/types/api';
import { ApiErrorFallback } from '@/components/ApiErrorFallback';

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [processingState, setProcessingState] = useState<'idle' | 'submitting' | 'processing' | 'success' | 'error'>('idle');
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const handleSubmit = async (details: any) => {
    if (isSubmitting || isSaving) return; // Prevent double submission
    
    setIsSaving(true);
    setErrorMessage(null);
    setErrorDetails(null);
    setShowErrorDetails(false);
    setProcessingState('submitting');
    
    try {
      // Increment attempt counter for debugging
      setAttemptCount(prev => prev + 1);
      console.log(`Starting booking submission (attempt ${attemptCount + 1})`, details);
      
      if (bookingId && isEditMode) {
        // If editing an existing booking
        const updatedData = {
          passengerName: details.name,
          passengerPhone: details.phone,
          passengerEmail: details.email,
          ...initialData
        };
        
        await bookingAPI.updateBooking(bookingId.toString(), updatedData);
        
        toast({
          title: "Booking Updated",
          description: "Your booking details have been updated successfully",
          duration: 3000,
        });
        
        setIsEditMode(false);
        setProcessingState('success');
        setBookingSuccess(true);
      } else {
        setProcessingState('processing');
        console.log("Submitting direct booking to API", details);
        
        // Show processing toast
        toast({
          title: "Processing Booking",
          description: "Please wait while we confirm your booking...",
          duration: 5000,
        });
        
        // For new bookings - pass to parent handler which will submit to API
        onSubmit(details);
        
        // We'll assume success at this point since the parent controls the final state
        // The parent component will handle actual API submission
        setProcessingState('success');
      }
    } catch (error) {
      console.error("Booking error:", error);
      setProcessingState('error');
      
      let errorMsg = "Something went wrong with your booking. Please try again.";
      let detailedError = null;
      
      if (error instanceof Error) {
        errorMsg = error.message;
        detailedError = JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
      } else if (typeof error === 'object' && error !== null) {
        try {
          errorMsg = error.toString();
          detailedError = JSON.stringify(error, null, 2);
        } catch (e) {
          // Keep default error message
        }
      }
      
      setErrorMessage(errorMsg);
      setErrorDetails(detailedError);
      
      // Show detailed error in toast for better visibility
      toast({
        title: "Booking Failed",
        description: errorMsg,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleErrorDetails = () => {
    setShowErrorDetails(prev => !prev);
  };

  // If we encounter a server error, offer an alternative
  if (errorMessage && errorMessage.includes('500') && attemptCount > 2) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <ApiErrorFallback 
          error={errorMessage}
          onRetry={() => {
            setErrorMessage(null);
            setProcessingState('idle');
            setAttemptCount(0);
          }}
          title="Booking Error"
        />
        
        <div className="mt-4 text-sm text-gray-600">
          <p>If you continue to experience problems, please try:</p>
          <ul className="list-disc ml-5 mt-2">
            <li>Refreshing the page and trying again</li>
            <li>Using a different browser</li>
            <li>Contacting customer support</li>
            <li>Try our WhatsApp booking option</li>
          </ul>
        </div>
        
        {errorDetails && (
          <div className="mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleErrorDetails}
              className="text-xs"
            >
              {showErrorDetails ? "Hide Error Details" : "Show Error Details"}
            </Button>
            
            {showErrorDetails && (
              <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
                {errorDetails}
              </pre>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={formRef} className="transition-all duration-300 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        {onBack && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onBack}
            className="flex items-center gap-1"
            disabled={isSubmitting || isSaving || processingState === 'processing'}
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
            disabled={isSubmitting || isSaving || processingState === 'processing'}
          >
            <Edit2 size={16} /> Edit Details
          </Button>
        )}
      </div>
      
      {bookingSuccess && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md flex items-start">
          <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Booking Successful!</p>
            <p className="text-sm">Your booking has been processed successfully.</p>
          </div>
        </div>
      )}
      
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-start">
          <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Booking Error</p>
            <p className="text-sm">{errorMessage}</p>
            <p className="text-sm mt-1">Please check your details and try again, or contact support if the problem persists.</p>
            
            {attemptCount > 1 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-1 h-7 text-xs"
                onClick={() => {
                  setErrorMessage(null);
                  setProcessingState('idle');
                  setAttemptCount(0);
                }}
              >
                Try again
              </Button>
            )}
          </div>
        </div>
      )}
      
      {processingState === 'processing' && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-md flex items-start">
          <Clock className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5 animate-pulse" />
          <div>
            <p className="font-medium">Processing Your Booking</p>
            <p className="text-sm">Please wait while we process your booking. This may take a few moments.</p>
            <p className="text-sm mt-1">Do not close this window or navigate away.</p>
          </div>
        </div>
      )}
      
      <EditableContactDetailsForm 
        onSubmit={handleSubmit}
        totalPrice={totalPrice}
        initialData={initialData}
        isReadOnly={bookingId !== undefined && !isEditMode}
        isSaving={isSaving || isSubmitting || processingState === 'processing'}
      />
      
      {(isSubmitting || isSaving || processingState === 'processing') && (
        <div className="mt-4 flex items-center justify-center bg-blue-50 p-2 rounded text-blue-700">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          <p>Processing your booking...</p>
        </div>
      )}
    </div>
  );
}
